import fs from "node:fs";
import path from "node:path";

/**
 * Final normalization pass of the code generator: makes every relative module specifier in the
 * generated sources fully specified, so the compiled package can be loaded by the native Node.js
 * ESM resolver, which neither guesses file extensions nor resolves directory imports.
 *
 * The pass is the last step of `adaptOpenApiRawOutput`, so it runs once over the finished output
 * regardless of which of the roughly nine generation sites (see `openapiRawAdapter.ts`) produced a
 * given specifier, and regardless of the unmodified specifiers the upstream OpenAPI Generator CLI
 * writes directly.
 */

/** Matches a `from "…"` clause of an `import`/`export` statement and captures the quote and specifier. */
const FROM_SPECIFIER_RE: RegExp = /\bfrom(\s*)(["'])([^"'\r\n]*)\2/g;

/** Matches a bare side-effect import statement, e.g. `import "./foo";`. */
const SIDE_EFFECT_SPECIFIER_RE: RegExp = /\bimport(\s+)(["'])([^"'\r\n]*)\2/g;

/** Matches a type-level dynamic import, e.g. `import("./foo")`. */
const TYPE_IMPORT_SPECIFIER_RE: RegExp = /\bimport(\s*)\(\s*(["'])([^"'\r\n]*)\2\s*\)/g;

/** Whether a module specifier is relative (`./…` or `../…`) rather than a package or `node:` specifier. */
function isRelativeSpecifier(specifier: string): boolean {
	return specifier.startsWith("./") || specifier.startsWith("../");
}

/** Whether the specifier's last path segment already carries a file extension (e.g. `.js`, `.json`). */
function hasFileExtension(specifier: string): boolean {
	const lastSegment: string = specifier.slice(specifier.lastIndexOf("/") + 1);
	return lastSegment.includes(".");
}

/**
 * Resolves a single relative specifier against the directory of the importing file and decides
 * whether it needs `.js` appended.
 *
 * Non-relative specifiers and specifiers that already carry a file extension are left unchanged.
 * A specifier that resolves to an existing directory (an `index.ts` under it, but no sibling
 * `<spec>.ts`) is rejected: directory imports are not valid ESM. A specifier that resolves to
 * neither a file nor a directory in the tree (e.g. a cross-package or not-yet-materialized target)
 * is treated as a file specifier and gets `.js` appended; tsc verifies its existence afterwards.
 *
 * @param specifier The raw module specifier text, without surrounding quotes.
 * @param fromDir Absolute directory of the file the specifier is written in.
 * @param fromFile Absolute path of the file the specifier is written in, for the error message.
 * @returns The (possibly unchanged) specifier and whether it was rewritten.
 * @throws Error naming `fromFile` and `specifier` when the specifier denotes a directory.
 */
function resolveSpecifier(specifier: string, fromDir: string, fromFile: string): {value: string; changed: boolean} {
	if (!isRelativeSpecifier(specifier) || hasFileExtension(specifier)) {
		return {value: specifier, changed: false};
	}

	const resolvedBase: string = path.resolve(fromDir, specifier);
	if (!fs.existsSync(`${resolvedBase}.ts`) && fs.existsSync(path.join(resolvedBase, "index.ts"))) {
		throw new Error(
			`Generated ESM import in ${fromFile} references the directory "${specifier}", which is not a ` +
			`valid ESM specifier; import the file directly instead (e.g. "${specifier}/index.js").`,
		);
	}

	return {value: `${specifier}.js`, changed: true};
}

/**
 * Runs the three specifier contexts (`from` clause, side-effect import, type-level `import(...)`)
 * over `content` once and reports how many specifiers were actually rewritten.
 */
function applySpecifierRewrite(content: string, fromFile: string): {content: string; rewritten: number} {
	const fromDir: string = path.dirname(fromFile);
	let rewritten: number = 0;

	const rewrite: (specifier: string) => string = (specifier: string): string => {
		const result: {value: string; changed: boolean} = resolveSpecifier(specifier, fromDir, fromFile);
		if (result.changed) {
			rewritten += 1;
		}
		return result.value;
	};

	let next: string = content.replace(
		FROM_SPECIFIER_RE,
		(_match: string, ws: string, quote: string, specifier: string): string => `from${ws}${quote}${rewrite(specifier)}${quote}`,
	);
	next = next.replace(
		SIDE_EFFECT_SPECIFIER_RE,
		(_match: string, ws: string, quote: string, specifier: string): string => `import${ws}${quote}${rewrite(specifier)}${quote}`,
	);
	next = next.replace(
		TYPE_IMPORT_SPECIFIER_RE,
		(_match: string, ws: string, quote: string, specifier: string): string => `import${ws}(${quote}${rewrite(specifier)}${quote})`,
	);

	return {content: next, rewritten};
}

/**
 * Appends `.js` to every relative specifier (`./…`, `../…`) that has no file extension yet, in
 * `import … from`, `export … from` (including `export *` and `export { … } from`), side-effect
 * `import "…"` and type-level `import("…")`, in both quote styles and across multi-line import
 * blocks. Already fully specified specifiers and non-relative specifiers (`axios`, `node:fs`) are
 * left unchanged, so the function is idempotent.
 *
 * @param content Source text of one generated file.
 * @param fromFile Absolute path of that file; relative specifiers are resolved against its directory.
 * @returns The source text with fully specified relative specifiers.
 * @throws Error naming `fromFile` and the specifier when a specifier provably denotes a directory
 * (`<spec>/index.ts` exists and `<spec>.ts` does not); directory imports are not valid ESM.
 */
export function fullySpecifyRelativeImports(content: string, fromFile: string): string {
	return applySpecifierRewrite(content, fromFile).content;
}

/** Recursively lists every `*.ts` file below `dir`, depth-first. */
function listTypeScriptFiles(dir: string): string[] {
	const entries: fs.Dirent[] = fs.readdirSync(dir, {withFileTypes: true});
	const files: string[] = [];
	for (const entry of entries) {
		const entryPath: string = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...listTypeScriptFiles(entryPath));
		} else if (entry.isFile() && entryPath.endsWith(".ts")) {
			files.push(entryPath);
		}
	}
	return files;
}

/**
 * Applies {@link fullySpecifyRelativeImports} to every `*.ts` file below `generatedBaseDir` and
 * writes changed files back.
 *
 * @param generatedBaseDir Absolute path of the `generated-sources` directory.
 * @returns The number of rewritten specifiers (for the generator log).
 */
export function fullySpecifyGeneratedSources(generatedBaseDir: string): number {
	let totalRewritten: number = 0;
	for (const filePath of listTypeScriptFiles(generatedBaseDir)) {
		const original: string = fs.readFileSync(filePath, "utf8");
		const result: {content: string; rewritten: number} = applySpecifierRewrite(original, filePath);
		if (result.rewritten > 0) {
			fs.writeFileSync(filePath, result.content, "utf8");
			totalRewritten += result.rewritten;
		}
	}
	return totalRewritten;
}
