import fs from "node:fs";
import path from "node:path";
import {ModelName} from "./ModelName";

/** Minimal OpenAPI 3.x document shape used for schema extraction. */
type OpenApiSpec = {
	components?: {
		schemas?: Record<string, unknown>;
	};
};

/** Untyped schema object from the raw OpenAPI spec — accessed via string keys throughout the adapter. */
type OpenApiSchemaObject = Record<string, unknown>;

/** The structural category of a raw OpenAPI Generator output model file. */
type RawModelKind = "enum" | "interface" | "class" | "type" | "unknown";

/** Parsed metadata for a single model file produced by the raw OpenAPI Generator. */
type RawModelDescriptor = {
	name: string;
	fileName: string;
	kind: RawModelKind;
};

/**
 * A raw model candidate that could not be unambiguously mapped to a schema target.
 * Written to `build/codegen/adapter/raw-object-candidates.json` for diagnostics.
 */
type RawObjectCandidate = {
	name: string;
	fileName: string;
	kind: RawModelKind;
	targetFile?: string;
	reasons: string[];
};

/** Extracted property metadata for a single OpenAPI schema property. */
type SchemaPropertyMeta = {
	type?: string;
	minimum?: number;
	maximum?: number;
	default?: unknown;
	hasExplicitDefault: boolean;
	description?: string;
};

/** Aggregated schema metadata for one model class — required fields and property meta. */
type SchemaModelMeta = {
	required: Set<string>;
	properties: Map<string, SchemaPropertyMeta>;
};

/** A single property parsed from a raw OpenAPI Generator interface body. */
type ParsedProperty = {
	name: string;
	optional: boolean;
	typeStr: string;
};

/** Output of {@link materializeRawModels} — written to `build/codegen/adapter/adapter-summary.json`. */
type AdapterSummary = {
	writtenExports: string[];
	missingFromRaw: string[];
	rawWithoutSchemaTarget: string[];
};

/**
 * One entry in the canonical enum mapping derived from `x-webpdf-codegen.enumName`
 * annotations across the OpenAPI schema.
 */
type CanonicalEnumMappingEntry = {
	enumName: string;
	canonicalSymbol: string;
	sharedPath: string;
	occurrences: number;
	uniqueValueVariants: number;
	values: string[];
};

/** A single file that references a canonical enum group by its generated path. */
type CanonicalEnumUsageEntry = {
	normalizedPath: string;
};

/**
 * A grouped view of all generated files that use a particular canonical enum symbol.
 * Built by {@link buildCanonicalEnumUsageGroups} and consumed by
 * {@link applyCanonicalEnumTypeNormalization} to drive file-specific import rewrites.
 */
type CanonicalEnumUsageGroup = {
	enumName: string;
	canonicalSymbol: string;
	sharedPath: string;
	values: string[];
	entries: CanonicalEnumUsageEntry[];
};

/**
 * Models that have no usable raw output from the OpenAPI Generator and no schema-first
 * path. They receive an open `[key: string]: any` placeholder class so that consumers
 * can still construct and use them at runtime without a hard compile error.
 */
const RAW_COVERAGE_PLACEHOLDER_MODELS: ReadonlySet<string> = new Set<string>([
	"Appearance",
	"Clear",
	"Decrypt",
	"FormsFlatten",
	"SelectionBackground",
	"SelectionHeaderFooter",
	"UserXml",
]);

/**
 * Generates the source text for an open-ended placeholder model class.
 * Used for models listed in {@link RAW_COVERAGE_PLACEHOLDER_MODELS} that have neither
 * a raw OpenAPI Generator output file nor a schema-first generation path.
 * The generated class accepts any properties via `[key: string]: any` and exposes the
 * standard `fromJson` / `toJson` / `clone` API expected by consumers.
 */
function buildPlaceholderModelContent(modelName: string): string {
	return [
		`export interface ${modelName}Interface {`,
		`	[key: string]: any;`,
		`}`,
		``,
		`export class ${modelName} implements ${modelName}Interface {`,
		`	[key: string]: any;`,
		``,
		`	constructor(data?: ${modelName}Interface) {`,
		`		Object.assign(this, data ?? {});`,
		`		Object.defineProperty(this, '__knownKeys__', {value: Object.freeze(new Set<string>(Object.keys(this))), enumerable: false, writable: false, configurable: false});`,
		`	}`,
		``,
		`	public static fromJson(data: any): ${modelName} {`,
		`		return new ${modelName}(data as ${modelName}Interface);`,
		`	}`,
		``,
		`	public toJson(): any {`,
		`		const keys: Set<string> = this['__knownKeys__'] as Set<string>;`,
		`		if (!keys) { return JSON.parse(JSON.stringify(this)); }`,
		`		const result: Record<string, unknown> = {};`,
		`		for (const key of keys) {`,
		`			const val: unknown = this[key];`,
		`			result[key] = Array.isArray(val) ? val.map((i: any): any => i?.toJson?.() ?? i) : (val !== null && typeof val === 'object' && typeof (val as any).toJson === 'function' ? (val as any).toJson() : val);`,
		`		}`,
		`		return JSON.parse(JSON.stringify(result));`,
		`	}`,
		``,
		`	public clone(): ${modelName} {`,
		`		return ${modelName}.fromJson(this.toJson());`,
		`	}`,
		`}`,
	].join("\n");
}

/**
 * Scans a TypeScript source string and returns the sorted list of names declared
 * with `export interface|class|enum|type`. Used to populate `exportedSymbolsByPath`
 * so the final `index.ts` barrel can enumerate the correct symbol names.
 */
function collectExportedSymbols(content: string): string[] {
	const names: Set<string> = new Set<string>();
	const regex: RegExp = /export\s+(?:interface|class|enum|type)\s+([A-Za-z0-9_]+)/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		if (match[1]) {
			names.add(match[1]);
		}
	}
	return Array.from(names).sort((a: string, b: string): number => a.localeCompare(b));
}

function buildSchemaModelMetaMap(rootDir: string): Map<string, SchemaModelMeta> {
	const specPath: string = path.resolve(rootDir, "src/codegen/resources/schema/openapi.json");
	const spec: OpenApiSpec = JSON.parse(fs.readFileSync(specPath, "utf8")) as OpenApiSpec;
	const schemas: Record<string, unknown> = (spec.components?.schemas ?? {}) as Record<string, unknown>;
	const result: Map<string, SchemaModelMeta> = new Map<string, SchemaModelMeta>();

	/**
	 * Extracts and registers a SchemaModelMeta for the given schema key/object.
	 * Returns the parsed raw properties for optional inline-object traversal by the caller.
	 */
	function registerSchema(schemaKey: string, schemaObj: Record<string, unknown>): Record<string, unknown> {
		const className: string = new ModelName(schemaKey).getClassName();
		const requiredArr: string[] = (schemaObj["required"] as string[] | undefined) ?? [];
		const required: Set<string> = new Set<string>(requiredArr);
		const rawProperties: Record<string, unknown> = (schemaObj["properties"] ?? {}) as Record<string, unknown>;
		const properties: Map<string, SchemaPropertyMeta> = new Map<string, SchemaPropertyMeta>();

		for (const [propName, propDef] of Object.entries(rawProperties)) {
			const propObj: Record<string, unknown> = propDef as Record<string, unknown>;

			// Resolve $ref default: when a property is a pure $ref with no inline default,
			// look up the referenced schema and propagate its default value and type.
			// This mirrors the v10 Java generator's postProcessAllCodegenModels behaviour which
			// called propertyExtensions.setDefaultValue(refModelExtensions.getDefaultValue())
			// for enum references, ensuring that getModeDefault() etc. are generated for
			// properties whose type is a $ref-only enum schema.
			let propType: string | undefined = propObj["type"] as string | undefined;
			let propDefault: unknown = propObj["default"];
			let hasPropDefault: boolean = "default" in propObj;
			if (!hasPropDefault && typeof propObj["$ref"] === "string") {
				const refKey: string = (propObj["$ref"] as string).replace("#/components/schemas/", "");
				const refSchema: Record<string, unknown> | undefined =
					schemas[refKey] as Record<string, unknown> | undefined;
				if (refSchema !== undefined && "default" in refSchema) {
					propDefault = refSchema["default"];
					hasPropDefault = true;
				}
				if (propType === undefined && typeof refSchema?.["type"] === "string") {
					propType = refSchema["type"] as string;
				}
			}

			properties.set(propName, {
				type: propType,
				minimum: propObj["minimum"] as number | undefined,
				maximum: propObj["maximum"] as number | undefined,
				default: propDefault,
				hasExplicitDefault: hasPropDefault,
				description: propObj["description"] as string | undefined,
			});
		}

		result.set(className, {required, properties});
		return rawProperties;
	}

	for (const [schemaName, schemaDef] of Object.entries(schemas)) {
		const rawProperties: Record<string, unknown> = registerSchema(schemaName, schemaDef as Record<string, unknown>);

		// Also register inline nested object schemas (one level deep).
		// These are properties of type "object" with their own "properties" block.
		// The compound key "{parentSchemaName}_{CapitalizedPropName}" matches what ModelName
		// produces for the generated class name (e.g. Operation_SubmitFormAction_SubmitForm
		// → SubmitFormActionSubmitForm). Direct schema entries always take precedence.
		for (const [propName, propDef] of Object.entries(rawProperties)) {
			const propObj: Record<string, unknown> = propDef as Record<string, unknown>;
			if (propObj["type"] === "object" && propObj["properties"]) {
				const nestedSchemaName: string =
					`${schemaName}_${propName.charAt(0).toUpperCase()}${propName.slice(1)}`;
				const nestedClassName: string = new ModelName(nestedSchemaName).getClassName();
				if (!result.has(nestedClassName)) {
					registerSchema(nestedSchemaName, propObj);
				}
			}
		}
	}

	return result;
}

/**
 * Extracts the typed property list from the `export interface <interfaceName>` body
 * inside a raw OpenAPI Generator output file.
 * Returns an empty array when the interface is not found or has no properties.
 */
