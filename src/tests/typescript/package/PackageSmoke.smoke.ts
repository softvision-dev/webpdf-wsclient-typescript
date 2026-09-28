import {execFileSync, execSync, spawnSync, SpawnSyncReturns} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {expect} from "chai";
import {after, before, it, suite} from "mocha";

/*
 * Package smoke test: packs the library exactly like the release path (`npm pack`), installs the
 * tarball into a consumer outside the repository with a strict, non-hoisted `node_modules` layout,
 * and then loads it the way consumers do - ESM `import`, CommonJS `require`, both in one process -
 * on every configured Node.js binary, plus a TypeScript type-resolution matrix.
 *
 * Run it with `yarn run test:package` after `yarn build`; it has its own Mocha configuration
 * (`.mocharc.package.json`) and deliberately does not load the integration-test bootstrap.
 *
 * The file must stay module-system neutral (it runs as CommonJS and as ESM), so it uses neither
 * the CommonJS directory global nor `import.meta`: the repository root is the working directory.
 *
 * Environment variables:
 * - `WSCLIENT_SMOKE_NODE_BINARIES`: additional Node.js executables, separated by `path.delimiter`
 *   (`;` on Windows, `:` elsewhere). `process.execPath` is always covered. A listed binary that does
 *   not exist fails the run instead of being skipped. Machine-local, never configured in the repo.
 * - `WSCLIENT_SMOKE_PACKAGE_TARBALL`: test hook only. Absolute path of an already packed `.tgz` that
 *   is installed instead of running `npm pack` - used to prove that the assertions pass against a
 *   correctly built package. Without it the test always packs the current repository state.
 */

const PACKAGE_NAME: string = "@softvision/webpdf-wsclient-typescript";
const NODE_BINARIES_VARIABLE: string = "WSCLIENT_SMOKE_NODE_BINARIES";
const PACKAGE_TARBALL_VARIABLE: string = "WSCLIENT_SMOKE_PACKAGE_TARBALL";
const LOG_PREFIX: string = "      [package-smoke]";

/** A block of stderr lines a consumer process is allowed to print. */
interface AllowedStderrBlock {
	/** `process.version` prefix of the Node.js binaries the block applies to. */
	versionPrefix: string;
	/** Where the wording comes from. */
	source: string;
	/** One pattern per line, in order. */
	lines: RegExp[];
}

/**
 * The only stderr output a consumer process may produce, and only in cases that load the
 * package through CommonJS require. Measured on Node 22.12.0: loading an ES module through
 * CommonJS require prints this three-line ExperimentalWarning block exactly once per process
 * (also when several ES modules are required);
 * `import` prints nothing there, and Node 20.19.0, 22.13.0 and 24.x print nothing at all.
 */
const ALLOWED_REQUIRE_STDERR_BLOCKS: AllowedStderrBlock[] = [
	{
		versionPrefix: "v22.12.",
		source: "measured on Node 22.12.0",
		lines: [
			/^\(node:\d+\) ExperimentalWarning: CommonJS module .+ is loading ES Module .+ using require\(\)\.$/,
			/^Support for loading ES Module in require\(\) is an experimental feature and might change at any time$/,
			/^\(Use `node --trace-warnings \.\.\.` to show where the warning was created\)$/,
		],
	},
];

/** Paths of the prepared consumer, shared by all cases. */
interface SmokeContext {
	repositoryRoot: string;
	temporaryRoot: string;
	consumerDir: string;
	packageDir: string;
}

/** Outcome of one consumer child process. */
interface ChildRun {
	status: number | null;
	stdout: string;
	stderr: string;
}

/** Result of the form-data resolution probe from one location. */
interface ResolutionProbe {
	resolved?: string;
	code?: string;
	message?: string;
}

/** Output of the layout probe child script. */
interface LayoutReport {
	version: string;
	packageEntry: string;
	formDataFromPackage: ResolutionProbe;
	formDataFromConsumer: ResolutionProbe;
}

/** A consumer script, the module system it loads the package with, and its source. */
interface ConsumerScript {
	file: string;
	usesRequire: boolean;
	source: string[];
}

/** Returns the repository root (the working directory), verified by the package name. */
function resolveRepositoryRoot(): string {
	const root: string = process.cwd();
	const manifestPath: string = path.join(root, "package.json");
	const name: unknown = fs.existsSync(manifestPath)
		? (JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {name?: unknown}).name
		: undefined;
	if (name !== PACKAGE_NAME) {
		throw new Error(`The package smoke test must run from the repository root of ${PACKAGE_NAME}; working directory is ${root}.`);
	}
	return root;
}

