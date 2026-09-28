import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {expect} from "chai";
import {it, suite} from "mocha";
import {fullySpecifyGeneratedSources, fullySpecifyRelativeImports} from "../../../codegen/typescript/adapter/EsmImportSpecifiers.js";

/**
 * Creates a temporary source tree the specifiers can be resolved against:
 * `Target.ts`, `nested/From.ts` (the importing file), `shared/Other.ts` and the directory
 * `folder/` that only contains an `index.ts` (a directory import, invalid in ESM).
 */
function createSourceTree(): string {
	const rootDir: string = fs.mkdtempSync(path.join(os.tmpdir(), "webpdf-esm-import-specifiers-test-"));
	for (const file of ["Target.ts", "nested/From.ts", "shared/Other.ts", "folder/index.ts"]) {
		const filePath: string = path.join(rootDir, file);
		fs.mkdirSync(path.dirname(filePath), {recursive: true});
		fs.writeFileSync(filePath, "export {};\n", "utf8");
	}
	return rootDir;
}

/** Runs `fullySpecifyRelativeImports` for `rootDir/From.ts` inside a fresh source tree. */
function specifyFromRoot(content: string): string {
	const rootDir: string = createSourceTree();
	try {
		return fullySpecifyRelativeImports(content, path.join(rootDir, "From.ts"));
	} finally {
		fs.rmSync(rootDir, {recursive: true, force: true});
	}
}

suite("EsmImportSpecifiersTest", function (): void {
	it("appends .js to a relative import in double quotes", function (): void {
		expect(specifyFromRoot("import {Target} from \"./Target\";\n"))
			.to.equal("import {Target} from \"./Target.js\";\n");
	});

	it("appends .js to a relative import in single quotes, including import type", function (): void {
		expect(specifyFromRoot("import type { Target } from './Target';\nimport { Other } from './shared/Other';\n"))
			.to.equal("import type { Target } from './Target.js';\nimport { Other } from './shared/Other.js';\n");
	});

	it("appends .js across a multi-line import block", function (): void {
		const content: string = [
			"import {",
			"\tParameter,",
			"\tTarget,",
			"} from \"./Target\";",
			"",
		].join("\n");
		expect(specifyFromRoot(content)).to.equal(content.replace("\"./Target\"", "\"./Target.js\""));
	});

	it("appends .js to export * from and export { … } from", function (): void {
		expect(specifyFromRoot("export * from \"./Target\";\nexport { Other } from './shared/Other';\n"))
			.to.equal("export * from \"./Target.js\";\nexport { Other } from './shared/Other.js';\n");
	});

	it("appends .js to parent-relative specifiers", function (): void {
		const rootDir: string = createSourceTree();
		try {
			const fromFile: string = path.join(rootDir, "nested", "From.ts");
			expect(fullySpecifyRelativeImports("import {Target} from \"../Target\";\nexport * from './../shared/Other';\n", fromFile))
				.to.equal("import {Target} from \"../Target.js\";\nexport * from './../shared/Other.js';\n");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("appends .js to a type-level import(\"…\")", function (): void {
		expect(specifyFromRoot("let value: import(\"./Target\").Target;\nlet other: import('./shared/Other').Other;\n"))
			.to.equal("let value: import(\"./Target.js\").Target;\nlet other: import('./shared/Other.js').Other;\n");
	});

	it("appends .js to a side-effect import", function (): void {
		expect(specifyFromRoot("import \"./Target\";\nimport './shared/Other';\n"))
			.to.equal("import \"./Target.js\";\nimport './shared/Other.js';\n");
	});

	it("appends .js to a relative target that does not exist in the tree (tsc checks existence)", function (): void {
		expect(specifyFromRoot("export { RestOperationData } from \"../openapi/RestOperationData\";\n"))
			.to.equal("export { RestOperationData } from \"../openapi/RestOperationData.js\";\n");
	});

	it("leaves fully specified specifiers unchanged and is idempotent", function (): void {
		const specified: string = "import {Target} from \"./Target.js\";\nexport * from './shared/Other.js';\n";
		expect(specifyFromRoot(specified)).to.equal(specified);
		const once: string = specifyFromRoot("import {Target} from \"./Target\";\nimport \"./shared/Other\";\n");
		expect(specifyFromRoot(once)).to.equal(once);
	});

	it("leaves package and node: specifiers unchanged", function (): void {
		const content: string = "import axios from \"axios\";\nimport fs from 'node:fs';\nexport * from \"form-data\";\n";
		expect(specifyFromRoot(content)).to.equal(content);
	});

	it("rejects a directory specifier and names the file and the specifier", function (): void {
		const rootDir: string = createSourceTree();
		try {
			const fromFile: string = path.join(rootDir, "From.ts");
			let caught: unknown;
			try {
				fullySpecifyRelativeImports("import {Folder} from \"./folder\";\n", fromFile);
			} catch (error: unknown) {
				caught = error;
			}
			expect(caught, "a directory import must be rejected").to.be.instanceOf(Error);
			const message: string = (caught as Error).message;
			expect(message, "the error names the importing file").to.include("From.ts");
			expect(message, "the error names the specifier").to.include("./folder");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("rewrites every file below the generated-sources directory and counts the rewritten specifiers", function (): void {
		const rootDir: string = createSourceTree();
		try {
			const rootFile: string = path.join(rootDir, "Root.ts");
			const nestedFile: string = path.join(rootDir, "nested", "Deep.ts");
			fs.writeFileSync(rootFile, "export * from \"./Target\";\nexport * from \"./shared/Other.js\";\n", "utf8");
			fs.writeFileSync(nestedFile, "import {Target} from '../Target';\nimport axios from \"axios\";\n", "utf8");

			const rewritten: number = fullySpecifyGeneratedSources(rootDir);

			expect(rewritten).to.equal(2);
			expect(fs.readFileSync(rootFile, "utf8")).to.equal("export * from \"./Target.js\";\nexport * from \"./shared/Other.js\";\n");
			expect(fs.readFileSync(nestedFile, "utf8")).to.equal("import {Target} from '../Target.js';\nimport axios from \"axios\";\n");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});
});