function parseRawInterfaceProperties(content: string, interfaceName: string): ParsedProperty[] {
	const escapedName: string = interfaceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	// Multi-line first: require \n before closing } so nested braces in type annotations don't terminate early
	let interfaceMatch: RegExpMatchArray | null = content.match(
		new RegExp(`export\\s+interface\\s+${escapedName}\\s*\\{([\\s\\S]*?)\\n\\}`),
	);
	// Fallback for single-line interfaces where no nested {} appear in property types
	if (!interfaceMatch?.[1]) {
		interfaceMatch = content.match(
			new RegExp(`export\\s+interface\\s+${escapedName}\\s*\\{([^}]*)\\}`),
		);
	}
	if (!interfaceMatch?.[1]) {
		return [];
	}
	const body: string = interfaceMatch[1];
	const props: ParsedProperty[] = [];
	const propRegex: RegExp = /^\s*(?:readonly\s+)?['"]?([a-zA-Z0-9_]+)['"]?\s*(\?)?\s*:\s*(.+?)\s*;?\s*$/gm;
	let match: RegExpExecArray | null;
	while ((match = propRegex.exec(body)) !== null) {
		const name: string | undefined = match[1];
		const typeStr: string | undefined = match[3];
		if (name && typeStr && !/^[\s/*]/.test(typeStr)) {
			props.push({name, optional: !!match[2], typeStr: typeStr.trim()});
		}
	}
	return props;
}

/**
 * Returns the index of the `}` that closes the `{` at `openPos` in `content`,
 * accounting for arbitrary nesting depth.
 * Returns `content.length - 1` when no matching closing brace is found.
 */
function findMatchingBrace(content: string, openPos: number): number {
	let depth: number = 0;
	for (let i: number = openPos; i < content.length; i++) {
		if (content[i] === "{") {
			depth++;
		} else if (content[i] === "}") {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}
	return content.length - 1;
}

/** Maps an OpenAPI primitive type string to its TypeScript equivalent (`integer` → `number`). */
function tsTypeFor(schemaType: string): string {
	return schemaType === "integer" ? "number" : schemaType;
}

/**
 * Serializes a schema default value to a TypeScript literal string suitable for
 * embedding in a generated source file (e.g. `"xml"`, `false`, `42`).
 */
function serializeSchemaDefault(value: unknown, schemaType?: string): string {
	if (schemaType === "string") {
		return `"${String(value).replace(/"/g, '\\"')}"`;
	}
	if (schemaType === "boolean") {
		return String(Boolean(value));
	}
	if (schemaType === "integer" || schemaType === "number") {
		return String(Number(value));
	}
	return JSON.stringify(value);
}

/**
 * Promotes `import type { X }` declarations to value imports `import { X }` for each
 * symbol in `symbolNames`. Required when a class is referenced at runtime (e.g. in a
 * `.fromJson()` call inside `.map()`) and a type-only import would be erased by the
 * TypeScript compiler.
 */
function rewriteTypeImportsToValue(content: string, symbolNames: Set<string>): string {
	let result: string = content;
	for (const sym of symbolNames) {
		const escapedSym: string = sym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		result = result.replace(
			new RegExp(`import\\s+type\\s+(\\{[^}]*\\b${escapedSym}\\b[^}]*\\})`, "g"),
			"import $1",
		);
	}
	return result;
}

/**
 * Transforms a raw OpenAPI Generator interface file into the full adapter class model.
 *
 * For each `export interface <modelName>` found in `content`, this function:
 * - Renames the interface to `<modelName>Interface`
 * - Emits a companion `export class <modelName> implements <modelName>Interface` with:
 *   - A typed constructor that applies schema defaults, hydrates nested class properties
 *     via `fromJson`, and initialises `Array<ClassName>` properties to `[]`
 *   - Static `fromJson` / `toJson` / `clone` methods
 *   - Static `getXxxDefault()` and `getXxxDescription()` accessors derived from `schemaMeta`
 *
 * Properties whose type appears in `interfaceClassNames` receive `fromJson`/`toJson`
 * cascade handling. `Array<ClassName>` element types are tracked separately in
 * `arrayItemClassSymbols` so that `import type` declarations are promoted to value
 * imports and element hydration via `.map(ClassName.fromJson)` is generated correctly.
 *
 * Returns the original `content` unchanged when no matching interface is found.
 */
function transformToClassModel(
	content: string,
	modelName: string,
	schemaMeta: SchemaModelMeta | undefined,
	interfaceClassNames: Set<string>,
): string {
	const props: ParsedProperty[] = parseRawInterfaceProperties(content, modelName);
	if (props.length === 0) {
		return content;
	}

	const escapedName: string = modelName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const interfaceStart: number = content.search(new RegExp(`export\\s+interface\\s+${escapedName}\\b`));
	if (interfaceStart === -1) {
		return content;
	}

	const openBrace: number = content.indexOf("{", interfaceStart);
	if (openBrace === -1) {
		return content;
	}

	const closeBrace: number = findMatchingBrace(content, openBrace);
	const interfaceDecl: string = content.slice(interfaceStart, closeBrace + 1);
	const afterInterface: string = content.slice(closeBrace + 1);
	const header: string = content.slice(0, interfaceStart);

	const interfaceDeclRenamed: string = interfaceDecl.replace(
		new RegExp(`export\\s+interface\\s+${escapedName}\\b`),
		`export interface ${modelName}Interface`,
	);

	const modelClassSymbols: Set<string> = new Set<string>();
	// Classes that appear as the element type of Array<ClassName> properties. These need
	// runtime imports (for fromJson calls inside .map()) and fromJson-based hydration.
	const arrayItemClassSymbols: Set<string> = new Set<string>();
	for (const prop of props) {
		// Include both optional and required class-typed properties so that fromJson/toJson
		// are used consistently. Previously only optional props were included, causing required
		// class-typed properties (e.g. FormsImport.data: FormsFileData) to use a raw `as` cast
		// that bypassed fromJson stripping and left the toJson output unfiltered.
		if (interfaceClassNames.has(prop.typeStr)) {
			modelClassSymbols.add(prop.typeStr);
		}
		// Array<ClassName> properties: extract the element class and register it separately
		// so the constructor can hydrate elements and the import can be promoted to a value import.
		if (prop.typeStr.startsWith("Array<")) {
			const itemMatch: RegExpMatchArray | null = prop.typeStr.match(/^Array<(.+)>$/);
			const itemType: string | undefined = itemMatch?.[1];
			if (itemType && interfaceClassNames.has(itemType)) {
				arrayItemClassSymbols.add(itemType);
			}
		}
	}

	// Both direct model classes and array-item classes need runtime (value) imports because
	// they are called as functions: ClassName.fromJson(...).
	const allValueSymbols: Set<string> = new Set<string>([...modelClassSymbols, ...arrayItemClassSymbols]);
	const transformedHeader: string = rewriteTypeImportsToValue(header, allValueSymbols);

	const propDecls: string[] = props.map(
		(prop: ParsedProperty): string => `\t'${prop.name}'${prop.optional ? "?" : ""}: ${prop.typeStr};`,
	);

	const assignments: string[] = [];
	for (const prop of props) {
		const schemaProp: SchemaPropertyMeta | undefined = schemaMeta?.properties.get(prop.name);
		if (modelClassSymbols.has(prop.typeStr)) {
			assignments.push(`\t\tthis['${prop.name}'] = ${prop.typeStr}.fromJson(data?.['${prop.name}']);`);
		} else if (prop.optional && schemaProp?.hasExplicitDefault && schemaProp.type !== undefined) {
			const primitiveType: string = tsTypeFor(schemaProp.type);
			// Apply the schema default whenever the schema type is a primitive (string/boolean/number).
			// We intentionally do NOT require prop.typeStr === primitiveType here, because enum
			// properties have a TypeScript type like "GlobalKeystoreFormat" even though the schema
			// declares them as type "string". The default value (e.g. "NONE") is still valid for
			// the enum type, so the constructor assignment is correct regardless of the TS type name.
			const isPrimitive: boolean = ["number", "boolean", "string"].includes(primitiveType);
			if (isPrimitive) {
				const defVal: string = serializeSchemaDefault(schemaProp.default, schemaProp.type);
				// When the TS type is an enum (e.g. GlobalKeystoreFormat) but the schema type is
				// "string", a bare string literal like "NONE" is not directly assignable to the
				// enum type. Add an explicit cast to avoid TS2322.
				const castSuffix: string = prop.typeStr !== primitiveType ? ` as ${prop.typeStr}` : "";
				assignments.push(
					`\t\tthis['${prop.name}'] = data?.['${prop.name}'] !== undefined ? data?.['${prop.name}'] : ${defVal}${castSuffix};`,
				);
			} else {
				assignments.push(`\t\tthis['${prop.name}'] = data?.['${prop.name}'];`);
			}
		} else if (!prop.optional && prop.typeStr === "number") {
			assignments.push(`\t\tthis['${prop.name}'] = data?.['${prop.name}'] ?? 0;`);
		} else if (!prop.optional && prop.typeStr === "string") {
			assignments.push(`\t\tthis['${prop.name}'] = data?.['${prop.name}'] ?? "";`);
		} else if (!prop.optional && prop.typeStr === "boolean") {
			assignments.push(`\t\tthis['${prop.name}'] = data?.['${prop.name}'] ?? false;`);
		} else if (!prop.optional) {
			assignments.push(`\t\tthis['${prop.name}'] = data?.['${prop.name}'] as ${prop.typeStr};`);
		} else if (prop.typeStr.startsWith("Array<")) {
			// Arrays whose element type is a model class are hydrated via fromJson and
			// default to [] so consumers never see undefined (mirrors v10 behaviour:
			// `(data.prop || []).map(...)`).
			// Arrays of primitive / untyped elements keep the plain optional-chaining
			// assignment so that absent optional properties stay undefined in the instance,
			// consistent with the general optional-property convention.
			const itemMatch: RegExpMatchArray | null = prop.typeStr.match(/^Array<(.+)>$/);
			const itemType: string | undefined = itemMatch?.[1];
			if (itemType && arrayItemClassSymbols.has(itemType)) {
				assignments.push(
					`\t\tthis['${prop.name}'] = (data?.['${prop.name}'] ?? []).map((item: any): ${itemType} => ${itemType}.fromJson(item));`,
				);
			} else {
				assignments.push(`\t\tthis['${prop.name}'] = data?.['${prop.name}'];`);
			}
		} else {
			assignments.push(`\t\tthis['${prop.name}'] = data?.['${prop.name}'];`);
		}
	}

	const staticMethods: string[] = [];
	for (const prop of props) {
		const schemaProp: SchemaPropertyMeta | undefined = schemaMeta?.properties.get(prop.name);
		if (!schemaProp) {
			continue;
		}
		const capName: string = prop.name.charAt(0).toUpperCase() + prop.name.slice(1);
		if (schemaProp.minimum !== undefined) {
			staticMethods.push(`\tpublic static get${capName}Min(): number { return ${schemaProp.minimum}; }`);
		}
		if (schemaProp.maximum !== undefined) {
			staticMethods.push(`\tpublic static get${capName}Max(): number { return ${schemaProp.maximum}; }`);
		}
		if (schemaProp.hasExplicitDefault && schemaProp.type !== undefined) {
			const returnType: string = tsTypeFor(schemaProp.type);
			if (returnType === "number" || returnType === "boolean" || returnType === "string") {
				const defVal: string = serializeSchemaDefault(schemaProp.default, schemaProp.type);
				// Use prop.typeStr (the actual TS type) as the return type so that enum properties
				// (e.g. DocMdp, MetadataFormsFormat) yield their enum type, not a bare "string".
				// Mirrors the castSuffix logic in the constructor assignments.
				const actualReturnType: string = prop.typeStr !== returnType ? prop.typeStr : returnType;
				const castSuffix: string = prop.typeStr !== returnType ? ` as ${prop.typeStr}` : "";
				staticMethods.push(`\tpublic static get${capName}Default(): ${actualReturnType} { return ${defVal}${castSuffix}; }`);
			}
		}
		// Array-typed properties get a getXxxDefault() returning [] so consumers can
		// access the canonical empty default without constructing an instance. This
		// mirrors the pattern already generated by buildSchemaFirstClassModel for
		// schema-first (admin) models and aligns with the v10 Java generator behaviour.
		if (schemaProp.type === "array" && prop.typeStr.startsWith("Array<")) {
			staticMethods.push(`\tpublic static get${capName}Default(): ${prop.typeStr} { return []; }`);
		}
		// Dictionary/map-typed properties (type: "object" with additionalProperties) get a
		// getXxxDefault() returning {} by the same convention — consumers can retrieve the
		// canonical empty map without constructing an instance (e.g. MetadataImageEntry.getMetadataDefault()).
		if (schemaProp.type === "object" && prop.typeStr.startsWith("{ [key:")) {
			staticMethods.push(`\tpublic static get${capName}Default(): ${prop.typeStr} { return {}; }`);
		}
		if (schemaProp?.description) {
			const escaped: string = schemaProp.description
				.replace(/\\/g, "\\\\")
				.replace(/"/g, '\\"')
				.replace(/\r\n/g, "\\n")
				.replace(/\n/g, "\\n")
				.replace(/\r/g, "\\n");
			staticMethods.push(`\tpublic static get${capName}Description(): string { return "${escaped}"; }`);
		} else {
			staticMethods.push(`\tpublic static get${capName}Description(): string { return ""; }`);
		}
	}

	// Generate toJson() with an explicit property dictionary so that properties added
	// by consumer subclasses are not included in the serialized output.
	// - Class-typed properties (modelClassSymbols) call ?.toJson() so the filter applies recursively.
	// - Array<ClassName> properties (arrayItemClassSymbols) always serialize as an array (never
	//   undefined) and pass each element through ?.toJson?.() ?? item so class instances are
	//   filtered through their own schema-only toJson(). `?? []` mirrors the constructor default.
	// - All other array properties use optional-chaining map so absent optional properties stay
	//   absent in the serialized output (no coercion to []).
	// - All other properties are included as-is.
	const toJsonEntries: string[] = props.map((prop: ParsedProperty): string => {
		if (modelClassSymbols.has(prop.typeStr)) {
			return `\t\t\t'${prop.name}': this['${prop.name}']?.toJson(),`;
		}
		if (prop.typeStr.startsWith("Array<")) {
			const itemMatch: RegExpMatchArray | null = prop.typeStr.match(/^Array<(.+)>$/);
			const itemType: string | undefined = itemMatch?.[1];
			if (itemType && arrayItemClassSymbols.has(itemType)) {
				// Class-element arrays: always emit an array (never undefined), hydrate via toJson().
				return `\t\t\t'${prop.name}': (this['${prop.name}'] ?? []).map((item: any): any => item?.toJson?.() ?? item),`;
			}
			// Non-class arrays: preserve ?.map so absent optional props stay absent in JSON.
			return `\t\t\t'${prop.name}': this['${prop.name}']?.map((item: any): any => item?.toJson?.() ?? item),`;
		}
		return `\t\t\t'${prop.name}': this['${prop.name}'],`;
	});

	const classLines: string[] = [
		``,
		`export class ${modelName} implements ${modelName}Interface {`,
		...propDecls,
		``,
		`\tconstructor(data?: ${modelName}Interface) {`,
		...assignments,
		`\t}`,
		``,
		`\tpublic static fromJson(data: any): ${modelName} {`,
		`\t\tif (data === undefined || data === null) {`,
		`\t\t\treturn data;`,
		`\t\t}`,
		``,
		`\t\treturn new ${modelName}(data);`,
		`\t}`,
		``,
		`\tpublic toJson(): any {`,
		`\t\treturn JSON.parse(JSON.stringify({`,
		...toJsonEntries,
		`\t\t}));`,
		`\t}`,
		``,
		`\tpublic clone(): ${modelName} {`,
		`\t\treturn ${modelName}.fromJson(this.toJson());`,
		`\t}`,
		...(staticMethods.length > 0 ? [``, ...staticMethods] : []),
		`}`,
	];

	return `${transformedHeader}${interfaceDeclRenamed}${classLines.join("\n")}\n${afterInterface}`;
}

/**
 * Strips the package prefix from a schema enum name (e.g. `Operation_DrawMode` → `DrawMode`).
 * The prefix is the first `_`-delimited segment; remaining segments are joined and PascalCased.
 * Names without an underscore are returned unchanged.
 */
function strippedEnumClassName(enumName: string): string {
	const parts: string[] = enumName.split("_");
	if (parts.length <= 1) {
		return enumName;
	}
	return parts
		.slice(1)
		.join("_")
		.split("_")
		.map((p: string): string => p.charAt(0).toUpperCase() + p.slice(1))
		.join("");
}

/**
 * Rewrites enum member keys in all `export enum` declarations found in `content`
 * to the canonical form produced by {@link enumValueToMemberKey}.
 * This normalizes raw generator output where member keys may differ from the values
 * (e.g. all-caps keys for camelCase values).
 */
function convertProperEnumMemberNames(content: string): string {
	return content.replace(
		/export\s+enum\s+([A-Za-z0-9_]+)\s*\{([^}]+)\}/g,
		(_full: string, enumName: string, body: string): string => {
			const convertedBody: string = body.replace(
				/(\s+)([A-Za-z0-9_]+)(\s*=\s*'([^']+)',?)/g,
				(_m: string, ws: string, _key: string, rest: string, value: string): string => {
					return `${ws}${enumValueToMemberKey(value)}${rest}`;
				},
			);
			return `export enum ${enumName} {${convertedBody}}`;
		},
	);
}

/**
 * Converts the `export const X = { … } as const; export type X = typeof X[keyof typeof X];`
 * pattern emitted by the raw OpenAPI Generator into a standard `export enum X { … }`.
 * Member keys are normalised via {@link enumValueToMemberKey}.
 * Blocks where no key/value pairs can be parsed are left unchanged.
 */
function convertConstEnumPatternToEnum(content: string): string {
	const enumBlockPattern: RegExp = /export const ([A-Za-z0-9_]+)\s*=\s*\{([\s\S]*?)\}\s+as const;\s*[\r\n]+export type \1 = typeof \1\[keyof typeof \1\];/g;
	return content.replace(enumBlockPattern, (_full: string, enumName: string, body: string): string => {
		const members: string[] = [];
		const pairPattern: RegExp = /([A-Za-z0-9_]+)\s*:\s*'([^']+)'/g;
		let pair: RegExpExecArray | null;
		while ((pair = pairPattern.exec(body)) !== null) {
			const key: string | undefined = pair[1];
			const value: string | undefined = pair[2];
			if (!key || value == null) {
				continue;
			}
			members.push(`    ${enumValueToMemberKey(value)} = '${value}',`);
		}
		if (members.length === 0) {
			return _full;
		}
		return `export enum ${enumName} {\n${members.join("\n")}\n}`;
	});
}

/**
 * Removes any remaining `export const X = { … } as const;` blocks from `content`.
 * Called after {@link convertConstEnumPatternToEnum} to strip const-enum objects that
 * were not matched by the full `const + type` pattern (e.g. orphaned const blocks).
 */
function removeConstEnumObjectDeclarations(content: string): string {
	const constEnumObjectPattern: RegExp = /\n?export\s+const\s+[A-Za-z0-9_]+\s*=\s*\{[\s\S]*?\}\s+as\s+const;\s*\n?/g;
	return content.replace(constEnumObjectPattern, "\n");
}

/**
 * Transforms a raw `export type <modelName> = <rhs>` declaration into a runtime class.
 *
 * Two paths are taken depending on the right-hand side:
 * - **Const-enum alias** (`typeof X[keyof typeof X]`): converted to a proper
 *   `export enum <modelName>` using the source `const` object's key/value pairs.
 * - **Object/union alias**: expanded into an open `[key: string]: any` class with
 *   `fromJson` / `toJson` / `clone` methods and `__knownKeys__` tracking so that
 *   subclass properties are excluded from serialized output.
 *
 * The original `export type` alias declaration is replaced or removed in both cases.
 */
function transformTypeAliasModel(content: string, modelName: string): string {
	const aliasPattern: RegExp = new RegExp(`export\\s+type\\s+${modelName}\\s*=\\s*([^;]+);`);
	const match: RegExpMatchArray | null = content.match(aliasPattern);
	if (!match || !match[1]) {
		return content;
	}
	const rhs: string = match[1].trim();
	const enumAliasPattern: RegExp = /^typeof\s+([A-Za-z0-9_]+)\[keyof\s+typeof\s+\1\]$/;
	const enumAliasMatch: RegExpMatchArray | null = rhs.match(enumAliasPattern);
	if (enumAliasMatch && enumAliasMatch[1]) {
		const sourceConstName: string = enumAliasMatch[1];
		const constPattern: RegExp = new RegExp(`export\\s+const\\s+${sourceConstName}\\s*=\\s*\\{([\\s\\S]*?)\\}\\s+as\\s+const;`);
		const constMatch: RegExpMatchArray | null = content.match(constPattern);
		if (constMatch && constMatch[1]) {
			const members: string[] = [];
			const pairPattern: RegExp = /([A-Za-z0-9_]+)\s*:\s*'([^']+)'/g;
			let pair: RegExpExecArray | null;
			while ((pair = pairPattern.exec(constMatch[1])) !== null) {
				const value: string | undefined = pair[2];
				if (!value) {
					continue;
				}
				members.push(`\t${enumValueToMemberKey(value)} = '${value}',`);
			}
			if (members.length > 0) {
				const withoutAlias: string = content.replace(aliasPattern, "");
				const enumDecl: string = `export enum ${modelName} {\n${members.join("\n")}\n}\n`;
				return `${withoutAlias}${withoutAlias.endsWith("\n") ? "" : "\n"}\n${enumDecl}`;
			}
		}
	}
	const withoutAlias: string = content.replace(aliasPattern, `type ${modelName}Type = ${rhs};`);
	const runtimeModel: string = [
		`export interface ${modelName}Interface {`,
		`\t[key: string]: any;`,
		`}`,
		``,
		`export class ${modelName} implements ${modelName}Interface {`,
		`\t[key: string]: any;`,
		``,
		`\tconstructor(data?: ${modelName}Type) {`,
		`\t\tObject.assign(this, data ?? {});`,
		`\t\t// Capture data keys at construction time so toJson() can exclude properties`,
		`\t\t// added by consumer subclasses. Non-enumerable so it is invisible to JSON.stringify.`,
		`\t\tObject.defineProperty(this, '__knownKeys__', {value: Object.freeze(new Set<string>(Object.keys(this))), enumerable: false, writable: false, configurable: false});`,
		`\t}`,
		``,
		`\tpublic static fromJson(data: any): ${modelName} {`,
		`\t\treturn new ${modelName}(data);`,
		`\t}`,
		``,
		`\tpublic static toJson(data: ${modelName}Type): any {`,
		`\t\treturn data;`,
		`\t}`,
		``,
		`\tpublic static clone(data: ${modelName}Type): ${modelName} {`,
		`\t\treturn new ${modelName}(data);`,
		`\t}`,
		``,
		`\tpublic toJson(): any {`,
		`\t\tconst keys: Set<string> = this['__knownKeys__'] as Set<string>;`,
		`\t\tif (!keys) { return JSON.parse(JSON.stringify(this)); }`,
		`\t\tconst result: Record<string, unknown> = {};`,
		`\t\tfor (const key of keys) {`,
		`\t\t\tconst val: unknown = this[key];`,
		`\t\t\t// Call toJson() on nested class instances so their own schema-only filter applies.`,
		`\t\t\tresult[key] = Array.isArray(val) ? val.map((i: any): any => i?.toJson?.() ?? i) : (val !== null && typeof val === 'object' && typeof (val as any).toJson === 'function' ? (val as any).toJson() : val);`,
		`\t\t}`,
		`\t\treturn JSON.parse(JSON.stringify(result));`,
		`\t}`,
		``,
		`\tpublic clone(): ${modelName} {`,
		`\t\treturn ${modelName}.fromJson(this.toJson());`,
		`\t}`,
		`}`,
	].join("\n");
	return `${withoutAlias}${withoutAlias.endsWith("\n") ? "" : "\n"}\n${runtimeModel}\n`;
}

/**
 * Writes the `Parameter.ts` marker interface to `generatedBaseDir`.
 * All generated model classes implement this interface so consumers can use
 * `Parameter` as a structural type constraint for the `toJson()` contract.
 */
function writeParameterModel(generatedBaseDir: string): void {
	const filePath: string = path.resolve(generatedBaseDir, "Parameter.ts");
	const content: string = [
		"export interface Parameter {",
		"\ttoJson(): any;",
		"\tclone(): any;",
		"}",
		"",
	].join("\n");
	fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Builds a map of `className → rawSchemaObject` for every schema in the OpenAPI spec.
 * Class names are derived via {@link ModelName} from their schema name.
 */
function getClassNameToSchemaObject(rootDir: string): Map<string, OpenApiSchemaObject> {
	const specPath: string = path.resolve(rootDir, "src/codegen/resources/schema/openapi.json");
	const spec: OpenApiSpec = JSON.parse(fs.readFileSync(specPath, "utf8")) as OpenApiSpec;
	const schemas: Record<string, unknown> = (spec.components?.schemas ?? {}) as Record<string, unknown>;
	const map: Map<string, OpenApiSchemaObject> = new Map<string, OpenApiSchemaObject>();
	for (const [schemaName, schemaDef] of Object.entries(schemas)) {
		const className: string = new ModelName(schemaName).getClassName();
		map.set(className, (schemaDef ?? {}) as OpenApiSchemaObject);
	}
	return map;
}

/**
 * Builds a map of `inlineSchemaName → schemaObject` for every `multipart/form-data`
 * request body inline schema found in `paths.*.<method>.requestBody.content`.
 * Used to generate multipart body model classes (e.g. `DocumentsBody`).
 */
function getRequestBodySchemaMap(rootDir: string): Map<string, OpenApiSchemaObject> {
	const specPath: string = path.resolve(rootDir, "src/codegen/resources/schema/openapi.json");
	const spec: OpenApiSpec & { paths?: Record<string, Record<string, OpenApiSchemaObject>> } =
		JSON.parse(fs.readFileSync(specPath, "utf8")) as OpenApiSpec & { paths?: Record<string, Record<string, OpenApiSchemaObject>> };
	const result: Map<string, OpenApiSchemaObject> = new Map<string, OpenApiSchemaObject>();
	const addMultipartSchema: (className: string, route: string, method: string) => void = (className: string, route: string, method: string): void => {
		const routeItem: Record<string, unknown> | undefined = spec.paths?.[route] as Record<string, unknown> | undefined;
		const methodItem: Record<string, unknown> | undefined = routeItem?.[method] as Record<string, unknown> | undefined;
		const requestBody: Record<string, unknown> | undefined = methodItem?.["requestBody"] as Record<string, unknown> | undefined;
		const content: Record<string, unknown> | undefined = requestBody?.["content"] as Record<string, unknown> | undefined;
		const multipart: Record<string, unknown> | undefined = content?.["multipart/form-data"] as Record<string, unknown> | undefined;
		const schema: OpenApiSchemaObject | undefined = multipart?.["schema"] as OpenApiSchemaObject | undefined;
		if (schema) {
			result.set(className, schema);
		}
	};
	addMultipartSchema("DocumentsBody", "/documents", "post");
	addMultipartSchema("DocumentsDocumentIdBody", "/documents/{documentId}", "put");
	return result;
}

/**
 * Resolves a `$ref` string (e.g. `#/components/schemas/Operation_Toolbox`) to the
 * corresponding generated class name (e.g. `Toolbox`) via {@link ModelName}.
 */
function resolveRefClassName(ref: string): string {
	const schemaName: string = ref.replace("#/components/schemas/", "");
	return new ModelName(schemaName).getClassName();
}

/** Fully resolved property descriptor produced by {@link resolveSchemaProperties} for schema-first models. */
type SchemaResolvedProperty = {
	name: string;
	typeStr: string;
	required: boolean;
	description?: string;
	defaultValue?: unknown;
	isArrayOfRef: boolean;
	refClassName?: string;
	isMapOfRef: boolean;
};

/**
 * Resolves all `properties` entries of a schema object to typed {@link SchemaResolvedProperty}
 * descriptors, handling `$ref`, array, map (`additionalProperties`), and primitive types.
 */
function resolveSchemaProperties(schemaObj: OpenApiSchemaObject): SchemaResolvedProperty[] {
	const required: Set<string> = new Set<string>(((schemaObj["required"] ?? []) as string[]));
	const props: Record<string, unknown> = ((schemaObj["properties"] ?? {}) as Record<string, unknown>);
	const out: SchemaResolvedProperty[] = [];
	for (const [name, raw] of Object.entries(props)) {
		const p: OpenApiSchemaObject = (raw ?? {}) as OpenApiSchemaObject;
		const description: string | undefined = p["description"] as string | undefined;
		const defaultValue: unknown = p["default"];
		const directRef: string | undefined = p["$ref"] as string | undefined;
		if (directRef) {
			const refClassName: string = resolveRefClassName(directRef);
			out.push({name, typeStr: refClassName, required: required.has(name), description, defaultValue, isArrayOfRef: false, refClassName, isMapOfRef: false});
			continue;
		}
		const type: string | undefined = p["type"] as string | undefined;
		if (type === "array") {
			const items: OpenApiSchemaObject = (p["items"] ?? {}) as OpenApiSchemaObject;
			const itemsRef: string | undefined = items["$ref"] as string | undefined;
			if (itemsRef) {
				const itemClass: string = resolveRefClassName(itemsRef);
				out.push({name, typeStr: `Array<${itemClass}>`, required: required.has(name), description, defaultValue, isArrayOfRef: true, refClassName: itemClass, isMapOfRef: false});
				continue;
			}
			const itemType: string = (items["type"] as string | undefined) ?? "any";
			const tsItemType: string = itemType === "integer" ? "number" : itemType;
			out.push({name, typeStr: `Array<${tsItemType}>`, required: required.has(name), description, defaultValue, isArrayOfRef: false, isMapOfRef: false});
			continue;
		}
		if (type === "object") {
			const additionalProps: OpenApiSchemaObject = (p["additionalProperties"] ?? {}) as OpenApiSchemaObject;
			const addRef: string | undefined = additionalProps["$ref"] as string | undefined;
			if (addRef) {
				const refClassName: string = resolveRefClassName(addRef);
				out.push({name, typeStr: `{ [key: string]: ${refClassName}; }`, required: required.has(name), description, defaultValue, isArrayOfRef: false, refClassName, isMapOfRef: true});
				continue;
			}
			out.push({name, typeStr: "any", required: required.has(name), description, defaultValue, isArrayOfRef: false, isMapOfRef: false});
			continue;
		}
		const tsType: string = type === "integer" ? "number" : (type ?? "any");
		out.push({name, typeStr: tsType, required: required.has(name), description, defaultValue, isArrayOfRef: false, isMapOfRef: false});
	}
	return out;
}

/**
 * Generates the TypeScript source for a schema-first model class — bypassing the raw
 * OpenAPI Generator file for models that can be derived entirely from the schema definition.
 *
 * Produces a full `interface` + `class` pair with constructor, `fromJson`, `toJson`,
 * `clone`, and static `getXxxDefault` / `getXxxDescription` / `getXxxMin` / `getXxxMax`
 * accessors. Returns `undefined` when the schema is ineligible (enum, non-object,
 * or a model that requires the raw path such as `Info`/`InfoForm`).
 *
 * @param expectedName   - The generated class name (e.g. `ApplicationConfiguration`).
 * @param targetNoExt    - The output file path without extension, relative to the generated-sources root.
 * @param schemaObj      - The raw OpenAPI schema object for this model.
 * @param enumClassNames - Set of class names that are enums, used to skip enum-typed ref
 *   properties from the `fromJson` hydration path.
 * @param classToPath    - Full class-to-path map, used for import path resolution.
 */
function buildSchemaFirstClassModel(
	expectedName: string,
	targetNoExt: string,
	schemaObj: OpenApiSchemaObject,
	enumClassNames: Set<string>,
	classToPath: Map<string, string>,
): string | undefined {
	if (expectedName === "Info" || expectedName === "InfoForm") {
		return undefined;
	}
	// Enum and primitive alias schemas must stay on the raw->enum/type path.
	const schemaEnum: unknown = schemaObj["enum"];
	if (Array.isArray(schemaEnum) && schemaEnum.length > 0) {
		return undefined;
	}
	const schemaType: string | undefined = schemaObj["type"] as string | undefined;
	if (schemaType !== undefined && schemaType !== "object") {
		return undefined;
	}
	const allOf: OpenApiSchemaObject[] = ((schemaObj["allOf"] ?? []) as OpenApiSchemaObject[]);
	const baseRef: string | undefined = (allOf[0]?.["$ref"] as string | undefined);
	const baseClassName: string | undefined = baseRef ? resolveRefClassName(baseRef) : undefined;
	const properties: SchemaResolvedProperty[] = resolveSchemaProperties(schemaObj);
	const discriminator: OpenApiSchemaObject | undefined = (schemaObj["discriminator"] as OpenApiSchemaObject | undefined);
	const discriminatorProperty: string | undefined = (discriminator?.["propertyName"] as string | undefined);
	const discriminatorMapping: Record<string, string> = (discriminator?.["mapping"] as Record<string, string> | undefined) ?? {};

	// Schema-first only applies to schemas that require special structural handling:
	// inheritance via allOf or polymorphic dispatch via discriminator.
	// Plain type:object schemas without these fall through to the raw-model path.
	if (!baseClassName && !discriminatorProperty && Object.keys(discriminatorMapping).length === 0) {
		return undefined;
	}

	const interfaceExt: string = baseClassName ? ` extends ${baseClassName}Interface ` : "  ";
	const classExtends: string = baseClassName ? ` extends ${baseClassName}` : "";

	const importSymbols: Set<string> = new Set<string>(["Parameter"]);
	if (baseClassName) {
		importSymbols.add(baseClassName);
		importSymbols.add(`${baseClassName}Interface`);
	}
	for (const prop of properties) {
		if (prop.refClassName) {
			importSymbols.add(prop.refClassName);
		}
	}
	for (const ref of Object.values(discriminatorMapping)) {
		importSymbols.add(resolveRefClassName(ref));
	}

	const propDecls: string[] = properties.map((p: SchemaResolvedProperty): string =>
		`    ${p.name}${p.required ? "" : "?"}: ${p.typeStr};`,
	);

	const assignments: string[] = [];
	for (const p of properties) {
		const refIsEnum: boolean = !!p.refClassName && enumClassNames.has(p.refClassName);
		if (p.isArrayOfRef && p.refClassName) {
			if (refIsEnum) {
				assignments.push(`        this.${p.name} = data?.${p.name};`);
			} else {
				assignments.push(`        this.${p.name} = (data?.${p.name} || []).map(`);
				assignments.push(`            ${p.refClassName}.fromJson`);
				assignments.push("        );");
			}
			continue;
		}
		if (p.isMapOfRef && p.refClassName) {
			if (refIsEnum) {
				assignments.push(`        this.${p.name} = data?.${p.name};`);
			} else {
				assignments.push(`        this.${p.name} = Object.entries(data?.${p.name} ?? {}).reduce((acc: { [key: string]: ${p.refClassName}; }, [key, value]) => {`);
				assignments.push(`            acc[key] = ${p.refClassName}.fromJson(value);`);
				assignments.push("            return acc;");
				assignments.push("        }, {});");
			}
			continue;
		}
		if (p.refClassName) {
			if (refIsEnum) {
				assignments.push(`        this.${p.name} = data?.${p.name};`);
			} else {
				assignments.push(`        this.${p.name} = ${p.refClassName}.fromJson(data?.${p.name});`);
			}
			continue;
		}
		if (p.defaultValue !== undefined) {
			assignments.push(`        let ${p.name}Default: any = ${JSON.stringify(p.defaultValue)};`);
			assignments.push(`        this.${p.name} = typeof data?.${p.name} !== "undefined" ? data?.${p.name} : ${p.name}Default;`);
			continue;
		}
		if (p.typeStr === "string") {
			assignments.push(`        let ${p.name}Default: any = "";`);
			assignments.push(`        this.${p.name} = typeof data?.${p.name} !== "undefined" ? data?.${p.name} : ${p.name}Default;`);
			continue;
		}
		if (p.typeStr === "number") {
			assignments.push(`        let ${p.name}Default: any = 0;`);
			assignments.push(`        this.${p.name} = typeof data?.${p.name} !== "undefined" ? data?.${p.name} : ${p.name}Default;`);
			continue;
		}
		if (p.typeStr === "boolean") {
			assignments.push(`        let ${p.name}Default: any = false;`);
			assignments.push(`        this.${p.name} = typeof data?.${p.name} !== "undefined" ? data?.${p.name} : ${p.name}Default;`);
			continue;
		}
		assignments.push(`        this.${p.name} = data?.${p.name};`);
	}

	const defaultMethods: string[] = [];
	const descriptionMethods: string[] = [];
	for (const p of properties) {
		const cap: string = p.name.charAt(0).toUpperCase() + p.name.slice(1);
		if (p.isArrayOfRef) {
			const itemType: string = p.refClassName ?? "any";
			defaultMethods.push(`    public static get${cap}Default(): Array<${itemType}> {`);
			defaultMethods.push("        return [];");
			defaultMethods.push("    }");
			defaultMethods.push("");
		} else if (p.defaultValue !== undefined) {
			defaultMethods.push(`    public static get${cap}Default(): ${p.typeStr} {`);
			defaultMethods.push(`        return ${JSON.stringify(p.defaultValue)};`);
			defaultMethods.push("    }");
			defaultMethods.push("");
		} else if (p.typeStr === "string") {
			defaultMethods.push(`    public static get${cap}Default(): string {`);
			defaultMethods.push("        return \"\";");
			defaultMethods.push("    }");
			defaultMethods.push("");
		} else if (p.typeStr === "number") {
			defaultMethods.push(`    public static get${cap}Default(): number {`);
			defaultMethods.push("        return 0;");
			defaultMethods.push("    }");
			defaultMethods.push("");
		} else if (p.typeStr === "boolean") {
			defaultMethods.push(`    public static get${cap}Default(): boolean {`);
			defaultMethods.push("        return false;");
			defaultMethods.push("    }");
			defaultMethods.push("");
		} else if (p.typeStr.startsWith("{ [key:")) {
			// Dictionary/map-typed properties get a getXxxDefault() returning {} by the
			// same convention as array properties returning [].
			defaultMethods.push(`    public static get${cap}Default(): ${p.typeStr} {`);
			defaultMethods.push("        return {};");
			defaultMethods.push("    }");
			defaultMethods.push("");
		}
		descriptionMethods.push(`    public static get${cap}Description(): string {`);
		descriptionMethods.push(`        return ${JSON.stringify(p.description ?? "")};`);
		descriptionMethods.push("    }");
		descriptionMethods.push("");
	}

	const fromJsonBody: string[] = [];
	fromJsonBody.push("        if (data === undefined || data === null) {");
	fromJsonBody.push("            return data;");
	fromJsonBody.push("        }");
	fromJsonBody.push("");
	if (discriminatorProperty && Object.keys(discriminatorMapping).length > 0) {
		fromJsonBody.push(`        switch(data.${discriminatorProperty}) {`);
		for (const [discValue, ref] of Object.entries(discriminatorMapping)) {
			const cls: string = resolveRefClassName(ref);
			fromJsonBody.push(`            case '${discValue}':`);
			// Cast needed: discriminated subclasses are structural [key: string]: any types
			// that TypeScript 6 strict mode does not consider assignable to the base class.
			fromJsonBody.push(`                return ${cls}.fromJson(data) as unknown as ${expectedName};`);
		}
		fromJsonBody.push("        }");
		fromJsonBody.push("");
	}
	fromJsonBody.push(`        return new ${expectedName}(data);`);

	const toJsonLines: string[] = [];
	toJsonLines.push("        return {");
	if (baseClassName) {
		toJsonLines.push("            ...(super.toJson()),");
	}
	for (const p of properties) {
		const refIsEnum: boolean = !!p.refClassName && enumClassNames.has(p.refClassName);
		if (p.isArrayOfRef) {
			if (refIsEnum) {
				toJsonLines.push(`            '${p.name}': this.${p.name},`);
			} else {
				toJsonLines.push(`            '${p.name}': this.${p.name}?.map((data: any): any => data.toJson()),`);
			}
		} else if (p.isMapOfRef) {
			if (refIsEnum) {
				toJsonLines.push(`            '${p.name}': this.${p.name},`);
			} else {
				toJsonLines.push(`            '${p.name}': Object.entries(this.${p.name} ?? {}).reduce((acc: { [key: string]: any }, [key, value]) => {`);
				toJsonLines.push("                const toJsonFn = value?.toJson;");
				toJsonLines.push("                acc[key] = typeof toJsonFn === 'function' ? toJsonFn.call(value) : value;");
				toJsonLines.push("                return acc;");
				toJsonLines.push("            }, {}),");
			}
		} else if (p.refClassName) {
			if (refIsEnum) {
				toJsonLines.push(`            '${p.name}': this.${p.name},`);
			} else {
				toJsonLines.push(`            '${p.name}': this.${p.name}?.toJson(),`);
			}
		} else {
			toJsonLines.push(`            '${p.name}': this.${p.name},`);
		}
	}
	toJsonLines.push("        };");

	const normalizedTargetPath: string = targetNoExt.replace(/\\/g, "/");
	const indexImportPath: string = toPosixRelativeImport(normalizedTargetPath, "index");

	// Base class must be imported directly (not via barrel) to avoid circular dependency
	// at runtime: the barrel re-exports the derived class, which would be undefined when
	// the base class is resolved through the same barrel during module evaluation.
	const baseImportLines: string[] = [];
	const barrelSymbols: Set<string> = new Set<string>(importSymbols);
	if (baseClassName) {
		barrelSymbols.delete(baseClassName);
		barrelSymbols.delete(`${baseClassName}Interface`);
		const baseTargetNoExt: string | undefined = classToPath.get(baseClassName);
		const baseImportPath: string = baseTargetNoExt
			? toPosixRelativeImport(normalizedTargetPath, baseTargetNoExt.replace(/\\/g, "/"))
			: indexImportPath;
		const baseSymbols: string[] = [`${baseClassName}`, `${baseClassName}Interface`].sort((a: string, b: string): number => a.localeCompare(b));
		baseImportLines.push("import {");
		baseImportLines.push(`    ${baseSymbols.join(",\n    ")}`);
		baseImportLines.push(`} from "${baseImportPath}";`);
	}

	return [
		...baseImportLines,
		"import {",
		`    ${Array.from(barrelSymbols).sort((a: string, b: string): number => a.localeCompare(b)).join(",\n    ")}`,
		`} from "${indexImportPath}";`,
		"",
		`export interface ${expectedName}Interface${interfaceExt}{`,
		"",
		...propDecls,
		"",
		"}",
		`export class ${expectedName}${classExtends} implements ${expectedName}Interface, Parameter {`,
		...propDecls,
		"",
		"    constructor(data?: any) {",
		...(baseClassName ? ["        super(data);", ""] : []),
		...assignments,
		"    }",
		"",
		...defaultMethods,
		...descriptionMethods,
		`    public static${baseClassName ? " override" : ""} fromJson(data: any): ${expectedName} {`,
		...fromJsonBody,
		"    }",
		"",
		`    public${baseClassName ? " override" : ""} toJson(): any {`,
		...toJsonLines,
		"    }",
		"",
		`    public${baseClassName ? " override" : ""} clone(): ${expectedName} {`,
		`        return ${expectedName}.fromJson(this.toJson());`,
		"    }",
		"",
		"}",
		"",
	].join("\n");
}

/**
 * Generates the TypeScript source for the `Info` or `InfoForm` document info model.
 * These models are treated specially because they use hand-written fixed property sets
 * that differ from what the raw OpenAPI Generator or schema-first path would produce.
 * Returns `undefined` for any `expectedName` other than `Info` or `InfoForm`.
 */
function buildDocumentInfoModelFromSchema(expectedName: string): string | undefined {
	if (expectedName === "Info") {
		return [
			"import {",
			"\tParameter,",
			"\tInfoType,",
			"\tInfoForm,",
			"} from \"./../index\";",
			"",
			"export interface InfoInterface  {",
			"",
			"\tinfoType: InfoType;",
			"",
			"}",
			"export class Info implements InfoInterface, Parameter {",
			"\tinfoType: InfoType;",
			"",
			"\tconstructor(data?: any) {",
			"\t\tlet infoTypeDefault: any = InfoType.Form;",
			"\t\tthis.infoType = typeof data?.infoType !== \"undefined\" ? data?.infoType : infoTypeDefault;",
			"\t}",
			"",
			"\tpublic static getInfoTypeDefault(): InfoType {",
			"\t\treturn InfoType.Form;",
			"\t}",
			"",
			"\tpublic static getInfoTypeDescription(): string {",
			"\t\treturn \"\";",
			"\t}",
			"",
			"\tpublic static fromJson(data: any): Info {",
			"\t\tif (data === undefined || data === null) {",
			"\t\t\treturn data;",
			"\t\t}",
			"",
			"\t\tswitch(data.infoType) {",
			"\t\t\tcase InfoType.Form:",
			"\t\t\t\treturn InfoForm.fromJson(data);",
			"\t\t}",
			"",
			"\t\treturn new Info(data);",
			"\t}",
			"",
			"\tpublic toJson(): any {",
			"\t\treturn {",
			"\t\t\t'infoType': this.infoType,",
			"\t\t};",
			"\t}",
			"",
			"\tpublic clone(): Info {",
			"\t\treturn Info.fromJson(this.toJson());",
			"\t}",
			"",
			"}",
			"",
		].join("\n");
	}

	if (expectedName === "InfoForm") {
		return [
			"import {",
			"\tWebserviceException,",
			"\tParameter,",
			"\tInfoInterface,",
			"\tInfoFormField,",
			"\tInfo,",
			"} from \"./../index\";",
			"",
			"export interface InfoFormInterface extends InfoInterface  {",
			"",
			"\t/**",
			"\t* All AcroForms fields with fully qualified name and, if XFA form, mapping to XFA template and XFA data.",
			"\t*/",
			"\tacroFormFields?: Array<InfoFormField>;",
			"\terror?: WebserviceException;",
			"\t/**",
			"\t* Requested content (BASE64 encoded)",
			"\t*/",
			"\tvalue?: string;",
			"",
			"}",
			"export class InfoForm extends Info implements InfoFormInterface, Parameter {",
			"\t/**",
			"\t* All AcroForms fields with fully qualified name and, if XFA form, mapping to XFA template and XFA data.",
			"\t*/",
			"\tacroFormFields?: Array<InfoFormField>;",
			"\terror?: WebserviceException;",
			"\t/**",
			"\t* Requested content (BASE64 encoded)",
			"\t*/",
			"\tvalue?: string;",
			"",
			"\tconstructor(data?: any) {",
			"\t\tsuper(data);",
			"",
			"\t\tthis.acroFormFields = (data?.acroFormFields || []).map(",
			"\t\t\tInfoFormField.fromJson",
			"\t\t);",
			"\t\tthis.error = WebserviceException.fromJson(data?.error);",
			"\t\tthis.value = data?.value;",
			"\t}",
			"",
			"\tpublic static getAcroFormFieldsDefault(): Array<InfoFormField> {",
			"\t\treturn [];",
			"\t}",
			"",
			"\tpublic static getAcroFormFieldsDescription(): string {",
			"\t\treturn \"All AcroForms fields with fully qualified name and, if XFA form, mapping to XFA template and XFA data.\";",
			"\t}",
			"",
			"\tpublic static getErrorDescription(): string {",
			"\t\treturn \"\";",
			"\t}",
			"",
			"\tpublic static getValueDescription(): string {",
			"\t\treturn \"Requested content (BASE64 encoded)\";",
			"\t}",
			"",
			"\tpublic static override fromJson(data: any): InfoForm {",
			"\t\tif (data === undefined || data === null) {",
			"\t\t\treturn data;",
			"\t\t}",
			"",
			"\t\treturn new InfoForm(data);",
			"\t}",
			"",
			"\tpublic override toJson(): any {",
			"\t\treturn {",
			"\t\t\t...(super.toJson()),",
			"\t\t\t'acroFormFields': this.acroFormFields?.map((data) => data.toJson()),",
			"\t\t\t'error': this.error?.toJson(),",
			"\t\t\t'value': this.value,",
			"\t\t};",
			"\t}",
			"",
			"\tpublic override clone(): InfoForm {",
			"\t\treturn InfoForm.fromJson(this.toJson());",
			"\t}",
			"",
			"}",
			"",
		].join("\n");
	}

	return undefined;
}

/**
 * Generates the TypeScript source for a `multipart/form-data` request body model
 * (e.g. `DocumentsBody`, `DocumentsDocumentIdBody`). These are not regular schema
 * components — they are synthesised from `paths.*.<method>.requestBody` inline schemas.
 * Returns `undefined` when `expectedName` is not a known multipart body model.
 */
function buildMultipartBodyModel(expectedName: string, schemaObj: OpenApiSchemaObject): string | undefined {
	const properties: Record<string, OpenApiSchemaObject> = (schemaObj["properties"] ?? {}) as Record<string, OpenApiSchemaObject>;
	if (Object.keys(properties).length === 0) {
		return undefined;
	}
	const filedataDescription: string = (properties["filedata"]?.["description"] as string | undefined) ?? "";
	return [
		"import {",
		"    Parameter,",
		"} from \"./index\";",
		"",
		`export interface ${expectedName}Interface  {`,
		"",
		"    /**",
		`    * ${filedataDescription}`,
		"    */",
		"    filedata?: Blob;",
		"",
		"}",
		`export class ${expectedName} implements ${expectedName}Interface, Parameter {`,
		"    /**",
		`    * ${filedataDescription}`,
		"    */",
		"    filedata?: Blob;",
		"",
		"    constructor(data?: any) {",
		"        this.filedata = data?.filedata;",
		"    }",
		"",
		"    public static getFiledataDescription(): string {",
		`        return ${JSON.stringify(filedataDescription)};`,
		"    }",
		"",
		`    public static fromJson(data: any): ${expectedName} {`,
		"        if (data === undefined || data === null) {",
		"            return data;",
		"        }",
		"",
		`        return new ${expectedName}(data);`,
		"    }",
		"",
		"    public toJson(): any {",
		"        return {",
		"            'filedata': this.filedata,",
		"        };",
		"    }",
		"",
		`    public clone(): ${expectedName} {`,
		`        return ${expectedName}.fromJson(this.toJson());`,
		"    }",
		"",
		"}",
		"",
	].join("\n");
}

/**
 * Returns the sorted list of expected model class names derived from the OpenAPI schema.
 * Used by {@link verifyRawModelCoverage} to determine which models must be present in
 * the raw OpenAPI Generator output.
 */
function getExpectedRawModelNames(rootDir: string): string[] {
	const specPath: string = path.resolve(rootDir, "src/codegen/resources/schema/openapi.json");
	const spec: OpenApiSpec = JSON.parse(fs.readFileSync(specPath, "utf8")) as OpenApiSpec;
	const schemaNames: string[] = Object.keys(spec.components?.schemas ?? {});
	return schemaNames
		.map((schemaName: string): string => new ModelName(schemaName).getClassName())
		.sort((a: string, b: string): number => a.localeCompare(b));
}

/**
 * Returns the list of raw generator symbol prefixes (e.g. `["Operation"]`) that are
 * preferred when resolving which raw descriptor file to use for a given generated target
 * path. Helps {@link resolveDescriptorForExpected} disambiguate when multiple raw files
 * end with the same class name.
 */
function getPreferredRawPrefixesForTargetPath(targetNoExt: string): string[] {
	const normalized: string = targetNoExt.replace(/\\/g, "/");
	if (normalized.startsWith("admin/")) {
		return ["Admin", "ServerConfig", "ApplicationConfig", "Portal", "Provider"];
	}
	if (normalized.startsWith("operation/")) {
		return ["Operation"];
	}
	if (normalized.startsWith("metadata/")) {
		return ["Metadata"];
	}
	if (normalized.startsWith("document/")) {
		return ["Document"];
	}
	if (normalized.startsWith("auth/")) {
		return ["Auth"];
	}
	if (normalized.startsWith("portal/")) {
		return ["Portal"];
	}
	return [];
}

/**
 * Finds the best-matching {@link RawModelDescriptor} for an expected class name.
 *
 * Resolution order:
 * 1. Exact name match (`expectedName === descriptor.name`)
 * 2. `expectedName + "Inner"` — the raw generator appends this suffix to inline
 *    array-item schemas (e.g. `WebserviceResultStackTraceCauseSuppressedInner`)
 * 3. Suffix match filtered by preferred package prefixes from
 *    {@link getPreferredRawPrefixesForTargetPath}
 * 4. Suffix match with a clean word boundary in the prefix remainder
 * 5. Shortest-prefix fallback
 *
 * Returns `undefined` when no candidate can be identified.
 */
function resolveDescriptorForExpected(expectedName: string, targetNoExt: string, descriptors: RawModelDescriptor[]): RawModelDescriptor | undefined {
	const exact: RawModelDescriptor | undefined = descriptors.find((descriptor: RawModelDescriptor): boolean => descriptor.name === expectedName);
	if (exact) {
		return exact;
	}
	// The raw OpenAPI generator appends "Inner" to inline array-item schemas (e.g.
	// WebserviceResultStackTraceCauseSuppressedInner). extendClassToPathFromRawDescriptors
	// strips the suffix when registering in classToPath, so the expected name no longer
	// carries it. Check the exact "Inner" variant before falling through to suffix matching
	// so these models are correctly materialized instead of falling back to `= any`.
	const innerExact: RawModelDescriptor | undefined = descriptors.find((descriptor: RawModelDescriptor): boolean => descriptor.name === `${expectedName}Inner`);
	if (innerExact) {
		return innerExact;
	}
	const suffixMatches: RawModelDescriptor[] = descriptors.filter((descriptor: RawModelDescriptor): boolean => descriptor.name.endsWith(expectedName));
	if (suffixMatches.length === 0) {
		return undefined;
	}
	if (suffixMatches.length === 1) {
		return suffixMatches[0];
	}
	const preferredPrefixes: string[] = getPreferredRawPrefixesForTargetPath(targetNoExt);
	for (const prefix of preferredPrefixes) {
		const prefixed: RawModelDescriptor[] = suffixMatches.filter((descriptor: RawModelDescriptor): boolean => descriptor.name.startsWith(prefix));
		if (prefixed.length === 1) {
			return prefixed[0];
		}
		if (prefixed.length > 1) {
			const sortedPrefixed: RawModelDescriptor[] = prefixed.slice().sort((a: RawModelDescriptor, b: RawModelDescriptor): number => {
				const al: number = a.name.length - expectedName.length;
				const bl: number = b.name.length - expectedName.length;
				if (al !== bl) {
					return al - bl;
				}
				return a.name.localeCompare(b.name);
			});
			const pFirst: RawModelDescriptor | undefined = sortedPrefixed[0];
			const pSecond: RawModelDescriptor | undefined = sortedPrefixed[1];
			if (pFirst && pSecond && (pFirst.name.length - expectedName.length) < (pSecond.name.length - expectedName.length)) {
				return pFirst;
			}
		}
	}
	const exactBoundaryMatches: RawModelDescriptor[] = suffixMatches.filter((descriptor: RawModelDescriptor): boolean => {
		const remainder: string = descriptor.name.slice(0, descriptor.name.length - expectedName.length);
		return remainder.length === 0 || /^[A-Z][A-Za-z0-9]*$/.test(remainder);
	});
	if (exactBoundaryMatches.length === 1) {
		return exactBoundaryMatches[0];
	}
	const sortedByShortestPrefix: RawModelDescriptor[] = suffixMatches.slice().sort((a: RawModelDescriptor, b: RawModelDescriptor): number => {
		const aPrefixLength: number = a.name.length - expectedName.length;
		const bPrefixLength: number = b.name.length - expectedName.length;
		if (aPrefixLength !== bPrefixLength) {
			return aPrefixLength - bPrefixLength;
		}
		return a.name.localeCompare(b.name);
	});
	const first: RawModelDescriptor | undefined = sortedByShortestPrefix[0];
	const second: RawModelDescriptor | undefined = sortedByShortestPrefix[1];
	if (first && second) {
		const firstPrefixLength: number = first.name.length - expectedName.length;
		const secondPrefixLength: number = second.name.length - expectedName.length;
		if (firstPrefixLength < secondPrefixLength) {
			return first;
		}
	}
	if (suffixMatches.length === 1) {
		return suffixMatches[0];
	}
	// Fallback: raw generator appends "Inner" to array-item inline schemas; try with suffix
	const innerMatch: RawModelDescriptor | undefined = descriptors.find(
		(d: RawModelDescriptor): boolean => d.name === `${expectedName}Inner`,
	);
	if (innerMatch) {
		return innerMatch;
	}
	return undefined;
}

/**
 * Builds the primary `className → filePathWithoutExt` map from the OpenAPI schema.
 * This is the core routing table used throughout the adapter to determine where a given
 * class name should be written (e.g. `Host` → `admin/config/server/Host`).
 */
function getClassNameToGeneratedFileWithoutExt(rootDir: string): Map<string, string> {
	const specPath: string = path.resolve(rootDir, "src/codegen/resources/schema/openapi.json");
	const spec: OpenApiSpec = JSON.parse(fs.readFileSync(specPath, "utf8")) as OpenApiSpec;
	const schemaNames: string[] = Object.keys(spec.components?.schemas ?? {});
	const map: Map<string, string> = new Map<string, string>();
	for (const schemaName of schemaNames) {
		const modelName: ModelName = new ModelName(schemaName);
		map.set(modelName.getClassName(), modelName.getFileName());
	}
	return map;
}

/**
 * Detects the structural kind of a raw model file from its source content
 * (enum → interface → class → type → unknown, in priority order).
 */
function detectRawModelKind(content: string): RawModelKind {
	if (/export\s+enum\s+[A-Za-z0-9_]+/.test(content)) {
		return "enum";
	}
	if (/export\s+interface\s+[A-Za-z0-9_]+/.test(content)) {
		return "interface";
	}
	if (/export\s+class\s+[A-Za-z0-9_]+/.test(content)) {
		return "class";
	}
	if (/export\s+type\s+[A-Za-z0-9_]+\s*=/.test(content)) {
		return "type";
	}
	return "unknown";
}

/**
 * Extracts the first exported symbol name from a raw model file (enum, interface,
 * class, or type alias). Returns `undefined` when no export declaration is found.
 */
function detectPrimaryExportName(content: string): string | undefined {
	const enumMatch: RegExpMatchArray | null = content.match(/export\s+enum\s+([A-Za-z0-9_]+)/);
	if (enumMatch?.[1]) {
		return enumMatch[1];
	}
	const interfaceMatch: RegExpMatchArray | null = content.match(/export\s+interface\s+([A-Za-z0-9_]+)/);
	if (interfaceMatch?.[1]) {
		return interfaceMatch[1];
	}
	const classMatch: RegExpMatchArray | null = content.match(/export\s+class\s+([A-Za-z0-9_]+)/);
	if (classMatch?.[1]) {
		return classMatch[1];
	}
	const typeMatch: RegExpMatchArray | null = content.match(/export\s+type\s+([A-Za-z0-9_]+)\s*=/);
	if (typeMatch?.[1]) {
		return typeMatch[1];
	}
	return undefined;
}

/**
 * Renames a single `export interface|class|enum|type <fromName>` declaration to
 * `<toName>` in `content`. Returns `content` unchanged when `fromName === toName`.
 */
function rewritePrimaryExportName(content: string, fromName: string, toName: string): string {
	if (fromName === toName) {
		return content;
	}
	const escapedFrom: string = fromName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const declarationPattern: RegExp = new RegExp(`(export\\s+(?:interface|class|enum|type)\\s+)${escapedFrom}(\\b)`);
	return content.replace(declarationPattern, `$1${toName}$2`);
}

/**
 * Rewrites relative import paths in `content` from the raw OpenAPI Generator's
 * kebab-case convention (e.g. `./operation-toolbox-merge-merge`) to the correct
 * adapter target path resolved via `classToPath` (e.g. `../operation/ToolboxMergeMerge`).
 *
 * Also handles:
 * - `*Inner` imports stripped by {@link extendClassToPathFromRawDescriptors}
 * - Raw generator symbol names still present in import paths (resolved via `rawToExpected`)
 * - In-place kebab→PascalCase conversion as a last-resort fallback
 */
function rewriteKebabCaseImportPaths(
	content: string,
	currentFileNoExt: string,
	classToPath: Map<string, string>,
	rawToExpected?: Map<string, string>,
): string {
	const currentDir: string = path.dirname(currentFileNoExt).replace(/\\/g, "/");
	return content.replace(
		/from\s+(['"])(\.\/[^'"]+)['"]/g,
		(_full: string, quote: string, importPath: string): string => {
			const parts: string[] = importPath.split("/");
			const last: string = parts[parts.length - 1] ?? "";
			const pascalLast: string = last.includes("-")
				? last.split("-").map((p: string): string => (p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join("")
				: last;
			let targetNoExt: string | undefined = classToPath.get(pascalLast);
			// Fallback: raw generator appends "Inner" to array-item inline schemas
			if (!targetNoExt && pascalLast.endsWith("Inner")) {
				targetNoExt = classToPath.get(pascalLast.slice(0, -"Inner".length));
			}
			// Fallback: import path still carries a raw generator symbol name (e.g.
			// OperationToolboxMergeMerge). Look it up via rawToExpected to find the
			// adapter expected name and then resolve the correct target path.
			if (!targetNoExt && rawToExpected) {
				const expectedName: string | undefined = rawToExpected.get(pascalLast);
				if (expectedName) {
					targetNoExt = classToPath.get(expectedName);
				}
			}
			if (targetNoExt) {
				const targetNormalized: string = targetNoExt.replace(/\\/g, "/");
				const relPath: string = path.posix.relative(currentDir, targetNormalized);
				const correctedPath: string = relPath.startsWith(".") ? relPath : `./${relPath}`;
				return `from ${quote}${correctedPath}${quote}`;
			}
			if (last.includes("-")) {
				parts[parts.length - 1] = pascalLast;
				return `from ${quote}${parts.join("/")}${quote}`;
			}
			return _full;
		},
	);
}

/**
 * Rewrites import symbol names that carry the raw generator's "Inner" suffix when the
 * corresponding base class (without "Inner") has been registered in classToPath.
 *
 * The OpenAPI raw generator appends "Inner" to inline array-item schema types, e.g.
 * `WebserviceResultStackTraceCauseStackTraceInner`. After
 * `extendClassToPathFromRawDescriptors` strips the suffix when registering classToPath
 * entries, the generated target file exports the name *without* "Inner". This function
 * corrects all occurrences of `XInner` to `X` in the file — covering both the import
 * clause and `Array<XInner>` type usages in the interface and class bodies.
 */
function rewriteInnerSuffixedImportSymbols(
	content: string,
	classToPath: Map<string, string>,
): string {
	return content.replace(
		/\b([A-Za-z][A-Za-z0-9]*)Inner\b/g,
		(match: string, base: string): string => (classToPath.has(base) ? base : match),
	);
}

/**
 * Rewrites all raw OpenAPI generator symbol names (e.g. OperationToolboxMergeMerge) in
 * file content to their adapter-expected names (e.g. ToolboxMergeMerge).
 *
 * This corrects property type references that the raw generator emits using its own
 * symbol naming (with the package prefix) instead of the stripped name the adapter uses.
 * The rewrite happens before transformToClassModel so that interfaceClassNames.has()
 * checks produce correct results and fromJson()/toJson() are generated accordingly.
 *
 * Entries are sorted longest-first to prevent partial-name substitution: processing
 * OperationToolboxMergeMerge before OperationToolboxMerge ensures the longer name is
 * replaced atomically and the shorter one only matches the remaining occurrences.
 */
function rewriteRawNamesToExpected(content: string, rawToExpected: Map<string, string>): string {
	const entries: Array<[string, string]> = Array.from(rawToExpected.entries())
		.filter(([raw, expected]: [string, string]): boolean => raw !== expected)
		.sort(([a]: [string, string], [b]: [string, string]): number => b.length - a.length);
	let result: string = content;
	for (const [raw, expected] of entries) {
		const escapedRaw: string = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		result = result.replace(new RegExp(`\\b${escapedRaw}\\b`, "g"), expected);
	}
	return result;
}

/**
 * For object union schemas (e.g. BaseToolbox, ActionEvent), injects dispatch logic into
 * the generated fromJson() method so that fromJson({ merge: {...} }) returns the specific
 * union member instance (ToolboxMerge) rather than a plain BaseToolbox instance.
 *
 * The dispatch selects the union member class based on which property key is present in
 * the data. Each oneOf member must have at least one declared property in schemaModelMetaMap;
 * the first property key is used as the discriminator.
 *
 * Because ToolboxMerge properly hydrates its 'merge' property as a ToolboxMergeMerge
 * instance (after rewriteRawNamesToExpected), calling toJson() on the returned value
 * propagates through the full typed serialization chain and excludes consumer-added
 * properties (e.g. addMode) that are not part of the schema.
 *
 * Value imports for the dispatch targets are injected by converting the existing type
 * imports for those symbols using rewriteTypeImportsToValue. The import paths are still
 * raw at this stage and will be corrected by rewriteKebabCaseImportPaths downstream.
 */
function injectObjectUnionFromJsonDispatch(
	content: string,
	modelName: string,
	schemaObj: OpenApiSchemaObject,
	schemaModelMetaMap: Map<string, SchemaModelMeta>,
	classToPath: Map<string, string>,
): string {
	const oneOf: Array<Record<string, unknown>> | undefined = schemaObj["oneOf"] as Array<Record<string, unknown>> | undefined;
	if (!oneOf || oneOf.length === 0) {
		return content;
	}

	const dispatchLines: string[] = [];
	const dispatchSymbols: Set<string> = new Set<string>();

	for (const ref of oneOf) {
		if (typeof ref["$ref"] !== "string") {
			continue;
		}
		// resolveRefClassName already strips the schema prefix via ModelName, so
		// OperationToolboxMerge ($ref) becomes ToolboxMerge (expected class name).
		const className: string = resolveRefClassName(ref["$ref"] as string);
		if (!classToPath.has(className)) {
			continue;
		}
		const schemaMeta: SchemaModelMeta | undefined = schemaModelMetaMap.get(className);
		if (!schemaMeta || schemaMeta.properties.size === 0) {
			continue;
		}
		// Use the first declared property as the discriminator key.
		const propKey: string | undefined = Array.from(schemaMeta.properties.keys())[0];
		if (!propKey) {
			continue;
		}
		dispatchLines.push(`\t\tif (data?.['${propKey}'] !== undefined) { return ${className}.fromJson(data) as any; }`);
		dispatchSymbols.add(className);
	}

	if (dispatchLines.length === 0) {
		return content;
	}

	// Convert the existing type imports for dispatch targets to value imports so they
	// are resolvable at runtime. The paths may still carry raw names here; they will be
	// corrected by the downstream rewriteKebabCaseImportPaths call.
	const contentWithValueImports: string = rewriteTypeImportsToValue(content, dispatchSymbols);

	// Inject dispatch before the fallback `return new ModelName(data)` inside fromJson().
	// String.replace without /g replaces only the first occurrence, which is the fromJson()
	// body (the static clone() method has an identical pattern further down the class).
	const fromJsonReturn: string = `\t\treturn new ${modelName}(data);`;
	const injectedDispatch: string = `${dispatchLines.join("\n")}\n${fromJsonReturn}`;
	return contentWithValueImports.replace(fromJsonReturn, injectedDispatch);
}

/**
 * Reads all `.ts` model files from `rawModelsDir` (excluding `index.ts`) and returns
 * a sorted list of {@link RawModelDescriptor} records with the primary export name and
 * structural kind detected from each file's content.
 */
function buildRawModelManifest(rawModelsDir: string): RawModelDescriptor[] {
	const descriptors: RawModelDescriptor[] = [];
	for (const fileName of fs.readdirSync(rawModelsDir).sort((a: string, b: string): number => a.localeCompare(b))) {
		if (!fileName.endsWith(".ts") || fileName === "index.ts") {
			continue;
		}
		const modelName: string = path.basename(fileName, ".ts");
		const absPath: string = path.resolve(rawModelsDir, fileName);
		const content: string = fs.readFileSync(absPath, "utf8");
		const primaryExportName: string = detectPrimaryExportName(content) ?? modelName;
		descriptors.push({
			name: primaryExportName,
			fileName,
			kind: detectRawModelKind(content),
		});
	}
	return descriptors;
}

/** Writes the raw model manifest to `build/codegen/adapter/raw-model-manifest.json` for diagnostics. */
function writeRawManifest(rootDir: string, descriptors: RawModelDescriptor[]): void {
	const outDir: string = path.resolve(rootDir, "build/codegen/adapter");
	const outPath: string = path.resolve(outDir, "raw-model-manifest.json");
	fs.mkdirSync(outDir, {recursive: true});
	fs.writeFileSync(outPath, `${JSON.stringify({models: descriptors}, null, 2)}\n`, "utf8");
}

/**
 * Produces a diagnostic list of raw model descriptors that could not be cleanly mapped
 * to a schema target or whose raw file is missing the expected primary type export.
 * Results are written to `build/codegen/adapter/raw-object-candidates.json`.
 */
function analyzeRawObjectCandidates(rootDir: string, rawModelsDir: string, descriptors: RawModelDescriptor[]): RawObjectCandidate[] {
	const classToPath: Map<string, string> = getClassNameToGeneratedFileWithoutExt(rootDir);
	const candidates: RawObjectCandidate[] = [];

	for (const descriptor of descriptors) {
		if (descriptor.kind === "enum") {
			continue;
		}
		const reasons: string[] = [];
		const targetNoExt: string | undefined = classToPath.get(descriptor.name);
		if (!targetNoExt) {
			reasons.push("no-schema-target");
		}

		let targetFile: string | undefined;
		if (targetNoExt) {
			targetFile = `${targetNoExt}.ts`;
		}

		const rawPath: string = path.resolve(rawModelsDir, descriptor.fileName);
		const rawContent: string = fs.readFileSync(rawPath, "utf8");
		if (!rawContent.includes(`export interface ${descriptor.name}`) && !rawContent.includes(`export class ${descriptor.name}`)) {
			reasons.push("raw-file-missing-primary-type");
		}

		candidates.push({
			name: descriptor.name,
			fileName: descriptor.fileName,
			kind: descriptor.kind,
			targetFile,
			reasons,
		});
	}

	return candidates.sort((a: RawObjectCandidate, b: RawObjectCandidate): number => a.name.localeCompare(b.name));
}

/** Writes the raw object candidate report to `build/codegen/adapter/raw-object-candidates.json`. */
function writeRawObjectCandidates(rootDir: string, candidates: RawObjectCandidate[]): void {
	const outDir: string = path.resolve(rootDir, "build/codegen/adapter");
	const outPath: string = path.resolve(outDir, "raw-object-candidates.json");
	fs.mkdirSync(outDir, {recursive: true});
	fs.writeFileSync(outPath, `${JSON.stringify({models: candidates}, null, 2)}\n`, "utf8");
}

/**
 * Extends the schema-derived `classToPath` map with entries for raw model descriptors
 * that have no direct schema counterpart (e.g. inline sub-object models generated by
 * the raw OpenAPI Generator, such as `ToolboxMergeMerge`).
 *
 * Also builds and returns a `rawToExpected` map (raw generator symbol → adapter expected
 * name) used by subsequent import-path rewriting steps. Enum descriptors and models
 * already present in `classToPath` are skipped to avoid duplicate exports.
 *
 * The `*Inner` suffix appended by the raw generator to inline array-item schemas is
 * stripped when registering entries so that downstream classToPath lookups succeed.
 */
function extendClassToPathFromRawDescriptors(
	classToPath: Map<string, string>,
	descriptors: RawModelDescriptor[],
): Map<string, string> {
	// rawToExpected maps the raw generator's symbol names (e.g. OperationToolboxMergeMerge)
	// to the adapter's expected names (e.g. ToolboxMergeMerge). Used to rewrite property
	// type references in generated files and to resolve import paths for raw-named imports.
	const rawToExpected: Map<string, string> = new Map<string, string>();
	type Pkg = { prefix: string; location: string };
	const configPath: string = path.resolve(__dirname, "../../resources/generator_config.json");
	const { packages } = JSON.parse(fs.readFileSync(configPath, "utf8")) as { packages: Pkg[] };
	const prefixMaps: Array<{ pascal: string; loc: string }> = packages
		.map((p: Pkg): { pascal: string; loc: string } => ({ pascal: p.prefix.replace("_", ""), loc: p.location }))
		.sort((a: { pascal: string; loc: string }, b: { pascal: string; loc: string }): number => b.pascal.length - a.pascal.length);

	const existing: Set<string> = new Set<string>(classToPath.keys());
	for (const desc of descriptors) {
		// Enum targets are schema-owned and already represented in classToPath.
		// Extending enum paths from raw descriptors introduces duplicate stripped names
		// (for example Metadata_DrawMode -> DrawMode) and later duplicate exports.
		if (desc.kind === "enum") {
			continue;
		}
		// Skip if the full descriptor name is already in classToPath (schema-backed type):
		// the same raw file would be materialized twice, causing duplicate enum exports in index.ts.
		if (existing.has(desc.name)) {
			continue;
		}
		let rawClassName: string = desc.name;
		let location: string = "";
		for (const { pascal, loc } of prefixMaps) {
			if (desc.name.startsWith(pascal)) {
				rawClassName = desc.name.slice(pascal.length);
				location = loc;
				break;
			}
		}
		// Strip "Inner" suffix added by raw generator for array-item inline schemas
		const className: string = rawClassName.endsWith("Inner") ? rawClassName.slice(0, -"Inner".length) : rawClassName;
		// Always record the raw-to-expected mapping, even when the expected name is already
		// registered (e.g. schema-backed). This lets downstream rewrites find the correct
		// symbol name without needing access to the full classToPath.
		rawToExpected.set(desc.name, className);
		// Also record the kebab-to-pascal of the raw fileName as a key. The path rewriter
		// converts kebab-case import paths (e.g. ./server-config-ssl) to PascalCase using
		// simple per-segment capitalisation (ServerConfigSsl), which can differ from the
		// descriptor's primary export name when it contains consecutive capitals like SSL
		// (ServerConfigSSL). Adding this alternative key lets rewriteKebabCaseImportPaths
		// resolve these paths via rawToExpected even for multi-capital descriptor names.
		const fileBaseName: string = path.basename(desc.fileName, ".ts");
		if (fileBaseName.includes("-")) {
			const kebabPascal: string = fileBaseName
				.split("-")
				.map((p: string): string => (p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
				.join("");
			rawToExpected.set(kebabPascal, className);
		}
		if (existing.has(className)) {
			continue;
		}
		const fileNoExt: string = location ? `${location}${className}` : className;
		classToPath.set(className, fileNoExt);
		existing.add(className);
	}
	return rawToExpected;
}

/**
 * Core materialization step of the adapter pipeline.
 *
 * For each expected model class (schema-derived `classToPath` + raw-descriptor
 * extensions), this function:
 * 1. Tries the schema-first path (document info, multipart body, or
 *    {@link buildSchemaFirstClassModel}).
 * 2. Falls back to the raw OpenAPI Generator file (resolved via
 *    {@link resolveDescriptorForExpected}), applying the full transformation chain:
 *    - Symbol rename ({@link rewritePrimaryExportName})
 *    - Raw→expected name rewrites ({@link rewriteRawNamesToExpected})
 *    - `Object`-union dispatch injection ({@link injectObjectUnionFromJsonDispatch})
 *    - Const-enum conversion ({@link convertConstEnumPatternToEnum},
 *      {@link removeConstEnumObjectDeclarations}, {@link convertProperEnumMemberNames})
 *    - Interface→class transformation ({@link transformToClassModel})
 *    - Type-alias expansion ({@link transformTypeAliasModel})
 *    - Import path correction ({@link rewriteKebabCaseImportPaths},
 *      {@link rewriteInnerSuffixedImportSymbols})
 * 3. Writes a `export type X = any` placeholder or a full placeholder class for
 *    models in {@link RAW_COVERAGE_PLACEHOLDER_MODELS}.
 *
 * After all files are written, calls {@link applyCanonicalEnumTypeNormalization} to
 * consolidate shared enums and rewrite per-file enum usage, then emits `index.ts`
 * via {@link writeRawIndex}.
 *
 * Returns an {@link AdapterSummary} written to `build/codegen/adapter/adapter-summary.json`.
 */
function materializeRawModels(rootDir: string, rawModelsDir: string, descriptors: RawModelDescriptor[]): AdapterSummary {
	const generatedBaseDir: string = path.resolve(rootDir, "src/main/typescript/generated-sources");
	const classToPath: Map<string, string> = getClassNameToGeneratedFileWithoutExt(rootDir);
	const rawToExpected: Map<string, string> = extendClassToPathFromRawDescriptors(classToPath, descriptors);
	const schemaModelMetaMap: Map<string, SchemaModelMeta> = buildSchemaModelMetaMap(rootDir);
	const schemaByClass: Map<string, OpenApiSchemaObject> = getClassNameToSchemaObject(rootDir);
	const requestBodySchemas: Map<string, OpenApiSchemaObject> = getRequestBodySchemaMap(rootDir);
	for (const [name] of requestBodySchemas.entries()) {
		if (!classToPath.has(name)) {
			classToPath.set(name, name);
		}
	}
	const enumClassNames: Set<string> = new Set<string>(
		Array.from(schemaByClass.entries())
			.filter(([, schema]: [string, OpenApiSchemaObject]): boolean => Array.isArray(schema["enum"]) && (schema["enum"] as unknown[]).length > 0)
			.map(([className]: [string, OpenApiSchemaObject]): string => className),
	);
	const interfaceClassNames: Set<string> = new Set<string>();
	for (const [expectedName, targetNoExt] of classToPath.entries()) {
		const desc: RawModelDescriptor | undefined = resolveDescriptorForExpected(expectedName, targetNoExt, descriptors);
		if (desc?.kind === "interface") {
			interfaceClassNames.add(expectedName);
		}
	}
	// Collect discriminator subtype names: type-alias raw models that appear as discriminator
	// mapping targets must keep their class form so that .fromJson() dispatch works at runtime.
	const discriminatorSubtypes: Set<string> = new Set<string>();
	for (const [, schema] of schemaByClass.entries()) {
		const discriminator: { mapping?: Record<string, string> } | undefined = schema["discriminator"] as { mapping?: Record<string, string> } | undefined;
		for (const ref of Object.values(discriminator?.["mapping"] ?? {})) {
			discriminatorSubtypes.add(resolveRefClassName(ref));
		}
	}
	// Object-union schema classes (type: object + oneOf, e.g. ActionEvent / DestinationEvent / BaseToolbox)
	// receive a generated class with a dispatching fromJson() (see injectObjectUnionFromJsonDispatch), but are
	// NOT "interface" descriptors. They must still count as hydratable so that properties — and especially
	// Array<Union> properties (e.g. Item.actions: Array<ActionEvent>) — are reconstructed element-wise via
	// fromJson() instead of being raw-assigned. Without this, a fromJson(toJson()) round-trip does not re-run
	// the union dispatch, so consumer/extension fields added by clients that extend the base models (Portal
	// adds e.g. `type` / `operation`) survive into the server request and are rejected as unknown fields.
	const objectUnionClassNames: Set<string> = new Set<string>();
	for (const [className, schema] of schemaByClass.entries()) {
		if (schema["type"] === "object" && Array.isArray(schema["oneOf"])) {
			objectUnionClassNames.add(className);
		}
	}
	// The set of classes that expose a runtime fromJson()/toJson() and may therefore be hydrated on nested
	// properties: interface-derived classes, discriminator subtypes (kept as classes for dispatch) and the
	// object-union classes above. Plain type aliases are intentionally excluded (they have no fromJson()).
	const hydratableClassNames: Set<string> = new Set<string>([
		...interfaceClassNames,
		...discriminatorSubtypes,
		...objectUnionClassNames,
	]);
	const writtenExports: string[] = [];
	const exportedSymbolsByPath: Map<string, string[]> = new Map<string, string[]>();
	const rawWithoutSchemaTarget: string[] = [];
	fs.rmSync(generatedBaseDir, {recursive: true, force: true});
	fs.mkdirSync(generatedBaseDir, {recursive: true});

	for (const [expectedName, targetNoExt] of classToPath.entries()) {
		const adminSchemaFirst: string | undefined = buildSchemaFirstClassModel(
			expectedName,
			targetNoExt,
			schemaByClass.get(expectedName) ?? {},
			enumClassNames,
			classToPath,
		);
		if (adminSchemaFirst) {
			const targetPath: string = path.resolve(generatedBaseDir, `${targetNoExt}.ts`);
			fs.mkdirSync(path.dirname(targetPath), {recursive: true});
			fs.writeFileSync(targetPath, adminSchemaFirst, "utf8");
			const normalizedPath: string = targetNoExt.replace(/\\/g, "/");
			writtenExports.push(normalizedPath);
			exportedSymbolsByPath.set(normalizedPath, collectExportedSymbols(adminSchemaFirst));
			continue;
		}

		const documentInfoModel: string | undefined = buildDocumentInfoModelFromSchema(expectedName);
		if (documentInfoModel) {
			const targetPath: string = path.resolve(generatedBaseDir, `${targetNoExt}.ts`);
			fs.mkdirSync(path.dirname(targetPath), {recursive: true});
			fs.writeFileSync(targetPath, documentInfoModel, "utf8");
			const normalizedPath: string = targetNoExt.replace(/\\/g, "/");
			writtenExports.push(normalizedPath);
			exportedSymbolsByPath.set(normalizedPath, collectExportedSymbols(documentInfoModel));
			continue;
		}
		const multipartBodyModel: string | undefined = buildMultipartBodyModel(expectedName, requestBodySchemas.get(expectedName) ?? {});
		if (multipartBodyModel) {
			const targetPath: string = path.resolve(generatedBaseDir, `${targetNoExt}.ts`);
			fs.mkdirSync(path.dirname(targetPath), {recursive: true});
			fs.writeFileSync(targetPath, multipartBodyModel, "utf8");
			const normalizedPath: string = targetNoExt.replace(/\\/g, "/");
			writtenExports.push(normalizedPath);
			exportedSymbolsByPath.set(normalizedPath, collectExportedSymbols(multipartBodyModel));
			continue;
		}

		const descriptor: RawModelDescriptor | undefined = resolveDescriptorForExpected(expectedName, targetNoExt, descriptors);
		if (!descriptor) {
			continue;
		}
		const rawPath: string = path.resolve(rawModelsDir, descriptor.fileName);
		const targetPath: string = path.resolve(generatedBaseDir, `${targetNoExt}.ts`);
		const rawContent: string = fs.readFileSync(rawPath, "utf8");
		const renamedRawContent: string = rewritePrimaryExportName(rawContent, descriptor.name, expectedName);
		// Rewrite raw generator symbol names (e.g. OperationToolboxMergeMerge) to their
		// adapter-expected names (e.g. ToolboxMergeMerge) in property type references and
		// imports. This runs after rewritePrimaryExportName so the primary export is already
		// correctly named and rawToExpected entries for it find no remaining matches.
		const rawNamesRewritten: string = rewriteRawNamesToExpected(renamedRawContent, rawToExpected);
		const enumTransformedContent: string = convertProperEnumMemberNames(convertConstEnumPatternToEnum(rawNamesRewritten));
		// Preserve simple type-alias raw models (e.g. AdminX = OtherClass) as type aliases.
		// Exceptions: discriminator subtypes that need .fromJson() for polymorphic dispatch,
		// const-enum type aliases (typeof X[keyof typeof X]) that must be converted to enums,
		// and union schemas typed as "object" in the OpenAPI spec — the v10 Java generator
		// produced extendable classes for these (e.g. ActionEvent, BaseToolbox, DestinationEvent).
		const hasConstEnumAlias: boolean = /export\s+type\s+[A-Za-z0-9_]+\s*=\s*typeof\s+[A-Za-z0-9_]+\[keyof\s+typeof\s+[A-Za-z0-9_]+\]/.test(enumTransformedContent);
		const schemaObj: OpenApiSchemaObject | undefined = schemaByClass.get(expectedName);
		const isObjectUnionSchema: boolean = schemaObj?.["type"] === "object" && Array.isArray(schemaObj?.["oneOf"]);
		const typeAliasTransformedContent: string = (descriptor.kind === "type" && !discriminatorSubtypes.has(expectedName) && !hasConstEnumAlias && !isObjectUnionSchema)
			? enumTransformedContent
			: transformTypeAliasModel(enumTransformedContent, expectedName);
		// For object union schemas, inject dispatch into fromJson() so that calling
		// fromJson({ merge: {...} }) returns a ToolboxMerge instance rather than a plain
		// BaseToolbox instance. This lets toJson() propagate through the typed chain and
		// exclude consumer-added properties (e.g. addMode) that are not in the schema.
		const unionDispatchContent: string = (isObjectUnionSchema && schemaObj !== undefined)
			? injectObjectUnionFromJsonDispatch(typeAliasTransformedContent, expectedName, schemaObj, schemaModelMetaMap, classToPath)
			: typeAliasTransformedContent;
		const constEnumObjectCleaned: string = removeConstEnumObjectDeclarations(unionDispatchContent);
		const classTransformedContent: string = descriptor.kind === "interface"
			? transformToClassModel(constEnumObjectCleaned, expectedName, schemaModelMetaMap.get(expectedName), hydratableClassNames)
			: constEnumObjectCleaned;
		// Pass rawToExpected so import paths that still carry raw symbol names (e.g.
		// ./OperationToolboxMergeMerge) are resolved to their correct adapter targets.
		const pathRewrittenContent: string = rewriteKebabCaseImportPaths(classTransformedContent, targetNoExt, classToPath, rawToExpected);
		const transformedRawContent: string = rewriteInnerSuffixedImportSymbols(pathRewrittenContent, classToPath);
		fs.mkdirSync(path.dirname(targetPath), {recursive: true});
		fs.writeFileSync(targetPath, transformedRawContent.endsWith("\n") ? transformedRawContent : `${transformedRawContent}\n`, "utf8");
		const normalizedPath: string = targetNoExt.replace(/\\/g, "/");
		writtenExports.push(normalizedPath);
		exportedSymbolsByPath.set(normalizedPath, collectExportedSymbols(transformedRawContent));
	}
	for (const [expectedName, targetNoExt] of classToPath.entries()) {
		const normalizedPath: string = targetNoExt.replace(/\\/g, "/");
		if (writtenExports.includes(normalizedPath)) {
			continue;
		}
		const targetPath: string = path.resolve(generatedBaseDir, `${targetNoExt}.ts`);
		fs.mkdirSync(path.dirname(targetPath), {recursive: true});
		// Placeholder models (no schema/raw backing) get a well-typed [key: string]: any class
		// rather than a bare type alias so consumers can still construct and use them at runtime.
		const fallbackContent: string = RAW_COVERAGE_PLACEHOLDER_MODELS.has(expectedName)
			? `${buildPlaceholderModelContent(expectedName)}\n`
			: `export type ${expectedName} = any;\n`;
		fs.writeFileSync(targetPath, fallbackContent, "utf8");
		writtenExports.push(normalizedPath);
		exportedSymbolsByPath.set(normalizedPath, collectExportedSymbols(fallbackContent));
	}
	const expectedNames: Set<string> = new Set<string>(Array.from(classToPath.keys()));
	for (const descriptor of descriptors) {
		const matchesKnownExpected: boolean = Array.from(expectedNames).some((expectedName: string): boolean =>
			descriptor.name === expectedName || descriptor.name.endsWith(expectedName),
		);
		if (!matchesKnownExpected) {
			rawWithoutSchemaTarget.push(descriptor.name);
		}
	}
	applyCanonicalEnumTypeNormalization(rootDir, writtenExports, exportedSymbolsByPath, classToPath);
	writeRawIndex(rootDir, writtenExports, exportedSymbolsByPath);
	const expected: Set<string> = new Set<string>(Array.from(classToPath.values()).map((entry: string): string => entry.replace(/\\/g, "/")));
	const written: Set<string> = new Set<string>(writtenExports);
	const missingFromRaw: string[] = Array.from(expected)
		.filter((entry: string): boolean => !written.has(entry))
		.sort((a: string, b: string): number => a.localeCompare(b));
	return {
		writtenExports: writtenExports.sort((a: string, b: string): number => a.localeCompare(b)),
		missingFromRaw,
		rawWithoutSchemaTarget: rawWithoutSchemaTarget.sort((a: string, b: string): number => a.localeCompare(b)),
	};
}

/**
 * Writes the `index.ts` export barrel for `src/main/typescript/generated-sources/`.
 * Each written export path with at least one symbol produces one
 * `export { A, B, … } from "./path"` line. Also writes `Parameter.ts` and appends the
 * fixed `RestOperationData` re-export.
 */
function writeRawIndex(rootDir: string, writtenExports: string[], exportedSymbolsByPath: Map<string, string[]>): void {
	const generatedBaseDir: string = path.resolve(rootDir, "src/main/typescript/generated-sources");
	writeParameterModel(generatedBaseDir);
	const exportLines: string[] = [];
	const pathToSymbols: Map<string, string[]> = new Map<string, string[]>();
	for (const normalized of writtenExports.sort((a: string, b: string): number => a.localeCompare(b))) {
		const symbols: string[] = exportedSymbolsByPath.get(normalized) ?? [];
		if (symbols.length === 0) {
			continue;
		}
		pathToSymbols.set(normalized, symbols);
	}
	for (const normalized of Array.from(pathToSymbols.keys()).sort((a: string, b: string): number => a.localeCompare(b))) {
		const symbols: string[] = pathToSymbols.get(normalized) ?? [];
		exportLines.push(`export { ${symbols.join(", ")} } from "./${normalized}";`);
	}
	if (fs.existsSync(path.resolve(generatedBaseDir, "Parameter.ts"))) {
		exportLines.push(`export * from "./Parameter";`);
	}
	exportLines.push(`export { RestOperationData } from "../openapi/RestOperationData";`);
	fs.writeFileSync(path.resolve(generatedBaseDir, "index.ts"), `${exportLines.join("\n")}\n`, "utf8");
}

/** Writes the adapter summary to `build/codegen/adapter/adapter-summary.json`. */
function writeAdapterSummary(rootDir: string, summary: AdapterSummary): void {
	const outDir: string = path.resolve(rootDir, "build/codegen/adapter");
	const outPath: string = path.resolve(outDir, "adapter-summary.json");
	fs.mkdirSync(outDir, {recursive: true});
	fs.writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

/**
 * Derives the short canonical class name for a schema enum annotation name by
 * stripping the package prefix and applying {@link ModelName} PascalCase resolution
 * (e.g. `Operation_DrawMode` → `DrawMode`).
 */
function toCanonicalEnumSymbol(enumName: string): string {
	const stripped: string = strippedEnumClassName(enumName);
	return new ModelName(stripped).getClassName();
}

/**
 * Returns the full `Metadata*`-prefixed class name for a `Metadata_*` schema enum
 * (e.g. `Metadata_Magnification` → `MetadataMagnification`), or `undefined` for any
 * enum name that does not start with `Metadata_`.
 * Used when writing re-export aliases (`export { Canonical as MetadataAlias }`) so
 * that consumers can use either name while the underlying type remains identical.
 */
function toMetadataAliasEnumSymbol(enumName: string): string | undefined {
	if (!enumName.startsWith("Metadata_")) {
		return undefined;
	}
	return new ModelName(enumName).getClassName();
}

function enumValueToMemberKey(value: string): string {
	// ALL_CAPS identifiers without underscores (e.g. AUTO, MANUAL, NONE) are kept as-is.
	if (/^[A-Z][A-Z0-9]*$/.test(value)) {
		return value;
	}
	// ALL_CAPS identifiers with underscores (e.g. AES_128 → AES128, RC4_40 → RC440) have
	// underscores stripped so that member keys never use snake_case.
	if (/^[A-Z][A-Z0-9_]*$/.test(value)) {
		return value.replace(/_/g, "");
	}
	const normalized: string = value
		.replace(/[^A-Za-z0-9]+/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z0-9])/g, "$1 $2");
	const cleaned: string = normalized.replace(/[^A-Za-z0-9]+/g, "_");
	const parts: string[] = cleaned.split(/_+/).filter((part: string): boolean => part.length > 0);
	const pascal: string = parts
		.map((part: string): string => {
			const lower: string = part.toLowerCase();
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join("");
	const fallback: string = pascal.length > 0 ? pascal : "Value";
	return /^[0-9]/.test(fallback) ? `_${fallback}` : fallback;
}

/**
 * Scans the entire OpenAPI schema (including deeply nested objects) for
 * `x-webpdf-codegen.enumName` annotations and groups their value sets by enum name.
 *
 * Each unique `enumName` produces one {@link CanonicalEnumMappingEntry} with:
 * - The canonical symbol (stripped via {@link toCanonicalEnumSymbol})
 * - The default shared output path under `shared-enums/`
 * - The occurrence count and the number of unique value-set variants (used to detect
 *   collisions where two schemas share a name but have different members)
 *
 * Results are written to `build/codegen/adapter/x-webpdf-enumname-canonical-map.json`
 * by {@link writeCanonicalEnumMappings}.
 */
function buildCanonicalEnumMappings(rootDir: string): CanonicalEnumMappingEntry[] {
	const specPath: string = path.resolve(rootDir, "src/codegen/resources/schema/openapi.json");
	const spec: OpenApiSpec = JSON.parse(fs.readFileSync(specPath, "utf8")) as OpenApiSpec;
	const schemas: Record<string, unknown> = (spec.components?.schemas ?? {}) as Record<string, unknown>;

	const groupedValues: Map<string, string[][]> = new Map<string, string[][]>();
	const scanNode: (node: unknown) => void = (node: unknown): void => {
		if (!node || typeof node !== "object") {
			return;
		}
		const obj: Record<string, unknown> = node as Record<string, unknown>;
		const codegen: Record<string, unknown> = (obj["x-webpdf-codegen"] ?? {}) as Record<string, unknown>;
		const enumName: string | undefined = codegen["enumName"] as string | undefined;
		if (enumName) {
			const rawEnum: unknown = obj["enum"];
			const values: string[] = Array.isArray(rawEnum) ? rawEnum.filter((value: unknown): value is string => typeof value === "string") : [];
			const list: string[][] = groupedValues.get(enumName) ?? [];
			list.push(values);
			groupedValues.set(enumName, list);
		}
		for (const value of Object.values(obj)) {
			scanNode(value);
		}
	};

	for (const schemaDef of Object.values(schemas)) {
		scanNode(schemaDef);
	}

	const mappings: CanonicalEnumMappingEntry[] = [];
	for (const enumName of Array.from(groupedValues.keys()).sort((a: string, b: string): number => a.localeCompare(b))) {
		const variants: string[][] = groupedValues.get(enumName) ?? [];
		const serializedVariants: string[] = variants.map((entry: string[]): string => entry.join("||"));
		const uniqueVariants: string[] = Array.from(new Set<string>(serializedVariants)).sort((a: string, b: string): number => a.localeCompare(b));
		const canonicalValues: string[] = variants[0] ?? [];
		const canonicalSymbol: string = toCanonicalEnumSymbol(enumName);
		const sharedPath: string = `shared-enums/${canonicalSymbol}`;
		mappings.push({
			enumName,
			canonicalSymbol,
			sharedPath,
			occurrences: variants.length,
			uniqueValueVariants: uniqueVariants.length,
			values: canonicalValues,
		});
	}
	return mappings;
}

/** Builds and writes the canonical enum mapping report to `build/codegen/adapter/x-webpdf-enumname-canonical-map.json`. */
function writeCanonicalEnumMappings(rootDir: string): void {
	const mappings: CanonicalEnumMappingEntry[] = buildCanonicalEnumMappings(rootDir);
	const outDir: string = path.resolve(rootDir, "build/codegen/adapter");
	const outPath: string = path.resolve(outDir, "x-webpdf-enumname-canonical-map.json");
	const payload: {generatedAtUtc: string; mappings: CanonicalEnumMappingEntry[]} = {
		generatedAtUtc: new Date().toISOString(),
		mappings,
	};
	fs.mkdirSync(outDir, {recursive: true});
	fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/**
 * Computes a POSIX-style relative import path from one normalised (forward-slash)
 * file path to another, always prefixed with `./` or `../`.
 */
function toPosixRelativeImport(fromNormalizedPath: string, toNormalizedPath: string): string {
	const fromDir: string = path.posix.dirname(fromNormalizedPath);
	const rel: string = path.posix.relative(fromDir, toNormalizedPath);
	if (rel.startsWith("./")) {
		return rel;
	}
	if (rel.startsWith("../")) {
		return `./${rel}`;
	}
	return `./${rel}`;
}

/**
 * Builds a list of {@link CanonicalEnumUsageGroup} objects — one per unique
 * `x-webpdf-codegen.enumName` annotation — each listing the generated file paths that
 * reference that enum. Used by {@link applyCanonicalEnumTypeNormalization} to build the
 * `fileEnumPreferences` map that drives per-file canonical symbol selection.
 *
 * Two schema passes are performed:
 * - **Pass 1**: top-level schema properties with `enumName`.
 * - **Pass 2**: one level deeper — inline `type: "object"` sub-objects whose properties
 *   carry `enumName` (corresponds to `{schemaName}_{PropName}` compound models).
 *
 * @param classToPath             - Full class-to-path map (schema + raw descriptors).
 *   When omitted, falls back to the schema-only map from
 *   {@link getClassNameToGeneratedFileWithoutExt}.
 * @param resolvedCanonicalSymbols - Map of `enumName → post-disambiguation canonicalSymbol`
 *   built after the disambiguation loop in {@link applyCanonicalEnumTypeNormalization}.
 *   Without this, disambiguated groups (e.g. `Metadata_FormsFormat` → `MetadataFormsFormat`)
 *   would be stored under the wrong stripped symbol and the normalization loop would skip
 *   the correct group, leaving the inline enum unreplaced.
 */
function buildCanonicalEnumUsageGroups(
	rootDir: string,
	classToPath?: Map<string, string>,
	resolvedCanonicalSymbols?: Map<string, string>,
): CanonicalEnumUsageGroup[] {
	const specPath: string = path.resolve(rootDir, "src/codegen/resources/schema/openapi.json");
	const spec: OpenApiSpec = JSON.parse(fs.readFileSync(specPath, "utf8")) as OpenApiSpec;
	const schemas: Record<string, unknown> = (spec.components?.schemas ?? {}) as Record<string, unknown>;
	// Prefer the caller-supplied classToPath (which includes raw-descriptor entries for inline
	// sub-classes like ToolboxTranscribeTranscribe) over the schema-only fallback.
	const resolvedClassToPath: Map<string, string> = classToPath ?? getClassNameToGeneratedFileWithoutExt(rootDir);
	const grouped: Map<string, CanonicalEnumUsageGroup> = new Map<string, CanonicalEnumUsageGroup>();

	/** Register a single x-webpdf-codegen.enumName hint for a given generated file path. */
	function addEnumUsageEntry(enumName: string, propDef: Record<string, unknown>, normalizedPath: string): void {
		// Use the post-disambiguation canonical symbol when available (e.g. "MetadataFormsFormat"
		// instead of the stripped "FormsFormat" for Metadata_FormsFormat). Without this,
		// fileEnumPreferences stores the stripped symbol but the normalization loop iterates over
		// the disambiguated symbol, causing the preference check to skip the correct group and
		// leaving the inline enum unreplaced.
		const canonicalSymbol: string = resolvedCanonicalSymbols?.get(enumName) ?? toCanonicalEnumSymbol(enumName);
		const sharedPath: string = `shared-enums/${canonicalSymbol}`;
		const rawEnum: unknown = propDef["enum"];
		const values: string[] = Array.isArray(rawEnum) ? rawEnum.filter((v: unknown): v is string => typeof v === "string") : [];
		const existing: CanonicalEnumUsageGroup | undefined = grouped.get(enumName);
		if (!existing) {
			grouped.set(enumName, {
				enumName,
				canonicalSymbol,
				sharedPath,
				values,
				entries: [{normalizedPath}],
			});
			return;
		}
		if (!existing.entries.some((entry: CanonicalEnumUsageEntry): boolean => entry.normalizedPath === normalizedPath)) {
			existing.entries.push({normalizedPath});
		}
	}

	for (const [schemaName, schemaDef] of Object.entries(schemas)) {
		const className: string = new ModelName(schemaName).getClassName();
		const targetPath: string | undefined = resolvedClassToPath.get(className);
		if (!targetPath) {
			continue;
		}
		const normalizedPath: string = targetPath.replace(/\\/g, "/");
		const properties: Record<string, unknown> = ((schemaDef as Record<string, unknown>)?.["properties"] ?? {}) as Record<string, unknown>;

		// Pass 1: top-level schema properties with x-webpdf-codegen.enumName.
		for (const [, propDef] of Object.entries(properties)) {
			const propObj: Record<string, unknown> = propDef as Record<string, unknown>;
			const codegen: Record<string, unknown> = (propObj?.["x-webpdf-codegen"] ?? {}) as Record<string, unknown>;
			const enumName: string | undefined = codegen["enumName"] as string | undefined;
			if (enumName) {
				addEnumUsageEntry(enumName, propObj, normalizedPath);
			}
		}

		// Pass 2: one level deeper — inline sub-objects (type:"object" with properties).
		// These correspond to files generated by the raw OpenAPI generator using the
		// compound name "{schemaName}_{CapPropName}" (same convention used in
		// buildSchemaModelMetaMap). Without this pass, value-set collisions between
		// distinct enums (e.g. TranscribeErrorReport vs PdfaErrorReport) cause the
		// alphabetically first matching canonical symbol to be applied instead of the
		// schema-mandated one.
		for (const [propName, propDef] of Object.entries(properties)) {
			const propObj: Record<string, unknown> = propDef as Record<string, unknown>;
			if (propObj["type"] !== "object" || !propObj["properties"]) {
				continue;
			}
			const nestedSchemaName: string = `${schemaName}_${propName.charAt(0).toUpperCase()}${propName.slice(1)}`;
			const nestedClassName: string = new ModelName(nestedSchemaName).getClassName();
			const nestedTargetPath: string | undefined = resolvedClassToPath.get(nestedClassName);
			if (!nestedTargetPath) {
				continue;
			}
			const nestedNormalizedPath: string = nestedTargetPath.replace(/\\/g, "/");
			const nestedProperties: Record<string, unknown> = (propObj["properties"] ?? {}) as Record<string, unknown>;
			for (const [, nestedPropDef] of Object.entries(nestedProperties)) {
				const nestedPropObj: Record<string, unknown> = nestedPropDef as Record<string, unknown>;
				const nestedCodegen: Record<string, unknown> = (nestedPropObj?.["x-webpdf-codegen"] ?? {}) as Record<string, unknown>;
				const nestedEnumName: string | undefined = nestedCodegen["enumName"] as string | undefined;
				if (nestedEnumName) {
					addEnumUsageEntry(nestedEnumName, nestedPropObj, nestedNormalizedPath);
				}
			}
		}
	}
	return Array.from(grouped.values()).sort((a: CanonicalEnumUsageGroup, b: CanonicalEnumUsageGroup): number => a.enumName.localeCompare(b.enumName));
}

/**
 * Resolves the output file path (without extension, relative to generated-sources) for
 * a canonical enum. When `classToPath` already maps the canonical symbol (schema-backed),
 * that path is used; otherwise the default `shared-enums/<canonicalSymbol>` path applies.
 */
function resolveCanonicalEnumOutputPath(
	mapping: CanonicalEnumMappingEntry,
	classToPath: Map<string, string>,
): string {
	const mappedPath: string | undefined = classToPath.get(mapping.canonicalSymbol);
	if (mappedPath) {
		return mappedPath.replace(/\\/g, "/");
	}
	return mapping.sharedPath;
}

/**
 * Ensures that `content` contains `import { <canonicalSymbol> } from '<importPath>';`.
 * Inserts the import after the existing import block when absent.
 */
function ensureCanonicalEnumImport(content: string, canonicalSymbol: string, importPath: string): string {
	const importLine: string = `import { ${canonicalSymbol} } from '${importPath}';`;
	if (content.includes(importLine)) {
		return content;
	}
	const importPattern: RegExp = /^(import[^\n]*;\r?\n)+/;
	const match: RegExpMatchArray | null = content.match(importPattern);
	if (match?.[0]) {
		return `${match[0]}${importLine}\n${content.slice(match[0].length)}`;
	}
	return `${importLine}\n${content}`;
}

/**
 * Replaces all occurrences of `localEnumSymbol` in `content` with `canonicalSymbol`,
 * removing the local `export const`, `export type`, and `export enum` declarations that
 * defined it. Used to redirect a file's inline enum declaration to the shared canonical
 * file after {@link applyCanonicalEnumTypeNormalization} has written the shared enum.
 */
function rewriteEnumTypeUsage(content: string, localEnumSymbol: string, canonicalSymbol: string): string {
	const typeDeclPattern: RegExp = new RegExp(
		`\\n?export\\s+type\\s+${localEnumSymbol}\\s*=\\s*typeof\\s+${localEnumSymbol}\\[keyof\\s+typeof\\s+${localEnumSymbol}\\];\\r?\\n?`,
		"g",
	);
	let rewritten: string = content.replace(typeDeclPattern, "\n");
	const constDeclPattern: RegExp = new RegExp(
		`\\n?export\\s+const\\s+${localEnumSymbol}\\s*=\\s*\\{[\\s\\S]*?\\}\\s+as\\s+const;\\r?\\n?`,
		"g",
	);
	rewritten = rewritten.replace(constDeclPattern, "\n");
	const enumDeclPattern: RegExp = new RegExp(
		`\\n?export\\s+enum\\s+${localEnumSymbol}\\s*\\{[\\s\\S]*?\\}\\r?\\n?`,
		"g",
	);
	rewritten = rewritten.replace(enumDeclPattern, "\n");
	rewritten = rewritten.replace(new RegExp(`\\b${localEnumSymbol}\\b`, "g"), canonicalSymbol);
	return rewritten;
}

/**
 * Parsed representation of an inline enum declaration found in a generated model file.
 * Used by {@link parseInlineConstEnums} and {@link parseInlineRuntimeEnums} to identify
 * enum symbols and their string values so the normalization pass can replace them with
 * a single shared canonical enum.
 */
type InlineConstEnumDecl = {
	/** The declared identifier of the enum (e.g. `"DrawMode"`). */
	symbol: string;
	/** All string literal values declared inside the enum body. */
	values: string[];
};

/** Parses all `export const X = { … } as const;` blocks in `content` and returns their symbol names and string values. */
function parseInlineConstEnums(content: string): InlineConstEnumDecl[] {
	const out: InlineConstEnumDecl[] = [];
	const constPattern: RegExp = /export\s+const\s+([A-Za-z0-9_]+)\s*=\s*\{([\s\S]*?)\}\s+as\s+const;/g;
	let match: RegExpExecArray | null;
	while ((match = constPattern.exec(content)) !== null) {
		const symbol: string | undefined = match[1];
		const body: string | undefined = match[2];
		if (!symbol || !body) {
			continue;
		}
		const values: string[] = [];
		const valuePattern: RegExp = /:\s*'([^']+)'/g;
		let valueMatch: RegExpExecArray | null;
		while ((valueMatch = valuePattern.exec(body)) !== null) {
			if (valueMatch[1]) {
				values.push(valueMatch[1]);
			}
		}
		out.push({symbol, values});
	}
	return out;
}

/** Parses all `export enum X { … }` declarations in `content` and returns their symbol names and string values. */
function parseInlineRuntimeEnums(content: string): InlineConstEnumDecl[] {
	const out: InlineConstEnumDecl[] = [];
	const enumPattern: RegExp = /export\s+enum\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\}/g;
	let match: RegExpExecArray | null;
	while ((match = enumPattern.exec(content)) !== null) {
		const symbol: string | undefined = match[1];
		const body: string | undefined = match[2];
		if (!symbol || !body) {
			continue;
		}
		const values: string[] = [];
		const valuePattern: RegExp = /=\s*'([^']+)'/g;
		let valueMatch: RegExpExecArray | null;
		while ((valueMatch = valuePattern.exec(body)) !== null) {
			if (valueMatch[1]) {
				values.push(valueMatch[1]);
			}
		}
		out.push({symbol, values});
	}
	return out;
}

/**
 * Consolidates all duplicate inline enum declarations across the generated-sources tree into
 * shared canonical enum files under `generated-sources/shared-enums/`, then rewrites every
 * generated model file to import the canonical symbol instead of declaring the enum locally.
 *
 * The normalization proceeds in three phases:
 *
 * **Phase 1 — Canonical file creation.**
 * For each {@link CanonicalEnumMappingEntry} (produced by {@link buildCanonicalEnumMappings}),
 * a shared enum file is written. When two groups share the same canonical symbol but have
 * identical values (e.g. `Metadata_DrawMode` and `Operation_DrawMode` → `DrawMode`), only the
 * first group (Operation-prefixed wins over Metadata-prefixed) gets a physical file; subsequent
 * groups are redirected to the same path. When two groups share a canonical symbol but have
 * *different* values, the later group is disambiguated to its full `ModelName`-derived symbol
 * (e.g. `Metadata_FormsFormat` → `MetadataFormsFormat`) and a separate file is written.
 * Metadata-prefixed aliases are appended to the winning file as re-export aliases so that
 * `MetadataXxx === Xxx` at the TypeScript level.
 *
 * **Phase 2 — File-specific preference resolution.**
 * {@link buildCanonicalEnumUsageGroups} supplies schema-annotated `x-webpdf-codegen.enumName`
 * preferences. These are indexed into `fileEnumPreferences` so that when two canonical groups
 * have the same value set (e.g. `BackgroundPositionMode` and `WatermarkPositionMode`), each
 * model file can mandate the correct symbol rather than defaulting to alphabetical tie-breaking.
 *
 * **Phase 3 — Inline enum replacement.**
 * Every generated model file (excluding the canonical files themselves) is scanned for inline
 * `export const X = { … } as const` and `export enum X { … }` blocks whose value sets match a
 * canonical group. Matches are replaced with an import of the canonical symbol and all
 * references to the local symbol inside the file are rewritten to the canonical name.
 *
 * @param rootDir - Absolute path to the repository root.
 * @param writtenExports - Mutable list of posix-relative paths for all files written during
 *   this adapter run; canonical files are appended here so they are included in the barrel.
 * @param exportedSymbolsByPath - Mutable map of posix-relative path → exported symbol names;
 *   updated as canonical files are written or existing files are rewritten.
 * @param classToPath - Map of class name → posix-relative path for all generated model files;
 *   used to resolve the output path of canonical files and to detect schema-backed aliases.
 */
function applyCanonicalEnumTypeNormalization(
	rootDir: string,
	writtenExports: string[],
	exportedSymbolsByPath: Map<string, string[]>,
	classToPath: Map<string, string>,
): void {
	const generatedBaseDir: string = path.resolve(rootDir, "src/main/typescript/generated-sources");
	const protectedCanonicalPaths: Set<string> = new Set<string>();
	// Tracks which canonical symbols have already been written and to which path.
	// When two groups share the same canonicalSymbol (e.g. Metadata_DrawMode and
	// Operation_DrawMode both canonicalize to "DrawMode"), only the first gets a
	// physical file. Subsequent groups are redirected to the same sharedPath so that
	// the normalization loop below uses a consistent import target.
	const writtenCanonicalSymbols: Map<string, string> = new Map<string, string>();
	// Tracks the value set written for each canonical symbol to detect genuine value-set
	// collisions (two enums that share a canonical name but have different members).
	const writtenCanonicalValues: Map<string, string[]> = new Map<string, string[]>();
	const groups: CanonicalEnumUsageGroup[] = buildCanonicalEnumMappings(rootDir).map((mapping: CanonicalEnumMappingEntry): CanonicalEnumUsageGroup => ({
		enumName: mapping.enumName,
		canonicalSymbol: mapping.canonicalSymbol,
		sharedPath: resolveCanonicalEnumOutputPath(mapping, classToPath),
		values: mapping.values,
		entries: [],
	}));
	// Sort so that for the same canonicalSymbol, Operation_* groups take precedence over
	// Metadata_* groups. When both exist with the same values this is a no-op tie-break.
	// When values differ, this ensures the consumer-facing (Operation) variant wins the
	// short canonical name (e.g. FormsFormat → xml/fdf/xfdf/xdp), while the Metadata
	// variant is later disambiguated to its ModelName (e.g. MetadataFormsFormat).
	groups.sort((a: CanonicalEnumUsageGroup, b: CanonicalEnumUsageGroup): number => {
		if (a.canonicalSymbol !== b.canonicalSymbol) {
			return a.canonicalSymbol.localeCompare(b.canonicalSymbol);
		}
		const aIsMetadata: boolean = a.enumName.startsWith("Metadata_");
		const bIsMetadata: boolean = b.enumName.startsWith("Metadata_");
		if (aIsMetadata !== bIsMetadata) {
			return aIsMetadata ? 1 : -1;
		}
		return a.enumName.localeCompare(b.enumName);
	});
	for (const group of groups) {
		if (group.values.length === 0) {
			continue;
		}
		const existingCanonicalPath: string | undefined = writtenCanonicalSymbols.get(group.canonicalSymbol);
		if (existingCanonicalPath !== undefined) {
			const existingValues: string[] = writtenCanonicalValues.get(group.canonicalSymbol) ?? [];
			const sortedExisting: string = JSON.stringify([...existingValues].sort((a: string, b: string): number => a.localeCompare(b)));
			const sortedThis: string = JSON.stringify([...group.values].sort((a: string, b: string): number => a.localeCompare(b)));
			if (sortedExisting === sortedThis) {
				// Same values: redirect to the existing file (canonical tie-breaking).
				group.sharedPath = existingCanonicalPath;
				// If this is a Metadata_* group with a preservePrefix alias (e.g. Metadata_Magnification
				// → MetadataMagnification), append a re-export alias to the existing canonical file.
				// Using `export { Canonical as Alias }` instead of a duplicate enum keeps the types
				// identical at the TypeScript level: MetadataMagnification === Magnification, so
				// properties typed as Magnification still accept MetadataMagnification values.
				const metadataAlias: string | undefined = toMetadataAliasEnumSymbol(group.enumName);
				if (metadataAlias && metadataAlias !== group.canonicalSymbol && !classToPath.has(metadataAlias)) {
					const sharedFilePath: string = path.resolve(generatedBaseDir, `${existingCanonicalPath}.ts`);
					const existingSymbols: string[] = exportedSymbolsByPath.get(existingCanonicalPath) ?? [];
					if (!existingSymbols.includes(metadataAlias)) {
						const existingContent: string = fs.readFileSync(sharedFilePath, "utf8");
						fs.writeFileSync(
							sharedFilePath,
							`${existingContent}\nexport { ${group.canonicalSymbol} as ${metadataAlias} };\n`,
							"utf8",
						);
						exportedSymbolsByPath.set(existingCanonicalPath, [...existingSymbols, metadataAlias]);
					}
				}
				continue;
			}
			// Different values: genuine name collision. Disambiguate this group using its
			// full ModelName (e.g. Metadata_FormsFormat → MetadataFormsFormat), which is
			// distinct from the short canonical name already taken by the winning group.
			const disambiguatedSymbol: string = new ModelName(group.enumName).getClassName();
			group.canonicalSymbol = disambiguatedSymbol;
			group.sharedPath = `shared-enums/${disambiguatedSymbol}`;
			// Fall through to write a new file for the disambiguated group.
		}
		const sharedFilePath: string = path.resolve(generatedBaseDir, `${group.sharedPath}.ts`);
		const enumBody: string = group.values
			.map((value: string): string => `    ${enumValueToMemberKey(value)} = '${value}',`)
			.join("\n");
		const metadataAlias: string | undefined = toMetadataAliasEnumSymbol(group.enumName);
		let sharedContent: string = `export enum ${group.canonicalSymbol} {\n${enumBody}\n}\n`;
		const sharedSymbols: string[] = [group.canonicalSymbol];
		// Only include Metadata-prefixed alias in canonical file when it is not already
		// schema-backed (classToPath maps it to its own file). If schema-backed, the
		// normalization loop below will rewrite that file to import from here instead.
		if (metadataAlias && metadataAlias !== group.canonicalSymbol && !classToPath.has(metadataAlias)) {
			sharedContent += `\nexport enum ${metadataAlias} {\n${enumBody}\n}\n`;
			sharedSymbols.push(metadataAlias);
		}
		fs.mkdirSync(path.dirname(sharedFilePath), {recursive: true});
		fs.writeFileSync(sharedFilePath, sharedContent, "utf8");
		protectedCanonicalPaths.add(group.sharedPath);
		if (!writtenExports.includes(group.sharedPath)) {
			writtenExports.push(group.sharedPath);
		}
		exportedSymbolsByPath.set(group.sharedPath, sharedSymbols);
		writtenCanonicalSymbols.set(group.canonicalSymbol, group.sharedPath);
		writtenCanonicalValues.set(group.canonicalSymbol, group.values);
	}

	// Build a map of enumName → post-disambiguation canonicalSymbol for use in
	// buildCanonicalEnumUsageGroups. Without this, fileEnumPreferences stores the stripped
	// canonical symbol (e.g. "FormsFormat") for a disambiguated group (e.g. Metadata_FormsFormat
	// → "MetadataFormsFormat"), causing the normalization loop to skip the correct group and
	// leave the inline enum unreplaced.
	const resolvedCanonicalSymbols: Map<string, string> = new Map<string, string>(
		groups.map((g: CanonicalEnumUsageGroup): [string, string] => [g.enumName, g.canonicalSymbol]),
	);

	// Build a file-specific preference map from schema-annotated x-webpdf-codegen.enumName
	// properties. When two canonical groups share the same set of enum values (e.g.
	// BackgroundPositionMode and WatermarkPositionMode), the alphabetically first group
	// would otherwise win for every file. The preference map lets us mandate the correct
	// canonical symbol for each file based on the schema annotation, overriding that
	// alphabetical tie-breaking.
	const usageGroups: CanonicalEnumUsageGroup[] = buildCanonicalEnumUsageGroups(rootDir, classToPath, resolvedCanonicalSymbols);
	const fileEnumPreferences: Map<string, Map<string, string>> = new Map<string, Map<string, string>>();
	for (const usageGroup of usageGroups) {
		if (usageGroup.values.length === 0) {
			continue;
		}
		const sortedKey: string = JSON.stringify([...usageGroup.values].sort((a: string, b: string): number => a.localeCompare(b)));
		for (const entry of usageGroup.entries) {
			let filePrefs: Map<string, string> | undefined = fileEnumPreferences.get(entry.normalizedPath);
			if (!filePrefs) {
				filePrefs = new Map<string, string>();
				fileEnumPreferences.set(entry.normalizedPath, filePrefs);
			}
			// First schema-annotated occurrence wins for a given (file, value-set) pair.
			if (!filePrefs.has(sortedKey)) {
				filePrefs.set(sortedKey, usageGroup.canonicalSymbol);
			}
		}
	}

	for (const normalizedPath of writtenExports) {
		if (protectedCanonicalPaths.has(normalizedPath) || normalizedPath.startsWith("shared-enums/")) {
			continue;
		}
		const modelPath: string = path.resolve(generatedBaseDir, `${normalizedPath}.ts`);
		if (!fs.existsSync(modelPath)) {
			continue;
		}
		const original: string = fs.readFileSync(modelPath, "utf8");
		let rewritten: string = original;
		const filePrefs: Map<string, string> | undefined = fileEnumPreferences.get(normalizedPath);
		for (const group of groups) {
			const targetKey: string = JSON.stringify([...group.values].sort((a: string, b: string): number => a.localeCompare(b)));
			// When the schema explicitly mandates a canonical symbol for this file+value-set,
			// skip groups that are not the preferred one. This ensures that files like
			// WatermarkPosition get WatermarkPositionMode rather than the alphabetically
			// prior BackgroundPositionMode (which shares the same enum values).
			if (filePrefs !== undefined) {
				const preferredSymbol: string | undefined = filePrefs.get(targetKey);
				if (preferredSymbol !== undefined && preferredSymbol !== group.canonicalSymbol) {
					continue;
				}
			}
			const matchingSymbols: string[] = [...parseInlineConstEnums(rewritten), ...parseInlineRuntimeEnums(rewritten)]
				.filter((decl: InlineConstEnumDecl): boolean => JSON.stringify([...decl.values].sort((a: string, b: string): number => a.localeCompare(b))) === targetKey)
				.map((decl: InlineConstEnumDecl): string => decl.symbol);
			if (matchingSymbols.length === 0) {
				continue;
			}
			const importPath: string = toPosixRelativeImport(normalizedPath, group.sharedPath);
			rewritten = ensureCanonicalEnumImport(rewritten, group.canonicalSymbol, importPath);
			rewritten = matchingSymbols.reduce(
				(current: string, symbol: string): string => rewriteEnumTypeUsage(current, symbol, group.canonicalSymbol),
				rewritten,
			);
		}
		if (rewritten !== original) {
			fs.writeFileSync(modelPath, rewritten, "utf8");
			exportedSymbolsByPath.set(normalizedPath, collectExportedSymbols(rewritten));
		}
	}
}

/**
 * Verifies that every model name required by the legacy export contract has a corresponding
 * raw descriptor in `rawModelsDir`. Models present in {@link RAW_COVERAGE_PLACEHOLDER_MODELS}
 * are tolerated (a warning is printed but they are excluded from the returned list).
 *
 * @param rootDir - Absolute path to the repository root.
 * @param rawModelsDir - Absolute path to the raw OpenAPI Generator models directory
 *   (`build/codegen/raw/models/`).
 * @returns Array of strictly missing model names (excludes tolerated placeholder models).
 *   An empty array means full coverage.
 */
function verifyRawModelCoverage(rootDir: string, rawModelsDir: string): string[] {
	const expectedModelNames: string[] = getExpectedRawModelNames(rootDir);
	const expectedClassToPath: Map<string, string> = getClassNameToGeneratedFileWithoutExt(rootDir);
	const descriptors: RawModelDescriptor[] = buildRawModelManifest(rawModelsDir);
	const missingModels: string[] = expectedModelNames.filter((modelName: string): boolean => {
		const targetNoExt: string | undefined = expectedClassToPath.get(modelName);
		if (!targetNoExt) {
			return true;
		}
		return !resolveDescriptorForExpected(modelName, targetNoExt, descriptors);
	});
	const toleratedPlaceholderModels: string[] = missingModels.filter((modelName: string): boolean => RAW_COVERAGE_PLACEHOLDER_MODELS.has(modelName));
	const strictMissingModels: string[] = missingModels.filter((modelName: string): boolean => !RAW_COVERAGE_PLACEHOLDER_MODELS.has(modelName));

	if (strictMissingModels.length > 0) {
		const preview: string = strictMissingModels.slice(0, 20).join(", ");
		console.warn(
			`[codegen] Raw model coverage mismatch. Missing ${strictMissingModels.length} model(s) in ${rawModelsDir}. ` +
			`First missing: ${preview}`,
		);
	}
	if (toleratedPlaceholderModels.length > 0) {
		const preview: string = toleratedPlaceholderModels.slice(0, 20).join(", ");
		console.warn(
			`[codegen] Raw coverage uses placeholder fallback for ${toleratedPlaceholderModels.length} model(s): ${preview}`,
		);
	}
	return strictMissingModels;
}

/**
 * Entry point for the adapter stage of the TypeScript codegen pipeline.
 *
 * Consumes the raw output produced by the upstream OpenAPI Generator CLI
 * (`build/codegen/raw/`) and transforms it into the final TypeScript sources
 * under `src/main/typescript/generated-sources/`. The adapter owns all
 * post-processing logic that the upstream generator does not support:
 *
 * 1. **Canonical enum mappings** — writes `build/codegen/adapter/canonical-enum-mappings.json`
 *    and prepares the shared-enum consolidation data used in step 6.
 * 2. **Raw manifest** — scans `raw/models/` and writes a JSON manifest of all descriptors
 *    (`build/codegen/adapter/raw-manifest.json`) for diagnostics and downstream passes.
 * 3. **Coverage verification** — checks that every model required by the legacy export
 *    contract is represented in the raw output; logs warnings for gaps.
 * 4. **Object candidate analysis** — identifies raw model files that represent plain
 *    object/enum/alias types and writes `build/codegen/adapter/raw-object-candidates.json`.
 * 5. **Model materialization** — the primary transformation pass ({@link materializeRawModels}):
 *    reads each raw descriptor, rewrites it to a class-based TypeScript model with
 *    `fromJson`/`toJson`/`clone` lifecycle methods, and writes the result to
 *    `generated-sources/`.
 * 6. **Summary** — writes `build/codegen/adapter/adapter-summary.json` with coverage metrics.
 *
 * @param rootDir - Absolute path to the repository root.
 */
export function adaptOpenApiRawOutput(
	rootDir: string,
): void {
	const rawDir: string = path.resolve(rootDir, "build/codegen/raw");
	const rawModelsDir: string = path.resolve(rawDir, "models");

	if (!fs.existsSync(rawDir)) {
		throw new Error(`[codegen] Raw output directory missing: ${rawDir}`);
	}

	if (fs.existsSync(rawDir) && !fs.existsSync(rawModelsDir)) {
		throw new Error(`[codegen] Raw models folder missing: ${rawModelsDir}`);
	}
	writeCanonicalEnumMappings(rootDir);
	let descriptors: RawModelDescriptor[] = [];
	if (fs.existsSync(rawModelsDir)) {
		descriptors = buildRawModelManifest(rawModelsDir);
		writeRawManifest(rootDir, descriptors);
		const missingFromCoverage: string[] = verifyRawModelCoverage(rootDir, rawModelsDir);
		const candidates: RawObjectCandidate[] = analyzeRawObjectCandidates(rootDir, rawModelsDir, descriptors);
		writeRawObjectCandidates(rootDir, candidates);
		const summary: AdapterSummary = materializeRawModels(rootDir, rawModelsDir, descriptors);
		summary.missingFromRaw = Array.from(new Set<string>([...summary.missingFromRaw, ...missingFromCoverage])).sort((a: string, b: string): number => a.localeCompare(b));
		writeAdapterSummary(rootDir, summary);
	}
}