/**
 * Returns `process.execPath` plus the binaries listed in `WSCLIENT_SMOKE_NODE_BINARIES`.
 *
 * Every configured entry is resolved against `process.cwd()` (`path.resolve`), because the child
 * processes below are spawned with `cwd: consumerDir` — a relative entry would pass the existence
 * check here (checked against the repository root) and then fail with `ENOENT` when spawned from a
 * different working directory.
 */
function resolveNodeBinaries(): string[] {
	const configured: string[] = (process.env[NODE_BINARIES_VARIABLE] ?? "")
		.split(path.delimiter)
		.map((entry: string): string => entry.trim())
		.filter((entry: string): boolean => entry.length > 0)
		.map((entry: string): string => path.resolve(entry));
	return [process.execPath, ...configured];
}

/**
 * Environment for every child process: a copy of the current one without `NODE_OPTIONS` and
 * `NODE_PATH`, so an IDE debugger hook or a global module path cannot change how a consumer resolves
 * the package. Everything else (`PATH`, `SystemRoot`, ...) is kept.
 */
function createChildEnvironment(): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = {...process.env};
	delete env.NODE_OPTIONS;
	delete env.NODE_PATH;
	return env;
}

/** Copies a package directory recursively, leaving out any nested `node_modules`. */
function copyPackageDirectory(sourceDir: string, targetDir: string): void {
	fs.mkdirSync(targetDir, {recursive: true});
	for (const entry of fs.readdirSync(sourceDir, {withFileTypes: true})) {
		if (entry.name === "node_modules") {
			continue;
		}
		const sourcePath: string = path.join(sourceDir, entry.name);
		const targetPath: string = path.join(targetDir, entry.name);
		if (entry.isDirectory()) {
			copyPackageDirectory(sourcePath, targetPath);
		} else {
			fs.copyFileSync(sourcePath, targetPath);
		}
	}
}

/** Reads the names of the runtime `dependencies` declared in a package directory. */
function readDeclaredDependencies(packageDir: string): string[] {
	const manifest: {dependencies?: Record<string, string>} =
		JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf8")) as {dependencies?: Record<string, string>};
	return Object.keys(manifest.dependencies ?? {});
}

/**
 * Installs `name` from the repository `node_modules` below `targetModulesDir` and nests each of its
 * declared runtime dependencies below itself, recursively. Nothing is hoisted, so every package sees
 * only what it declares (a pnpm-like strict layout). `ancestors` stops dependency cycles. No network.
 */
function installStrict(repositoryModulesDir: string, name: string, targetModulesDir: string, ancestors: string[]): void {
	const sourceDir: string = path.join(repositoryModulesDir, name);
	if (!fs.existsSync(path.join(sourceDir, "package.json"))) {
		throw new Error(`Cannot build the strict consumer layout: ${name} is missing in ${repositoryModulesDir} (run yarn install).`);
	}
	const targetDir: string = path.join(targetModulesDir, name);
	copyPackageDirectory(sourceDir, targetDir);
	for (const dependency of readDeclaredDependencies(sourceDir)) {
		if (ancestors.includes(dependency)) {
			continue;
		}
		installStrict(repositoryModulesDir, dependency, path.join(targetDir, "node_modules"), ancestors.concat(name));
	}
}

/** Packs the repository with `npm pack`, the same packer the release path uses, and returns the tarball path. */
function packRepository(repositoryRoot: string): string {
	if (!fs.existsSync(path.join(repositoryRoot, "lib", "index.js"))) {
		throw new Error("lib/index.js is missing - run `yarn build` first; the package smoke test checks the built package.");
	}
	fs.mkdirSync(path.join(repositoryRoot, "build", "package-smoke"), {recursive: true});
	// Fixed command text without variable parts, like scripts/deploy.js: on Windows npm is a shell
	// shim that execFileSync cannot start (ENOENT for "npm", EINVAL for "npm.cmd"). stderr of npm
	// only carries notices and is not evaluated.
	const output: string = execSync("npm pack --pack-destination build/package-smoke --json", {
		cwd: repositoryRoot,
		env: {...createChildEnvironment(), npm_config_update_notifier: "false"},
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});
	const packed: Array<{filename?: string}> = JSON.parse(output.slice(output.indexOf("["))) as Array<{filename?: string}>;
	const fileName: string | undefined = packed[0]?.filename;
	if (fileName === undefined) {
		throw new Error(`npm pack reported no file name: ${output}`);
	}
	return path.join(repositoryRoot, "build", "package-smoke", fileName);
}

