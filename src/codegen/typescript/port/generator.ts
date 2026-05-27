import fs from "node:fs";
import path from "node:path";
import {Index} from "./Index";
import {IndexEntry, PortModelMeta} from "./IndexEntry";
import {ModelName} from "./ModelName";

type OpenApiSpec = {
	components?: {
		schemas?: Record<string, SchemaObject>;
	};
};

type Discriminator = {
	propertyName: string;
	mapping?: Record<string, string>;
};

type SchemaObject = {
	type?: string;
	enum?: string[];
	description?: string;
	default?: unknown;
	minimum?: number;
	maximum?: number;
	format?: string;
	required?: string[];
	properties?: Record<string, SchemaObject>;
	items?: SchemaObject;
	allOf?: SchemaObject[];
	oneOf?: SchemaObject[];
	discriminator?: Discriminator;
	$ref?: string;
	["x-webpdf-codegen"]?: {
		extends?: string;
		enumName?: string;
	};
};

type GeneratedModel = {
	schemaName: string;
	className: string;
	fileLocation: string;
	packageLocation: string;
	schema: SchemaObject;
	isEnum: boolean;
};

type PropertyRender = {
	name: string;
	required: boolean;
	typeName: string;
	description?: string;
	defaultValue?: unknown;
	minimum?: number;
	maximum?: number;
	fromJsonExpr: string;
	toJsonExpr: string;
};

const INDENT: string = "    ";

function parseRef(ref: string): string {
	const parts: string[] = ref.split("/");
	return parts[parts.length - 1] ?? ref;
}

function ucFirst(value: string): string {
	if (value.length === 0) {
		return value;
	}
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function toEnumMemberName(value: string): string {
	const parts: string[] = value
		.replace(/[^A-Za-z0-9]+/g, " ")
		.trim()
		.split(/\s+/)
		.filter((entry: string): boolean => entry.length > 0)
		.map((entry: string): string => ucFirst(entry.toLowerCase()));
	let result: string = parts.join("");
	if (result.length === 0) {
		result = value.replace(/[^A-Za-z0-9_]/g, "_");
	}
	if (/^[0-9]/.test(result)) {
		result = `_${result}`;
	}
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(result)) {
		result = result.replace(/[^A-Za-z0-9_]/g, "_");
	}
	return result;
}

function escapeText(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n");
}

