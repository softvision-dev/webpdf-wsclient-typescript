import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {expect} from "chai";
import {it, suite} from "mocha";
import {generateModels} from "../../../codegen/typescript/port/generator";

type JsonObject = Record<string, unknown>;

function createTempRoot(): string {
	const tempRoot: string = fs.mkdtempSync(path.join(os.tmpdir(), "webpdf-codegen-test-"));
	const schemaDir: string = path.join(tempRoot, "src", "codegen", "resources", "schema");
	fs.mkdirSync(schemaDir, {recursive: true});
	return tempRoot;
}

function writeSpec(rootDir: string, spec: JsonObject): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function readGenerated(rootDir: string, fileName: string): string {
	const filePath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", fileName);
	return fs.readFileSync(filePath, "utf8");
}

suite("GeneratorHardeningTest", function (): void {
	it("generates enumName and inline object models including request-body inline model", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeSpec(rootDir, {
				openapi: "3.0.3",
				info: {title: "test", version: "1.0.0"},
				paths: {
					"/documents/{documentId}": {
						post: {
							requestBody: {
								content: {
									"application/json": {
										schema: {
											type: "object",
											properties: {
												note: {type: "string"}
											}
										}
									}
								}
							}
						}
					}
				},
				components: {
					schemas: {
						Operation_Test: {
							type: "object",
							required: ["status"],
							properties: {
								status: {
									type: "string",
									enum: ["ok", "failed"],
									"x-webpdf-codegen": {
										enumName: "Operation_Test_Status"
									}
								},
								inline: {
									type: "object",
									properties: {
										value: {type: "string"}
									}
								}
							}
						}
					}
				}
			});

			generateModels(rootDir);

			const operationModel: string = readGenerated(rootDir, path.join("operation", "Test.ts"));
			expect(operationModel).to.contain("status: TestStatus;");
			expect(operationModel).to.contain("inline?: TestInline;");

			const enumModel: string = readGenerated(rootDir, path.join("operation", "TestStatus.ts"));
			expect(enumModel).to.contain("export enum TestStatus");
			expect(enumModel).to.contain("Ok = 'ok'");
			expect(enumModel).to.contain("Failed = 'failed'");

			const inlineModel: string = readGenerated(rootDir, path.join("operation", "TestInline.ts"));
			expect(inlineModel).to.contain("export class TestInline");

			const requestBodyModel: string = readGenerated(rootDir, "DocumentsDocumentIdBody.ts");
			expect(requestBodyModel).to.contain("export class DocumentsDocumentIdBody");
			expect(requestBodyModel).to.contain("note?: string;");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("generates discriminator switch for mapped subtypes", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeSpec(rootDir, {
				openapi: "3.0.3",
				info: {title: "test", version: "1.0.0"},
				paths: {},
				components: {
					schemas: {
						Animal: {
							type: "object",
							discriminator: {
								propertyName: "kind",
								mapping: {
									cat: "#/components/schemas/Cat",
									dog: "#/components/schemas/Dog"
								}
							},
							properties: {
								kind: {type: "string"}
							}
						},
						Cat: {
							allOf: [
								{$ref: "#/components/schemas/Animal"},
								{
									type: "object",
									properties: {
										lives: {type: "integer"}
									}
								}
							]
						},
						Dog: {
							allOf: [
								{$ref: "#/components/schemas/Animal"},
								{
									type: "object",
									properties: {
										goodBoy: {type: "boolean"}
									}
								}
							]
						}
					}
				}
			});

			generateModels(rootDir);

			const animalModel: string = readGenerated(rootDir, "Animal.ts");
			expect(animalModel).to.contain("switch(data.kind)");
			expect(animalModel).to.contain("case 'cat':");
			expect(animalModel).to.contain("return Cat.fromJson(data);");
			expect(animalModel).to.contain("case 'dog':");
			expect(animalModel).to.contain("return Dog.fromJson(data);");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});
});