/**
 * Packs (or takes the tarball from the test hook), extracts it and builds the strict consumer
 * outside the repository. Outside, because inside the repository the package name would resolve
 * through the repository's own `exports` (self-reference) and Node would find the repository
 * `node_modules` further up, which defeats the strict layout.
 */
function prepareConsumer(context: SmokeContext): void {
	const hookTarball: string | undefined = process.env[PACKAGE_TARBALL_VARIABLE];
	const tarball: string = hookTarball !== undefined && hookTarball.length > 0
		? path.resolve(hookTarball)
		: packRepository(context.repositoryRoot);
	console.log(`${LOG_PREFIX} tarball: ${path.basename(tarball)}${hookTarball ? ` (test hook ${PACKAGE_TARBALL_VARIABLE})` : " (npm pack)"}`);

	const unpackDir: string = path.join(context.temporaryRoot, "unpack");
	fs.mkdirSync(unpackDir, {recursive: true});
	fs.copyFileSync(tarball, path.join(unpackDir, path.basename(tarball)));
	// Relative file name plus cwd: GNU tar (Git Bash) reads "C:\..." as a remote host.
	execFileSync("tar", ["-xzf", path.basename(tarball)], {cwd: unpackDir, stdio: "pipe"});

	fs.mkdirSync(context.consumerDir, {recursive: true});
	fs.writeFileSync(path.join(context.consumerDir, "package.json"),
		`${JSON.stringify({name: "wsclient-package-smoke-consumer", private: true}, null, 2)}\n`, "utf8");
	copyPackageDirectory(path.join(unpackDir, "package"), context.packageDir);
	const repositoryModulesDir: string = path.join(context.repositoryRoot, "node_modules");
	const declared: string[] = readDeclaredDependencies(context.packageDir);
	for (const dependency of declared) {
		installStrict(repositoryModulesDir, dependency, path.join(context.packageDir, "node_modules"), []);
	}
	// Types for the TypeScript consumers; the same routine nests the declared dependency undici-types.
	installStrict(repositoryModulesDir, "@types/node", path.join(context.consumerDir, "node_modules"), []);
	console.log(`${LOG_PREFIX} declared runtime dependencies: ${declared.join(", ")}`);
}

/** The consumer scripts of the runtime matrix; each prints one JSON line on stdout. */
function createConsumerScripts(context: SmokeContext): ConsumerScript[] {
	const pkg: string = JSON.stringify(PACKAGE_NAME);
	const consumerManifest: string = JSON.stringify(path.join(context.consumerDir, "package.json"));
	const packageEntryFile: string = JSON.stringify(path.join(context.packageDir, "lib", "index.js"));
	return [
		{
			file: "esm-named.mjs",
			usesRequire: false,
			source: [
				`import {models, SessionFactory, wsclientConfiguration} from ${pkg};`,
				"console.log(JSON.stringify({version: process.version, models: typeof models, sessionFactory: typeof SessionFactory, formData: typeof wsclientConfiguration.FormData}));",
			],
		},
		{
			file: "esm-namespace.mjs",
			usesRequire: false,
			source: [
				`import * as ws from ${pkg};`,
				"console.log(JSON.stringify({version: process.version, exportCount: Object.keys(ws).length, models: typeof ws.models, sessionFactory: typeof ws.SessionFactory}));",
			],
		},
		{
			file: "cjs.cjs",
			usesRequire: true,
			source: [
				`const ws = require(${pkg});`,
				"console.log(JSON.stringify({version: process.version, models: typeof ws.models, sessionFactory: typeof ws.SessionFactory, formData: typeof ws.wsclientConfiguration.FormData}));",
			],
		},
		{
			file: "identity.mjs",
			usesRequire: true,
			source: [
				`import * as esm from ${pkg};`,
				"import {createRequire} from \"node:module\";",
				`const cjs = createRequire(import.meta.url)(${pkg});`,
				"const hydrated = cjs.models.ServerCheck.fromJson({checkType: \"user\"});",
				"console.log(JSON.stringify({version: process.version, sameModels: esm.models === cjs.models, sameSessionFactory: esm.SessionFactory === cjs.SessionFactory, crossInstance: hydrated instanceof esm.models.UserServerCheck}));",
			],
		},
		{
			file: "hydration-esm.mjs",
			usesRequire: false,
			source: [
				`import {models} from ${pkg};`,
				"const hydrated = models.ServerCheck.fromJson({checkType: \"user\"});",
				"console.log(JSON.stringify({version: process.version, constructorName: hydrated.constructor.name, isServerCheck: hydrated instanceof models.ServerCheck}));",
			],
		},
		{
			file: "hydration-cjs.cjs",
			usesRequire: true,
			source: [
				`const {models} = require(${pkg});`,
				"const hydrated = models.ServerCheck.fromJson({checkType: \"user\"});",
				"console.log(JSON.stringify({version: process.version, constructorName: hydrated.constructor.name, isServerCheck: hydrated instanceof models.ServerCheck}));",
			],
		},
		{
			file: "layout.mjs",
			usesRequire: false,
			source: [
				"import {createRequire} from \"node:module\";",
				"const probe = (fromFile) => {",
				"\ttry {",
				"\t\treturn {resolved: createRequire(fromFile).resolve(\"form-data\")};",
				"\t} catch (error) {",
				"\t\treturn {code: error.code, message: String(error.message).split(\"\\n\")[0]};",
				"\t}",
				"};",
				`const packageEntry = createRequire(${consumerManifest}).resolve(${pkg});`,
				`console.log(JSON.stringify({version: process.version, packageEntry, formDataFromPackage: probe(${packageEntryFile}), formDataFromConsumer: probe(${consumerManifest})}));`,
			],
		},
	];
}