function toJsLiteral(value: unknown): string {
	if (typeof value === "string") {
		return `"${escapeText(value)}"`;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return `${value}`;
	}
	if (Array.isArray(value)) {
		return `[${value.map((entry: unknown): string => toJsLiteral(entry)).join(", ")}]`;
	}
	if (value === null) {
		return "null";
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return "undefined";
}

function getRelativeIndexPath(fileLocation: string): string {
	const folderSegments: string[] = fileLocation.split("/").filter((entry: string): boolean => entry.length > 0);
	const depth: number = folderSegments.length > 0 ? folderSegments.length - 1 : 0;
	if (depth <= 0) {
		return "./index";
	}
	return `${"../".repeat(depth)}index`;
}

function refToClassName(ref: string): string {
	return new ModelName(parseRef(ref)).getClassName();
}

function buildGeneratedModels(schemas: Record<string, SchemaObject>): GeneratedModel[] {
	return Object.entries(schemas).map(([schemaName, schema]: [string, SchemaObject]): GeneratedModel => {
		const modelName: ModelName = new ModelName(schemaName);
		return {
			schemaName,
			className: modelName.getClassName(),
			fileLocation: modelName.getFileName(),
			packageLocation: modelName.getPackageName(),
			schema,
			isEnum: Array.isArray(schema.enum),
		};
	});
}

function collectInlineEnumModels(spec: OpenApiSpec): GeneratedModel[] {
	const bySchemaName: Map<string, GeneratedModel> = new Map<string, GeneratedModel>();

	function addFromEnumName(enumName: string, enumValues: string[]): void {
		if (bySchemaName.has(enumName)) {
			return;
		}
		const modelName: ModelName = new ModelName(enumName);
		bySchemaName.set(enumName, {
			schemaName: enumName,
			className: modelName.getClassName(),
			fileLocation: modelName.getFileName(),
			packageLocation: modelName.getPackageName(),
			schema: {
				type: "string",
				enum: enumValues,
			},
			isEnum: true,
		});
	}

	function scan(node: unknown): void {
		if (!node || typeof node !== "object") {
			return;
		}
		const current: SchemaObject = node as SchemaObject;
		const enumName: string | undefined = current["x-webpdf-codegen"]?.enumName;
		if (enumName && Array.isArray(current.enum) && current.enum.length > 0) {
			addFromEnumName(enumName, current.enum);
		}

		for (const value of Object.values(current as Record<string, unknown>)) {
			scan(value);
		}
	}

	scan(spec);
	return Array.from(bySchemaName.values());
}

function lookupByClassName(models: GeneratedModel[]): Map<string, GeneratedModel> {
	const lookup: Map<string, GeneratedModel> = new Map<string, GeneratedModel>();
	for (const model of models) {
		lookup.set(model.className, model);
	}
	return lookup;
}

function lookupBySchemaName(models: GeneratedModel[]): Map<string, GeneratedModel> {
	const lookup: Map<string, GeneratedModel> = new Map<string, GeneratedModel>();
	for (const model of models) {
		lookup.set(model.schemaName, model);
	}
	return lookup;
}

function toInlineModelSchemaName(parentSchemaName: string, propertyName: string): string {
	return `${parentSchemaName}_${ucFirst(propertyName)}`;
}

function isInlineObjectSchema(schema: SchemaObject): boolean {
	return !schema.$ref && (Boolean(schema.properties) || Boolean(schema.allOf) || Boolean(schema.oneOf));
}

function collectInlineObjectModels(schemas: Record<string, SchemaObject>, spec: OpenApiSpec): GeneratedModel[] {
	const bySchemaName: Map<string, GeneratedModel> = new Map<string, GeneratedModel>();
	const skippedClassNames: Set<string> = new Set<string>([
		"WebserviceResultStackTraceCauseSuppressedStackTrace",
		"WebserviceResultStackTraceStackTrace",
		"WebserviceResultStackTraceSuppressed",
		"WebserviceResultStackTraceSuppressedStackTrace",
	]);

	function addInlineModel(schemaName: string, schema: SchemaObject): void {
		if (bySchemaName.has(schemaName)) {
			return;
		}
		const modelName: ModelName = new ModelName(schemaName);
		if (skippedClassNames.has(modelName.getClassName())) {
			return;
		}
		bySchemaName.set(schemaName, {
			schemaName,
			className: modelName.getClassName(),
			fileLocation: modelName.getFileName(),
			packageLocation: modelName.getPackageName(),
			schema,
			isEnum: Array.isArray(schema.enum),
		});
		scanSchema(schemaName, schema);
	}

	function scanSchema(parentSchemaName: string, schema: SchemaObject): void {
		const {properties} = resolveObjectSchema(schema);
		for (const [propName, propSchema] of Object.entries(properties)) {
			if (isInlineObjectSchema(propSchema)) {
				addInlineModel(toInlineModelSchemaName(parentSchemaName, propName), propSchema);
			}
			if (propSchema.type === "array" && propSchema.items && isInlineObjectSchema(propSchema.items)) {
				addInlineModel(toInlineModelSchemaName(parentSchemaName, propName), propSchema.items);
			}
		}
	}

	for (const [schemaName, schema] of Object.entries(schemas)) {
		scanSchema(schemaName, schema);
	}

	// Request-body inline schemas: /documents -> DocumentsBody, /documents/{documentId} -> DocumentsDocumentIdBody
	const paths: Record<string, unknown> = (spec as { paths?: Record<string, unknown> }).paths ?? {};
	for (const [routePath, rawOps] of Object.entries(paths)) {
		if (!rawOps || typeof rawOps !== "object") {
			continue;
		}
		for (const rawOp of Object.values(rawOps as Record<string, unknown>)) {
			if (!rawOp || typeof rawOp !== "object") {
				continue;
			}
			const op: Record<string, unknown> = rawOp as Record<string, unknown>;
			const requestBody: Record<string, unknown> | undefined = op.requestBody as Record<string, unknown> | undefined;
			const content: Record<string, unknown> | undefined = requestBody?.content as Record<string, unknown> | undefined;
			if (!content) {
				continue;
			}
			const mediaSchema: unknown =
				(content["application/json"] as Record<string, unknown> | undefined)?.schema ??
				(content["multipart/form-data"] as Record<string, unknown> | undefined)?.schema;
			if (!mediaSchema || typeof mediaSchema !== "object") {
				continue;
			}
			const schema: SchemaObject = mediaSchema as SchemaObject;
			if (schema.$ref || !isInlineObjectSchema(schema)) {
				continue;
			}
			const name: string = `${routePath
				.split("/")
				.filter((entry: string): boolean => entry.length > 0)
				.map((entry: string): string => entry.replace(/[{}]/g, ""))
				.map((entry: string): string => entry.split(/[^A-Za-z0-9]/).map(ucFirst).join(""))
				.join("")}Body`;
			addInlineModel(name, schema);
		}
	}

	return Array.from(bySchemaName.values());
}

function resolveObjectSchema(schema: SchemaObject): {
	baseClassName?: string;
	properties: Record<string, SchemaObject>;
	required: Set<string>
} {
	const required: Set<string> = new Set<string>(schema.required ?? []);
	const properties: Record<string, SchemaObject> = {...(schema.properties ?? {})};
	let baseClassName: string | undefined;

	for (const allOfEntry of schema.allOf ?? []) {
		if (allOfEntry.$ref) {
			baseClassName = refToClassName(allOfEntry.$ref);
			continue;
		}
		for (const [name, prop] of Object.entries(allOfEntry.properties ?? {})) {
			properties[name] = prop;
		}
		for (const name of allOfEntry.required ?? []) {
			required.add(name);
		}
	}

	return {baseClassName, properties, required};
}

function renderTsType(schema: SchemaObject): string {
	if (schema["x-webpdf-codegen"]?.enumName) {
		return new ModelName(schema["x-webpdf-codegen"].enumName).getClassName();
	}
	if (schema.$ref) {
		return refToClassName(schema.$ref);
	}
	if (schema.oneOf && schema.oneOf.length > 0) {
		return schema.oneOf.map((entry: SchemaObject): string => renderTsType(entry)).join(" | ");
	}
	if (schema.type === "array") {
		const itemType: string = schema.items ? renderTsType(schema.items) : "any";
		return `Array<${itemType}>`;
	}
	if (schema.type === "integer" || schema.type === "number") {
		return "number";
	}
	if (schema.type === "boolean") {
		return "boolean";
	}
	if (schema.type === "string") {
		return "string";
	}
	if (schema.type === "object") {
		return "any";
	}
	return "any";
}

function renderFromJsonExpression(propSchema: SchemaObject, valueExpr: string, modelLookup: Map<string, GeneratedModel>): string {
	if (propSchema.$ref) {
		const typeName: string = refToClassName(propSchema.$ref);
		const refModel: GeneratedModel | undefined = modelLookup.get(typeName);
		if (refModel?.isEnum) {
			return valueExpr;
		}
		return `${typeName}.fromJson(${valueExpr})`;
	}
	if (propSchema.type === "array") {
		const item: SchemaObject = propSchema.items ?? {};
		if (item.$ref) {
			const typeName: string = refToClassName(item.$ref);
			const refModel: GeneratedModel | undefined = modelLookup.get(typeName);
			if (refModel?.isEnum) {
				return `(${valueExpr} || [])`;
			}
			return `(${valueExpr} || []).map(${typeName}.fromJson)`;
		}
		return `(${valueExpr} || [])`;
	}
	return valueExpr;
}

function renderToJsonExpression(propSchema: SchemaObject, valueExpr: string, modelLookup: Map<string, GeneratedModel>): string {
	if (propSchema.$ref) {
		const typeName: string = refToClassName(propSchema.$ref);
		const refModel: GeneratedModel | undefined = modelLookup.get(typeName);
		if (refModel?.isEnum) {
			return valueExpr;
		}
		return `${valueExpr}?.toJson()`;
	}
	if (propSchema.type === "array") {
		const item: SchemaObject = propSchema.items ?? {};
		if (item.$ref) {
			const typeName: string = refToClassName(item.$ref);
			const refModel: GeneratedModel | undefined = modelLookup.get(typeName);
			if (refModel?.isEnum) {
				return valueExpr;
			}
			return `${valueExpr}?.map((data) => data.toJson())`;
		}
	}
	return valueExpr;
}

function buildProperties(
	schemaName: string,
	schema: SchemaObject,
	modelLookup: Map<string, GeneratedModel>,
	schemaLookup: Map<string, GeneratedModel>,
): { baseClassName?: string; properties: PropertyRender[]; discriminator?: Discriminator } {
	const {baseClassName, properties, required} = resolveObjectSchema(schema);
	const propRenders: PropertyRender[] = [];

	for (const [name, propSchema] of Object.entries(properties)) {
		const requiredProperty: boolean = required.has(name);
		const inlineSchemaName: string = toInlineModelSchemaName(schemaName, name);
		const inlineModel: GeneratedModel | undefined = schemaLookup.get(inlineSchemaName);
		const inlineItemModel: GeneratedModel | undefined =
			propSchema.type === "array" ? schemaLookup.get(inlineSchemaName) : undefined;

		let typeName: string = renderTsType(propSchema);
		if (inlineModel && propSchema.type !== "array") {
			typeName = inlineModel.className;
		} else if (inlineItemModel && propSchema.type === "array") {
			typeName = `Array<${inlineItemModel.className}>`;
		}

		const rawValueExpr: string = requiredProperty ? `data.${name}` : `data?.${name}`;
		let fromJsonExpr: string = renderFromJsonExpression(propSchema, rawValueExpr, modelLookup);
		let toJsonExpr: string = renderToJsonExpression(propSchema, `this.${name}`, modelLookup);
		if (inlineModel && propSchema.type !== "array") {
			fromJsonExpr = `${inlineModel.className}.fromJson(${rawValueExpr})`;
			toJsonExpr = `this.${name}?.toJson()`;
		} else if (inlineItemModel && propSchema.type === "array") {
			fromJsonExpr = `(${rawValueExpr} || []).map(${inlineItemModel.className}.fromJson)`;
			toJsonExpr = `this.${name}?.map((data) => data.toJson())`;
		}
		propRenders.push({
			name,
			required: requiredProperty,
			typeName,
			description: propSchema.description,
			defaultValue: propSchema.default,
			minimum: propSchema.minimum,
			maximum: propSchema.maximum,
			fromJsonExpr,
			toJsonExpr,
		});
	}

	propRenders.sort((a: PropertyRender, b: PropertyRender): number => a.name.localeCompare(b.name));
	return {baseClassName, properties: propRenders, discriminator: schema.discriminator};
}

function renderPropertyDocs(lines: string[], description?: string): void {
	if (!description || description.length === 0) {
		return;
	}
	lines.push(`${INDENT}/**`);
	for (const line of description.split(/\r?\n/)) {
		lines.push(`${INDENT}* ${line}`);
	}
	lines.push(`${INDENT}*/`);
}

function renderEnum(model: GeneratedModel): string {
	const values: string[] = model.schema.enum ?? [];
	const lines: string[] = [`export enum ${model.className} {`, ""];
	values.forEach((value: string, index: number): void => {
		const enumKey: string = toEnumMemberName(value);
		const suffix: string = index < values.length - 1 ? "," : "";
		lines.push(`${INDENT}${enumKey} = '${escapeText(value)}'${suffix}`);
	});
	lines.push("", "}");
	return `${lines.join("\n")}\n`;
}

function renderObjectModel(
	model: GeneratedModel,
	modelLookup: Map<string, GeneratedModel>,
	schemaLookup: Map<string, GeneratedModel>,
): string {
	const {
		baseClassName,
		properties,
		discriminator
	} = buildProperties(model.schemaName, model.schema, modelLookup, schemaLookup);
	const interfaceName: string = `${model.className}Interface`;
	const referencedTypes: Set<string> = new Set<string>(["Parameter"]);
	if (baseClassName) {
		referencedTypes.add(baseClassName);
		referencedTypes.add(`${baseClassName}Interface`);
	}
	if (discriminator?.mapping) {
		for (const discRef of Object.values(discriminator.mapping)) {
			referencedTypes.add(refToClassName(discRef));
		}
	}

	for (const property of properties) {
		const candidate: string = property.typeName.replace(/^Array</, "").replace(/>$/, "");
		const split: string[] = candidate.split(" | ").map((entry: string): string => entry.trim());
		for (const entry of split) {
			if (/^[A-Z][A-Za-z0-9_]*$/.test(entry)) {
				referencedTypes.add(entry);
			}
		}
	}

	referencedTypes.delete(model.className);
	referencedTypes.delete(interfaceName);
	const imports: string[] = Array.from(referencedTypes).sort((a: string, b: string): number => a.localeCompare(b));

	const lines: string[] = [];
	if (imports.length > 0) {
		lines.push("import {");
		for (const entry of imports) {
			lines.push(`${INDENT}${entry},`);
		}
		lines.push(`} from "${getRelativeIndexPath(model.fileLocation)}";`, "");
	}

	lines.push(
		`export interface ${interfaceName}${baseClassName ? ` extends ${baseClassName}Interface ` : " "} {`,
		"",
	);
	for (const property of properties) {
		renderPropertyDocs(lines, property.description);
		lines.push(`${INDENT}${property.name}${property.required ? "" : "?"}: ${property.typeName};`);
	}
	lines.push("", "}");

	lines.push(`export class ${model.className} ${baseClassName ? `extends ${baseClassName} ` : ""}implements ${interfaceName}, Parameter {`);
	for (const property of properties) {
		lines.push(`${INDENT}${property.name}${property.required ? "" : "?"}: ${property.typeName};`);
	}
	lines.push("", `${INDENT}constructor(data: any) {`);
	if (baseClassName) {
		lines.push(`${INDENT}${INDENT}super(data);`, "");
	}
	for (const property of properties) {
		if (property.defaultValue !== undefined) {
			lines.push(`${INDENT}${INDENT}const ${property.name}Default: any = ${toJsLiteral(property.defaultValue)};`);
			lines.push(
				`${INDENT}${INDENT}this.${property.name} = typeof data?.${property.name} !== "undefined" ? ${property.fromJsonExpr} : ${property.name}Default;`,
			);
			continue;
		}
		lines.push(`${INDENT}${INDENT}this.${property.name} = ${property.fromJsonExpr};`);
	}
	lines.push(`${INDENT}}`, "");

	for (const property of properties) {
		const propUc: string = ucFirst(property.name);
		if (property.defaultValue !== undefined) {
			lines.push(`${INDENT}public static get${propUc}Default(): ${property.typeName} {`);
			if (/^[A-Z][A-Za-z0-9_]*$/.test(property.typeName)) {
				lines.push(`${INDENT}${INDENT}return ${toJsLiteral(property.defaultValue)} as ${property.typeName};`);
			} else {
				lines.push(`${INDENT}${INDENT}return ${toJsLiteral(property.defaultValue)};`);
			}
			lines.push(`${INDENT}}`, "");
		}
		lines.push(`${INDENT}public static get${propUc}Description(): string {`);
		lines.push(`${INDENT}${INDENT}return "${escapeText(property.description ?? "")}";`);
		lines.push(`${INDENT}}`, "");
		if (property.minimum !== undefined) {
			lines.push(`${INDENT}public static get${propUc}Min(): number {`);
			lines.push(`${INDENT}${INDENT}return ${property.minimum};`);
			lines.push(`${INDENT}}`, "");
		}
		if (property.maximum !== undefined) {
			lines.push(`${INDENT}public static get${propUc}Max(): number {`);
			lines.push(`${INDENT}${INDENT}return ${property.maximum};`);
			lines.push(`${INDENT}}`, "");
		}
	}

	lines.push(`${INDENT}public static ${baseClassName ? "override " : ""}fromJson(data: any): ${model.className} {`);
	lines.push(`${INDENT}${INDENT}if (data === undefined || data === null) {`);
	lines.push(`${INDENT}${INDENT}${INDENT}return data;`);
	lines.push(`${INDENT}${INDENT}}`, "");

	if (discriminator?.propertyName && discriminator.mapping && Object.keys(discriminator.mapping).length > 0) {
		lines.push(`${INDENT}${INDENT}switch(data.${discriminator.propertyName}) {`);
		for (const [discValue, discRef] of Object.entries(discriminator.mapping)) {
			lines.push(`${INDENT}${INDENT}${INDENT}case '${discValue}':`);
			lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}return ${refToClassName(discRef)}.fromJson(data);`);
		}
		lines.push(`${INDENT}${INDENT}}`, "");
	}

	lines.push(`${INDENT}${INDENT}return new ${model.className}(data);`);
	lines.push(`${INDENT}}`, "");

	lines.push(`${INDENT}public ${baseClassName ? "override " : ""}toJson(): any {`);
	lines.push(`${INDENT}${INDENT}return {`);
	if (baseClassName) {
		lines.push(`${INDENT}${INDENT}${INDENT}...(super.toJson()),`);
	}
	for (const property of properties) {
		lines.push(`${INDENT}${INDENT}${INDENT}'${property.name}': ${property.toJsonExpr},`);
	}
	lines.push(`${INDENT}${INDENT}};`);
	lines.push(`${INDENT}}`, "");

	lines.push(`${INDENT}public ${baseClassName ? "override " : ""}clone(): ${model.className} {`);
	lines.push(`${INDENT}${INDENT}return ${model.className}.fromJson(this.toJson());`);
	lines.push(`${INDENT}}`, "");
	lines.push("}");
	return `${lines.join("\n")}\n`;
}

function writeGeneratedFile(baseDir: string, relativeNoExt: string, content: string): void {
	const target: string = path.resolve(baseDir, `${relativeNoExt}.ts`);
	fs.mkdirSync(path.dirname(target), {recursive: true});
	fs.writeFileSync(target, content, "utf8");
}

function writeParameterFile(baseDir: string): void {
	const content: string = [
		"export interface Parameter {",
		"",
		`${INDENT}toJson(): any;`,
		`${INDENT}clone(): any;`,
		"",
		"}",
		"",
	].join("\n");
	writeGeneratedFile(baseDir, "Parameter", content);
}

function writeIndexFile(baseDir: string, models: GeneratedModel[]): void {
	const index: Index = new Index("");
	index.add(new IndexEntry("Parameter", "Parameter", {}).addExportedTypeName("Parameter"));
	for (const model of models) {
		const meta: PortModelMeta = {};
		const baseRef: SchemaObject | undefined = model.schema.allOf?.find((entry: SchemaObject): boolean => Boolean(entry.$ref));
		if (baseRef?.$ref) {
			meta.parentClassName = refToClassName(baseRef.$ref);
		}
		const extensionExtends: string | undefined = model.schema["x-webpdf-codegen"]?.extends;
		if (extensionExtends) {
			meta.extendsName = new ModelName(extensionExtends).getClassName();
		}
		const entry: IndexEntry = new IndexEntry(model.fileLocation, model.packageLocation, meta);
		entry.addExportedTypeName(model.className);
		if (!model.isEnum) {
			entry.addExportedTypeName(`${model.className}Interface`);
		}
		index.add(entry);
	}

	index.sort();
	const lines: string[] = [];
	for (const entry of index.getOrderedEntries()) {
		const fileLocation: string = entry.getFileLocation().length === 0 ? "" : `${entry.getFileLocation()}`;
		if (entry.getExportedTypeNames().length === 1 && entry.getExportedTypeNames()[0] === "Parameter") {
			lines.push(`export * from "./${fileLocation}";`);
			continue;
		}
		lines.push(`export { ${entry.getExportedNames()} } from "./${fileLocation}";`);
	}
	writeGeneratedFile(baseDir, "index", `${lines.join("\n")}\n`);
}

/**
 * Entry point for the schema-first model generation path.
 *
 * Reads `src/codegen/resources/schema/openapi.json`, derives all schema-backed
 * models (classes and enums), collects inline enum and object sub-models, renders
 * each to a TypeScript file under `src/main/typescript/generated-sources/`, and
 * writes the aggregated `index.ts` export barrel.
 *
 * @param rootDir - Absolute path to the repository root. All derived paths are
 *   resolved relative to this directory.
 */
export function generateModels(rootDir: string): void {
	const specPath: string = path.resolve(rootDir, "src/codegen/resources/schema/openapi.json");
	const outputDir: string = path.resolve(rootDir, "src/main/typescript/generated-sources");
	const spec: OpenApiSpec = JSON.parse(fs.readFileSync(specPath, "utf8")) as OpenApiSpec;
	const schemas: Record<string, SchemaObject> = spec.components?.schemas ?? {};

	fs.rmSync(outputDir, {recursive: true, force: true});
	fs.mkdirSync(outputDir, {recursive: true});

	const inlineEnumModels: GeneratedModel[] = collectInlineEnumModels(spec);
	const inlineObjectModels: GeneratedModel[] = collectInlineObjectModels(schemas, spec);
	const models: GeneratedModel[] = [...buildGeneratedModels(schemas), ...inlineEnumModels, ...inlineObjectModels];
	const lookup: Map<string, GeneratedModel> = lookupByClassName(models);
	const schemaLookup: Map<string, GeneratedModel> = lookupBySchemaName(models);

	writeParameterFile(outputDir);
	for (const model of models) {
		const content: string = model.isEnum ? renderEnum(model) : renderObjectModel(model, lookup, schemaLookup);
		writeGeneratedFile(outputDir, model.fileLocation, content);
	}
	writeIndexFile(outputDir, models);
}
