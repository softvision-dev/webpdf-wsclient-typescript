import {execSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {adaptOpenApiRawOutput} from "./adapter/openapiRawAdapter";

/**
 * Builds a `ProcessEnv` that ensures the `java` binary from `JAVA_HOME` (when set) is
 * reachable on `PATH`. Both `PATH` and `Path` are updated for Windows compatibility.
 */
function buildJavaEnv(rootDir: string): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = {...process.env};
	const javaHome: string | undefined = env.JAVA_HOME;
	if (javaHome) {
		const javaBin: string = path.resolve(javaHome, "bin");
		const currentPath: string = env.PATH ?? env.Path ?? "";
		if (!currentPath.toLowerCase().includes(javaBin.toLowerCase())) {
			const merged: string = currentPath.length > 0 ? `${javaBin}${path.delimiter}${currentPath}` : javaBin;
			env.PATH = merged;
			env.Path = merged;
		}
	}
	return env;
}

/**
 * Verifies that a `java` runtime is accessible, first via `PATH` and then via
 * `JAVA_HOME/bin/java` as a fallback. Throws a descriptive error when neither is
 * available so the codegen pipeline fails early with an actionable message.
 */
function ensureJavaAvailable(rootDir: string, env: NodeJS.ProcessEnv): void {
	try {
		execSync("java -version", {cwd: rootDir, stdio: "pipe", env});
	} catch (_error: unknown) {
		const javaHome: string | undefined = env.JAVA_HOME;
		if (javaHome) {
			const javaExe: string = path.resolve(javaHome, "bin", process.platform === "win32" ? "java.exe" : "java");
			if (!fs.existsSync(javaExe)) {
				throw new Error(`[codegen] JAVA_HOME is set but invalid: ${javaExe} not found.`);
			}
			try {
				execSync(`"${javaExe}" -version`, {cwd: rootDir, stdio: "pipe", env});
				return;
			} catch (_javaHomeError: unknown) {
				throw new Error(`[codegen] Java from JAVA_HOME is not executable: ${javaExe}`);
			}
		}
		throw new Error("[codegen] Missing Java runtime. Set JAVA_HOME (project/run-config) or ensure `java` is available in PATH.");
	}
}

/**
 * Runs the code generation pipeline:
 * 1) OpenAPI Generator raw output
 * 2) Adapter transform to generated-sources
 */
function main(): void {
	const rootDir: string = path.resolve(__dirname, "../../..");
	const env: NodeJS.ProcessEnv = buildJavaEnv(rootDir);
	ensureJavaAvailable(rootDir, env);

	console.log("[codegen] Generating raw artifacts with OpenAPI Generator.");
	execSync("yarn run codegen:raw", {cwd: rootDir, stdio: "inherit", env});

	console.log("[codegen] Running adapter transform.");
	adaptOpenApiRawOutput(rootDir);
}

main();