/** Writes the TypeScript consumer sources and one tsconfig per resolution mode. */
function writeTypeScriptConsumers(context: SmokeContext): void {
	// Proof that the package types are not `any`: if they collapsed to `any`, the assignment below
	// would compile, and the expect-error directive in front of it would fail with TS2578.
	const body: string[] = [
		`import {models} from ${JSON.stringify(PACKAGE_NAME)};`,
		"// @ts-expect-error a hydrated model is not a number; this only holds while the package types are not `any`.",
		"const notANumber: number = models.ServerCheck.fromJson({checkType: \"user\"});",
		"export {notANumber};",
		"",
	];
	const baseOptions: Record<string, unknown> = {
		noEmit: true,
		strict: true,
		skipLibCheck: false,
		target: "ES2022",
		lib: ["ES2022", "DOM"],
		types: ["node"],
	};
	const variants: Array<{name: string; file: string; module: string; moduleResolution: string}> = [
		{name: "nodenext-esm", file: "types-nodenext-esm.mts", module: "nodenext", moduleResolution: "nodenext"},
		{name: "nodenext-cjs", file: "types-nodenext-cjs.cts", module: "nodenext", moduleResolution: "nodenext"},
		{name: "bundler", file: "types-bundler.ts", module: "esnext", moduleResolution: "bundler"},
		{name: "node16-cjs", file: "types-node16-cjs.cts", module: "node16", moduleResolution: "node16"},
	];
	for (const variant of variants) {
		fs.writeFileSync(path.join(context.consumerDir, variant.file), body.join("\n"), "utf8");
		const tsconfig: object = {
			compilerOptions: {...baseOptions, module: variant.module, moduleResolution: variant.moduleResolution},
			files: [variant.file],
		};
		fs.writeFileSync(path.join(context.consumerDir, `tsconfig.${variant.name}.json`), `${JSON.stringify(tsconfig, null, 2)}\n`, "utf8");
	}
}

/** Runs `tsc -p tsconfig.<variant>.json` from the repository's TypeScript inside the consumer. */
function runTypeScript(context: SmokeContext, variant: string): SpawnSyncReturns<string> {
	const tscPath: string = path.join(context.repositoryRoot, "node_modules", "typescript", "bin", "tsc");
	return spawnSync(process.execPath, [tscPath, "-p", `tsconfig.${variant}.json`], {
		cwd: context.consumerDir,
		env: createChildEnvironment(),
		encoding: "utf8",
	});
}

/** Starts one consumer script with the given Node.js binary; arguments as a list, no shell. */
function runConsumer(context: SmokeContext, nodeBinary: string, script: ConsumerScript): ChildRun {
	const result: SpawnSyncReturns<string> = spawnSync(nodeBinary, [script.file], {
		cwd: context.consumerDir,
		env: createChildEnvironment(),
		encoding: "utf8",
	});
	if (result.error !== undefined) {
		throw result.error;
	}
	return {status: result.status, stdout: result.stdout, stderr: result.stderr};
}

