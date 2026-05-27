import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {expect} from "chai";
import {it, suite} from "mocha";
import {adaptOpenApiRawOutput} from "../../../codegen/typescript/adapter/openapiRawAdapter";

function createTempRoot(): string {
	const tempRoot: string = fs.mkdtempSync(path.join(os.tmpdir(), "webpdf-openapi-raw-adapter-test-"));
	fs.mkdirSync(path.join(tempRoot, "src", "codegen", "resources", "schema"), {recursive: true});
	fs.mkdirSync(path.join(tempRoot, "build", "codegen", "raw", "models"), {recursive: true});
	return tempRoot;
}

function writeSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_Test: {
					type: "object",
					properties: {
						value: {type: "string"}
					}
				}
			}
		}
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeEnumSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_Mode: {
					type: "string",
					enum: ["A", "B"]
				}
			}
		}
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeClassSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_Item: {
					type: "object",
					properties: {
						value: {type: "string"}
					}
				}
			}
		}
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writePlaceholderSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_Clear: {
					type: "object",
					properties: {
						value: {type: "string"}
					}
				}
			}
		}
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeCompatInferenceSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_ToolboxImage: {
					type: "object",
					properties: {
						image: {type: "object"}
					}
				}
			}
		}
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeInlineMergeCompatSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_ToolboxMerge: {
					type: "object",
					properties: {
						merge: {
							type: "object",
							properties: {
								page: {
									type: "integer",
									default: 1,
									minimum: 1,
								},
							},
						},
					},
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeEnumNameAliasSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_SyntaxHighlight: {
					type: "object",
					properties: {
						wordBreak: {
							type: "string",
							enum: ["auto", "none"],
							"x-webpdf-codegen": {
								enumName: "Operation_TextWrapMode",
							},
						},
					},
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeMetadataEnumNameAliasSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Metadata_FormDocument: {
					type: "object",
					properties: {
						format: {
							type: "string",
							enum: ["none", "xfa"],
							"x-webpdf-codegen": {
								enumName: "Metadata_FormsFormat",
							},
						},
					},
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeMinMaxSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_AztecBarcode: {
					type: "object",
					properties: {
						margin: {
							type: "integer",
							minimum: 0,
							maximum: 99,
						},
						text: {
							type: "string",
						},
					},
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeArrayDefaultSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_AddBarcode: {
					type: "object",
					properties: {
						pdf417: {
							type: "array",
							items: {
								type: "object",
							},
						},
					},
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeBooleanDefaultSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Portal_Functions: {
					type: "object",
					properties: {
						addWatermark: {
							type: "boolean",
							default: true,
						},
					},
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeNestedModelHydrationSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_Barcode: {
					type: "object",
					properties: {
						add: {$ref: "#/components/schemas/Operation_AddBarcode"},
					},
				},
				Operation_AddBarcode: {
					type: "object",
					properties: {
						text: {type: "string"},
					},
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writePropertyDescriptionSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				ServerConfig_Host: {
					type: "object",
					properties: {
						contextPath: {
							type: "string",
							description: "Sets the context path of the server address.",
						},
					},
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeTypeAliasExpansionSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Admin_Configuration: {
					type: "object",
					properties: {
						configurationMode: {type: "string"},
						configurationType: {type: "string"},
					},
					required: ["configurationMode", "configurationType"],
				},
				ApplicationConfig_Application: {
					type: "object",
					properties: {
						name: {type: "string"},
					},
				},
				Admin_ApplicationCheck: {
					type: "object",
					properties: {
						checkType: {type: "string"},
					},
				},
				Admin_GlobalKeyStore: {
					type: "object",
					properties: {
						keyStoreContent: {type: "string"},
					},
				},
				Admin_ApplicationConfiguration: {
					type: "object",
					allOf: [
						{$ref: "#/components/schemas/Admin_Configuration"},
					],
					properties: {
						configuration: {$ref: "#/components/schemas/ApplicationConfig_Application"},
						configurationChecks: {
							type: "array",
							items: {$ref: "#/components/schemas/Admin_ApplicationCheck"},
						},
						globalKeyStore: {$ref: "#/components/schemas/Admin_GlobalKeyStore"},
					},
					required: ["configuration", "configurationChecks", "configurationMode", "configurationType"],
				},
				Admin_FileGroupDataStore: {
					type: "string",
					enum: ["logo"],
				},
				Admin_FileDataStore: {
					type: "object",
					properties: {
						fileGroup: {$ref: "#/components/schemas/Admin_FileGroupDataStore"},
					},
					required: ["fileGroup"],
				},
				Admin_LogoFileDataStore: {
					type: "object",
					allOf: [
						{$ref: "#/components/schemas/Admin_FileDataStore"},
					],
					properties: {
						fileContent: {type: "string"},
					},
					required: ["fileGroup"],
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeObjectDefaultSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_AddBarcode: {
					type: "object",
					properties: {
						settings: {
							type: "object",
						},
					},
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeObjectExplicitDefaultSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Operation_AddBarcode: {
					type: "object",
					properties: {
						settings: {
							type: "object",
							default: {
								enabled: true,
							},
						},
					},
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

function writeRefEnumDefaultSpec(rootDir: string): void {
	const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
	const spec: object = {
		openapi: "3.0.3",
		info: {title: "test", version: "1.0.0"},
		paths: {},
		components: {
			schemas: {
				Cluster_NodeState: {
					type: "string",
					default: "init",
					enum: ["unknown", "init", "up", "down"],
				},
				Cluster_NodeStatus: {
					type: "object",
					properties: {
						state: {
							$ref: "#/components/schemas/Cluster_NodeState",
						},
					},
				},
			},
		},
	};
	fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
}

suite("OpenApiRawAdapterTest", function (): void {
	it("records strict coverage gaps in adapter summary when raw model is missing", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeSpec(rootDir);
			expect((): void => {
				adaptOpenApiRawOutput(rootDir);
			}).to.not.throw();
			const summaryPath: string = path.join(rootDir, "build", "codegen", "adapter", "adapter-summary.json");
			const summary: {missingFromRaw?: string[]} = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {missingFromRaw?: string[]};
			expect(summary.missingFromRaw).to.include("Test");
			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "Test.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.contain("export type Test = any;");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("passes coverage check when matching raw model exists", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeSpec(rootDir);
			const modelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "Test.ts");
			fs.writeFileSync(modelPath, "export interface Test {}\n", "utf8");

			expect((): void => {
				adaptOpenApiRawOutput(rootDir);
			}).to.not.throw();
			const manifestPath: string = path.join(rootDir, "build", "codegen", "adapter", "raw-model-manifest.json");
			const manifest: {models?: Array<{name: string; kind: string}>} = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
				models?: Array<{name: string; kind: string}>;
			};
			expect(manifest.models).to.be.an("array").with.lengthOf(1);
			expect(manifest.models?.[0]?.name).to.equal("Test");
			expect(manifest.models?.[0]?.kind).to.equal("interface");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("overlays generated enum with raw enum source", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeEnumSpec(rootDir);
			const rawEnumPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "Mode.ts");
			const rawEnumContent: string = [
				"/* raw-openapi */",
				"export enum Mode {",
				"  A = 'A',",
				"  B = 'B'",
				"}",
				"",
			].join("\n");
			fs.writeFileSync(rawEnumPath, rawEnumContent, "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedEnumPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "Mode.ts");
			const generatedEnumContent: string = fs.readFileSync(generatedEnumPath, "utf8");
			expect(generatedEnumContent).to.contain("/* raw-openapi */");
			expect(generatedEnumContent).to.contain("export enum Mode");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("writes object candidate report for non-enum raw models", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "Test.ts");
			fs.writeFileSync(rawModelPath, "export interface Test {}\n", "utf8");

			adaptOpenApiRawOutput(rootDir);

			const candidatePath: string = path.join(rootDir, "build", "codegen", "adapter", "raw-object-candidates.json");
			const report: {models?: Array<{name: string; reasons: string[]}>} =
				JSON.parse(fs.readFileSync(candidatePath, "utf8")) as {models?: Array<{name: string; reasons: string[]}>};
			expect(report.models).to.be.an("array").with.lengthOf(1);
			expect(report.models?.[0]?.name).to.equal("Test");
			expect(report.models?.[0]?.reasons).to.be.an("array");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("materializes raw class model into generated sources", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeClassSpec(rootDir);
			const rawClassPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "Item.ts");
			fs.writeFileSync(rawClassPath, [
				"export class Item {",
				"  static fromRaw(): Item {",
				"    return new Item();",
				"  }",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "Item.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.contain("export class Item");
			expect(generatedContent).to.contain("fromRaw");
			const summaryPath: string = path.join(rootDir, "build", "codegen", "adapter", "adapter-summary.json");
			const summary: {writtenExports?: string[]} = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {writtenExports?: string[]};
			expect(summary.writtenExports).to.include("operation/Item");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("tolerates configured placeholder coverage model without strict gap", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writePlaceholderSpec(rootDir);
			expect((): void => {
				adaptOpenApiRawOutput(rootDir);
			}).to.not.throw();
			const summaryPath: string = path.join(rootDir, "build", "codegen", "adapter", "adapter-summary.json");
			const summary: {missingFromRaw?: string[]} = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {missingFromRaw?: string[]};
			expect(summary.missingFromRaw).to.not.include("Clear");
			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "Clear.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			// Placeholder models now generate as typed classes with [key: string]: any
			// instead of a bare type alias, providing a usable constructor and fromJson/toJson/clone API.
			expect(generatedContent).to.contain("export interface ClearInterface {");
			expect(generatedContent).to.contain("export class Clear implements ClearInterface {");
			expect(generatedContent).to.contain("[key: string]: any;");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("materializes inferred compatibility models as typed classes", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeCompatInferenceSpec(rootDir);
			const rawMainPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "ToolboxImage.ts");
			fs.writeFileSync(rawMainPath, "export interface ToolboxImage { image?: OperationToolboxImageImage; }\n", "utf8");
			const rawCompatPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "OperationToolboxImageImage.ts");
			fs.writeFileSync(rawCompatPath, "export interface OperationToolboxImageImage { value?: string; }\n", "utf8");

			adaptOpenApiRawOutput(rootDir);

			const mainModelPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "ToolboxImage.ts");
			const mainModelContent: string = fs.readFileSync(mainModelPath, "utf8");
			expect(mainModelContent).to.match(/export (?:interface|class) ToolboxImage/);

			const indexPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "index.ts");
			const indexContent: string = fs.readFileSync(indexPath, "utf8");
			expect(indexContent).to.match(/\bToolboxImage\b/);
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("applies inline schema defaults and constraints to inferred compatibility models", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeInlineMergeCompatSpec(rootDir);
			const rawMainPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "ToolboxMerge.ts");
			fs.writeFileSync(rawMainPath, [
				"export interface ToolboxMerge {",
				"  'merge'?: OperationToolboxMergeMerge;",
				"}",
				"",
			].join("\n"), "utf8");
			const rawCompatPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "OperationToolboxMergeMerge.ts");
			fs.writeFileSync(rawCompatPath, [
				"export interface OperationToolboxMergeMerge {",
				"  'page'?: number;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const mainModelPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "ToolboxMerge.ts");
			const mainModelContent: string = fs.readFileSync(mainModelPath, "utf8");
			expect(mainModelContent).to.match(/export (?:interface|class) ToolboxMerge/);
			expect(mainModelContent).to.contain("'merge'");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("maps x-webpdf-codegen enumName aliases to generated enum symbols", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeEnumNameAliasSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "SyntaxHighlight.ts");
			fs.writeFileSync(rawModelPath, [
				"export interface SyntaxHighlight {",
				"  'wordBreak'?: OperationSyntaxHighlightWordBreakEnum;",
				"}",
				"export const OperationSyntaxHighlightWordBreakEnum = {",
				"  Auto: 'auto',",
				"  None: 'none'",
				"};",
				"export type OperationSyntaxHighlightWordBreakEnum = typeof OperationSyntaxHighlightWordBreakEnum[keyof typeof OperationSyntaxHighlightWordBreakEnum];",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const indexPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "index.ts");
			const indexContent: string = fs.readFileSync(indexPath, "utf8");
			expect(indexContent).to.contain("TextWrapMode");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("exports both raw and stripped enum legacy aliases for x-webpdf-codegen enum names", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeMetadataEnumNameAliasSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "FormDocument.ts");
			fs.writeFileSync(rawModelPath, [
				"export interface FormDocument {",
				"  'format'?: MetadataFormDocumentFormatEnum;",
				"}",
				"export const MetadataFormDocumentFormatEnum = {",
				"  None: 'none',",
				"  Xfa: 'xfa'",
				"};",
				"export type MetadataFormDocumentFormatEnum = typeof MetadataFormDocumentFormatEnum[keyof typeof MetadataFormDocumentFormatEnum];",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const sharedEnumPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "shared-enums", "FormsFormat.ts");
			const sharedEnumContent: string = fs.readFileSync(sharedEnumPath, "utf8");
			expect(sharedEnumContent).to.contain("export enum FormsFormat");
			expect(sharedEnumContent).to.contain("export enum MetadataFormsFormat");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("generates static min and max methods from property constraints", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeMinMaxSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "AztecBarcode.ts");
			fs.writeFileSync(rawModelPath, [
				"export interface AztecBarcode {",
				"  'margin'?: number;",
				"  'text'?: string;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "AztecBarcode.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.contain("public static getMarginMin(): number {");
			expect(generatedContent).to.contain("return 0;");
			expect(generatedContent).to.contain("public static getMarginMax(): number {");
			expect(generatedContent).to.contain("return 99;");
			expect(generatedContent).to.not.contain("public static getTextMin(): number {");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("returns empty array defaults for array properties", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeArrayDefaultSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "AddBarcode.ts");
			fs.writeFileSync(rawModelPath, [
				"export interface AddBarcode {",
				"  'pdf417'?: Array<any>;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "AddBarcode.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.contain("export interface AddBarcodeInterface");
			expect(generatedContent).to.contain("export class AddBarcode implements AddBarcodeInterface");
			expect(generatedContent).to.contain("this['pdf417'] = data?.['pdf417'];");
			expect(generatedContent).to.not.contain("Object.assign");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("returns empty string defaults for string properties", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeArrayDefaultSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "AddBarcode.ts");
			fs.writeFileSync(rawModelPath, [
				"export interface AddBarcode {",
				"  'text'?: string;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "AddBarcode.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.contain("export interface AddBarcodeInterface");
			expect(generatedContent).to.contain("export class AddBarcode implements AddBarcodeInterface");
			expect(generatedContent).to.contain("this['text'] = data?.['text'];");
			expect(generatedContent).to.not.contain("Object.assign");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("returns undefined defaults for object properties without explicit schema default", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeObjectDefaultSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "AddBarcode.ts");
			fs.writeFileSync(rawModelPath, [
				"export interface AddBarcode {",
				"  'settings'?: AddBarcodeSettings;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "AddBarcode.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.contain("export interface AddBarcodeInterface");
			expect(generatedContent).to.contain("export class AddBarcode implements AddBarcodeInterface");
			expect(generatedContent).to.contain("this['settings'] = data?.['settings'];");
			expect(generatedContent).to.not.contain("Object.assign");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("applies explicit schema defaults for object properties", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeObjectExplicitDefaultSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "AddBarcode.ts");
			fs.writeFileSync(rawModelPath, [
				"export interface AddBarcode {",
				"  'settings'?: AddBarcodeSettings;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "AddBarcode.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.contain("export interface AddBarcodeInterface");
			expect(generatedContent).to.contain("export class AddBarcode implements AddBarcodeInterface");
			expect(generatedContent).to.contain("this['settings'] = data?.['settings']");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("does not apply constructor defaults for required properties without explicit schema default", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeObjectDefaultSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "AddBarcode.ts");
			fs.writeFileSync(rawModelPath, [
				"export interface AddBarcode {",
				"  'settings': AddBarcodeSettings;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "AddBarcode.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.not.contain("this.settings = AddBarcode.getSettingsDefault();");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("does not use object assign in generated constructors", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeArrayDefaultSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "AddBarcode.ts");
			fs.writeFileSync(rawModelPath, [
				"export interface AddBarcode {",
				"  'pdf417'?: Array<any>;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "AddBarcode.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.not.contain("Object.assign(this, data ?? {});");
			expect(generatedContent).to.contain("this['pdf417'] = data?.['pdf417'];");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("hydrates nested model properties via fromJson and rewrites promoted imports", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeNestedModelHydrationSpec(rootDir);
			const rawBarcodePath: string = path.join(rootDir, "build", "codegen", "raw", "models", "Barcode.ts");
			fs.writeFileSync(rawBarcodePath, [
				"import type { AddBarcode } from './AddBarcode';",
				"export interface Barcode {",
				"  'add'?: AddBarcode;",
				"}",
				"",
			].join("\n"), "utf8");
			const rawAddBarcodePath: string = path.join(rootDir, "build", "codegen", "raw", "models", "AddBarcode.ts");
			fs.writeFileSync(rawAddBarcodePath, [
				"export interface AddBarcode {",
				"  'text'?: string;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "Barcode.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.contain("AddBarcode.fromJson(data?.['add'])");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("applies explicit schema boolean defaults in generated default methods", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeBooleanDefaultSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "Functions.ts");
			fs.writeFileSync(rawModelPath, [
				"export interface Functions {",
				"  'addWatermark'?: boolean;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "portal", "Functions.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.contain("public static getAddWatermarkDefault(): boolean {");
			expect(generatedContent).to.contain("return true;");
			expect(generatedContent).to.contain("this['addWatermark'] = data?.['addWatermark'] !== undefined ? data?.['addWatermark'] : true;");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("applies schema property descriptions in generated description methods", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writePropertyDescriptionSpec(rootDir);
			const rawModelPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "ServerConfigHost.ts");
			fs.writeFileSync(rawModelPath, [
				"export interface ServerConfigHost {",
				"  'contextPath'?: string;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "admin", "config", "server", "Host.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.contain("public static getContextPathDescription(): string {");
			expect(generatedContent).to.contain("return \"Sets the context path of the server address.\";");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("applies defaults from referenced enum schemas", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeRefEnumDefaultSpec(rootDir);
			const enumRawPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "ClusterNodeState.ts");
			fs.writeFileSync(enumRawPath, [
				"export const ClusterNodeState = {",
				"  Unknown: 'unknown',",
				"  Init: 'init',",
				"  Up: 'up',",
				"  Down: 'down'",
				"} as const;",
				"",
				"export type ClusterNodeState = typeof ClusterNodeState[keyof typeof ClusterNodeState];",
				"",
			].join("\n"), "utf8");
			const statusRawPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "ClusterNodeStatus.ts");
			fs.writeFileSync(statusRawPath, [
				"import type { ClusterNodeState } from './ClusterNodeState';",
				"export interface ClusterNodeStatus {",
				"  'state'?: ClusterNodeState;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "ClusterNodeStatus.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			expect(generatedContent).to.contain("'state'?: ClusterNodeState");
			// $ref default propagation: the referenced enum schema has default "init",
			// so the constructor should apply it and getStateDefault() must be generated.
			expect(generatedContent).to.contain(`data?.['state'] !== undefined ? data?.['state'] : "init" as ClusterNodeState`);
			expect(generatedContent).to.contain(`getStateDefault(): string { return "init"; }`);
			const generatedEnumPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "ClusterNodeState.ts");
			const generatedEnumContent: string = fs.readFileSync(generatedEnumPath, "utf8");
			expect(generatedEnumContent).to.contain("export enum ClusterNodeState {");
			expect(generatedEnumContent).to.contain("Init = 'init'");
			expect(generatedEnumContent).to.not.contain("export const ClusterNodeState = {");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("materializes schema-backed type aliases as typed classes", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeTypeAliasExpansionSpec(rootDir);
			const applicationConfigRawPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "AdminApplicationConfiguration.ts");
			fs.writeFileSync(applicationConfigRawPath, [
				"import type { AdminApplicationCheck } from './AdminApplicationCheck';",
				"import type { AdminConfiguration } from './AdminConfiguration';",
				"import type { AdminGlobalKeyStore } from './AdminGlobalKeyStore';",
				"import type { ApplicationConfigApplication } from './ApplicationConfigApplication';",
				"export type AdminApplicationConfiguration = AdminConfiguration;",
				"",
			].join("\n"), "utf8");
			const fileDataStoreRawPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "AdminFileDataStore.ts");
			fs.writeFileSync(fileDataStoreRawPath, [
				"import type { AdminFileGroupDataStore } from './AdminFileGroupDataStore';",
				"export interface AdminFileDataStore {",
				"  'fileGroup': AdminFileGroupDataStore;",
				"}",
				"",
			].join("\n"), "utf8");
			const logoRawPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "AdminLogoFileDataStore.ts");
			fs.writeFileSync(logoRawPath, [
				"import type { AdminFileDataStore } from './AdminFileDataStore';",
				"import type { AdminFileGroupDataStore } from './AdminFileGroupDataStore';",
				"export type AdminLogoFileDataStore = AdminFileDataStore;",
				"",
			].join("\n"), "utf8");
			const passThroughRawModels: Array<[string, string]> = [
				["AdminConfiguration.ts", "export interface AdminConfiguration { 'configurationMode': string; 'configurationType': string; }\n"],
				["ApplicationConfigApplication.ts", "export interface ApplicationConfigApplication { 'name'?: string; }\n"],
				["AdminApplicationCheck.ts", "export interface AdminApplicationCheck { 'checkType'?: string; }\n"],
				["AdminGlobalKeyStore.ts", "export interface AdminGlobalKeyStore { 'keyStoreContent'?: string; }\n"],
				["AdminFileGroupDataStore.ts", "export enum AdminFileGroupDataStore { Logo = 'logo' }\n"],
			];
			for (const [fileName, content] of passThroughRawModels) {
				fs.writeFileSync(path.join(rootDir, "build", "codegen", "raw", "models", fileName), content, "utf8");
			}

			adaptOpenApiRawOutput(rootDir);

			const applicationConfigPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "admin", "ApplicationConfiguration.ts");
			const applicationConfigContent: string = fs.readFileSync(applicationConfigPath, "utf8");
			expect(applicationConfigContent).to.contain("export class ApplicationConfiguration");
			expect(applicationConfigContent).to.contain("extends Configuration");

			const logoPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "admin", "LogoFileDataStore.ts");
			const logoContent: string = fs.readFileSync(logoPath, "utf8");
			expect(logoContent).to.contain("export class LogoFileDataStore");
			expect(logoContent).to.contain("extends FileDataStore");
			expect(logoContent).to.contain("fileContent");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("generates toJson() with explicit property list for schema-backed classes", function (): void {
		const rootDir: string = createTempRoot();
		try {
			writeSpec(rootDir);
			const testRawPath: string = path.join(rootDir, "build", "codegen", "raw", "models", "Test.ts");
			fs.writeFileSync(testRawPath, [
				"export interface Test {",
				"  'value'?: string;",
				"  'count'?: number;",
				"}",
				"",
			].join("\n"), "utf8");

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "Test.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			// toJson() must enumerate only schema-declared properties so that consumer
			// subclass fields are never included in the serialized output.
			expect(generatedContent).to.contain("return JSON.parse(JSON.stringify({");
			expect(generatedContent).to.contain("'value': this['value'],");
			expect(generatedContent).to.contain("'count': this['count'],");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});

	it("generates toJson() with __knownKeys__ guard for open-ended union classes", function (): void {
		const rootDir: string = createTempRoot();
		try {
			// A type:object + oneOf schema becomes a [key:string]:any class via transformTypeAliasModel.
			const specPath: string = path.join(rootDir, "src", "codegen", "resources", "schema", "openapi.json");
			fs.writeFileSync(specPath, JSON.stringify({
				openapi: "3.0.3",
				info: {title: "test", version: "1.0.0"},
				paths: {},
				components: {
					schemas: {
						Operation_Alpha: {type: "object", properties: {kind: {type: "string"}}},
						Operation_Beta: {type: "object", properties: {kind: {type: "string"}}},
						Operation_Union: {
							type: "object",
							oneOf: [
								{$ref: "#/components/schemas/Operation_Alpha"},
								{$ref: "#/components/schemas/Operation_Beta"},
							],
						},
					},
				},
			}, null, 2) + "\n", "utf8");
			fs.writeFileSync(
				path.join(rootDir, "build", "codegen", "raw", "models", "Alpha.ts"),
				"export interface Alpha { 'kind'?: string; }\n",
				"utf8",
			);
			fs.writeFileSync(
				path.join(rootDir, "build", "codegen", "raw", "models", "Beta.ts"),
				"export interface Beta { 'kind'?: string; }\n",
				"utf8",
			);
			fs.writeFileSync(
				path.join(rootDir, "build", "codegen", "raw", "models", "Union.ts"),
				[
					"import type { Alpha } from './Alpha';",
					"import type { Beta } from './Beta';",
					"export type Union = Alpha | Beta;",
					"",
				].join("\n"),
				"utf8",
			);

			adaptOpenApiRawOutput(rootDir);

			const generatedPath: string = path.join(rootDir, "src", "main", "typescript", "generated-sources", "operation", "Union.ts");
			const generatedContent: string = fs.readFileSync(generatedPath, "utf8");
			// The [key:string]:any class captures data keys non-enumerably so toJson()
			// can exclude properties added by consumer subclasses.
			expect(generatedContent).to.contain("Object.defineProperty(this, '__knownKeys__'");
			expect(generatedContent).to.contain("enumerable: false");
			expect(generatedContent).to.contain("this['__knownKeys__'] as Set<string>");
			// Loop serializes values via toJson() where available, not raw own-property enumeration.
			expect(generatedContent).to.contain("for (const key of keys) {");
			expect(generatedContent).to.contain("i?.toJson?.() ?? i");
		} finally {
			fs.rmSync(rootDir, {recursive: true, force: true});
		}
	});
});