/** Parses the single JSON line of a successful consumer run, failing with the child's stderr otherwise. */
function parseConsumerOutput<T>(script: ConsumerScript, run: ChildRun): T {
	expect(run.status, `${script.file} exited with ${String(run.status)}; stderr:\n${run.stderr}`).to.equal(0);
	const lines: string[] = run.stdout.split(/\r?\n/).filter((line: string): boolean => line.length > 0);
	expect(lines, `${script.file} printed no result; stderr:\n${run.stderr}`).to.have.lengthOf(1);
	return JSON.parse(lines[0] as string) as T;
}

/**
 * Asserts that stderr is empty, except for the documented warning block of a CommonJS-require case on a
 * matching Node.js version. Logs when the exception was actually used, so a run shows it took effect.
 */
function assertConsumerStderr(version: string, script: ConsumerScript, stderr: string): void {
	const lines: string[] = stderr.split(/\r?\n/).filter((line: string): boolean => line.length > 0);
	if (lines.length === 0) {
		return;
	}
	const block: AllowedStderrBlock | undefined = script.usesRequire
		? ALLOWED_REQUIRE_STDERR_BLOCKS.find((candidate: AllowedStderrBlock): boolean => version.startsWith(candidate.versionPrefix))
		: undefined;
	const allowed: boolean = block !== undefined
		&& lines.length === block.lines.length
		&& block.lines.every((pattern: RegExp, index: number): boolean => pattern.test(lines[index] as string));
	expect(allowed, `unexpected stderr from ${script.file} on Node ${version}:\n${stderr}`).to.equal(true);
	console.log(`${LOG_PREFIX} ${version} ${script.file}: filtered the documented require-of-ESM warning block (${block?.source ?? ""})`);
}

/** Asserts that `candidate` lies inside `directory`. */
function expectInside(candidate: string, directory: string, message: string): void {
	const relative: string = path.relative(directory, candidate);
	expect(relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative), `${message}: ${candidate} is not below ${directory}`)
		.to.equal(true);
}

suite("Package smoke test (packed tarball, strict consumer layout)", function (): void {
	const context: SmokeContext = {repositoryRoot: "", temporaryRoot: "", consumerDir: "", packageDir: ""};
	let scripts: ConsumerScript[] = [];

	before(function (): void {
		context.repositoryRoot = resolveRepositoryRoot();
		// Long-path form, so paths reported by the child processes compare against the same spelling.
		context.temporaryRoot = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "wsclient-package-smoke-")));
		context.consumerDir = path.join(context.temporaryRoot, "consumer");
		context.packageDir = path.join(context.consumerDir, "node_modules", "@softvision", "webpdf-wsclient-typescript");
		prepareConsumer(context);
		scripts = createConsumerScripts(context);
		for (const script of scripts) {
			fs.writeFileSync(path.join(context.consumerDir, script.file), `${script.source.join("\n")}\n`, "utf8");
		}
		writeTypeScriptConsumers(context);
	});

	after(function (): void {
		if (context.temporaryRoot.length > 0) {
			fs.rmSync(context.temporaryRoot, {recursive: true, force: true});
		}
	});

	suite("TypeScript consumers (skipLibCheck: false)", function (): void {
		for (const variant of ["nodenext-esm", "nodenext-cjs", "bundler"]) {
			it(`resolves typed declarations with moduleResolution ${variant}`, function (): void {
				const result: SpawnSyncReturns<string> = runTypeScript(context, variant);
				expect(result.status, `tsc (${variant}) reported:\n${result.stdout}${result.stderr}`).to.equal(0);
			});
		}

		it("rejects require of the package from a node16 CommonJS file (TS1479)", function (): void {
			const result: SpawnSyncReturns<string> = runTypeScript(context, "node16-cjs");
			expect(result.stdout, `tsc (node16-cjs) reported:\n${result.stdout}${result.stderr}`).to.contain("TS1479");
		});
	});

	for (const nodeBinary of resolveNodeBinaries()) {
		suite(`Node.js ${nodeBinary}`, function (): void {
			let version: string = "";
			const runs: Map<string, ChildRun> = new Map<string, ChildRun>();
			const scriptNamed: (file: string) => ConsumerScript = (file: string): ConsumerScript => {
				const script: ConsumerScript | undefined = scripts.find((candidate: ConsumerScript): boolean => candidate.file === file);
				if (script === undefined) {
					throw new Error(`unknown consumer script ${file}`);
				}
				return script;
			};
			const run: (file: string) => {script: ConsumerScript; result: ChildRun} = (file: string): {script: ConsumerScript; result: ChildRun} => {
				const script: ConsumerScript = scriptNamed(file);
				let result: ChildRun | undefined = runs.get(file);
				if (result === undefined) {
					result = runConsumer(context, nodeBinary, script);
					runs.set(file, result);
				}
				return {script, result};
			};

			before(function (): void {
				expect(fs.existsSync(nodeBinary), `configured Node.js binary does not exist: ${nodeBinary}`).to.equal(true);
				const probe: SpawnSyncReturns<string> = spawnSync(nodeBinary, ["-p", "process.version"], {env: createChildEnvironment(), encoding: "utf8"});
				version = probe.stdout.trim();
				expect(version, `cannot read the version of ${nodeBinary}: ${probe.stderr}`).to.match(/^v\d+\./);
				console.log(`${LOG_PREFIX} covering Node.js ${version} (${nodeBinary})`);
			});

			it("imports named exports through ESM import", function (): void {
				const {script, result}: {script: ConsumerScript; result: ChildRun} = run("esm-named.mjs");
				const output: Record<string, unknown> = parseConsumerOutput<Record<string, unknown>>(script, result);
				expect(output).to.include({version, models: "object", sessionFactory: "function", formData: "function"});
				assertConsumerStderr(version, script, result.stderr);
			});

			it("imports the namespace through ESM import", function (): void {
				const {script, result}: {script: ConsumerScript; result: ChildRun} = run("esm-namespace.mjs");
				const output: {version: string; exportCount: number; models: string; sessionFactory: string} =
					parseConsumerOutput<{version: string; exportCount: number; models: string; sessionFactory: string}>(script, result);
				expect(output).to.include({version, models: "object", sessionFactory: "function"});
				expect(output.exportCount).to.be.greaterThan(1);
				assertConsumerStderr(version, script, result.stderr);
			});

			it("loads the package through CommonJS require", function (): void {
				const {script, result}: {script: ConsumerScript; result: ChildRun} = run("cjs.cjs");
				const output: Record<string, unknown> = parseConsumerOutput<Record<string, unknown>>(script, result);
				expect(output).to.include({version, models: "object", sessionFactory: "function", formData: "function"});
				assertConsumerStderr(version, script, result.stderr);
			});

			it("returns the same module instance to import and require in one process", function (): void {
				const {script, result}: {script: ConsumerScript; result: ChildRun} = run("identity.mjs");
				const output: Record<string, unknown> = parseConsumerOutput<Record<string, unknown>>(script, result);
				expect(output).to.include({version, sameModels: true, sameSessionFactory: true, crossInstance: true});
				assertConsumerStderr(version, script, result.stderr);
			});

			for (const file of ["hydration-esm.mjs", "hydration-cjs.cjs"]) {
				it(`hydrates polymorphic models (${file})`, function (): void {
					const {script, result}: {script: ConsumerScript; result: ChildRun} = run(file);
					const output: Record<string, unknown> = parseConsumerOutput<Record<string, unknown>>(script, result);
					expect(output).to.include({version, constructorName: "UserServerCheck", isServerCheck: true});
					assertConsumerStderr(version, script, result.stderr);
				});
			}

			it("resolves the package from the consumer's node_modules, not by self-reference", function (): void {
				const {script, result}: {script: ConsumerScript; result: ChildRun} = run("layout.mjs");
				const output: LayoutReport = parseConsumerOutput<LayoutReport>(script, result);
				expectInside(output.packageEntry, context.packageDir, "package entry");
				assertConsumerStderr(version, script, result.stderr);
			});

			it("resolves form-data from the package's own declared dependencies", function (): void {
				const {script, result}: {script: ConsumerScript; result: ChildRun} = run("layout.mjs");
				const output: LayoutReport = parseConsumerOutput<LayoutReport>(script, result);
				expect(output.formDataFromPackage.resolved, `form-data from the package: ${JSON.stringify(output.formDataFromPackage)}`)
					.to.be.a("string");
				expectInside(output.formDataFromPackage.resolved as string, path.join(context.packageDir, "node_modules", "form-data"), "form-data");
			});

			it("does not hoist form-data into the consumer (counter-check)", function (): void {
				const {script, result}: {script: ConsumerScript; result: ChildRun} = run("layout.mjs");
				const output: LayoutReport = parseConsumerOutput<LayoutReport>(script, result);
				expect(output.formDataFromConsumer.code, `form-data from the consumer: ${JSON.stringify(output.formDataFromConsumer)}`)
					.to.equal("MODULE_NOT_FOUND");
			});
		});
	}
});
