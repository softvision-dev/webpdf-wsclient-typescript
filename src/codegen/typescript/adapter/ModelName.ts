import fs from "node:fs";
import path from "node:path";
import {PackagePrefix} from "./PackagePrefix";

/**
 * Generator configuration read from `src/codegen/resources/generator_config.json`.
 */
type GeneratorConfig = {
	packages?: Array<{
		prefix?: string;
		location?: string;
		preservePrefix?: string[];
	}>;
};

const packagePrefixes: PackagePrefix[] = [];

/**
 * Uppercases the first character of a string.
 */
function capitalize(value: string): string {
	if (value.length === 0) {
		return value;
	}
	return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Lazily loads and caches prefix mapping configuration for model name resolution.
 */
function initPackageInfo(): PackagePrefix[] {
	if (packagePrefixes.length > 0) {
		return packagePrefixes;
	}

	const configPath: string = path.resolve(__dirname, "../../resources/generator_config.json");
	const raw: string = fs.readFileSync(configPath, "utf8");
	const parsed: GeneratorConfig = JSON.parse(raw) as GeneratorConfig;

	for (const entry of parsed.packages ?? []) {
		packagePrefixes.push(
			new PackagePrefix(
				entry.prefix ?? "",
				entry.location ?? "",
				entry.preservePrefix ?? [],
			),
		);
	}

	return packagePrefixes;
}

/**
 * Resolves a schema name to a generated class name and output locations.
 */
export class ModelName {
	private readonly className: string;
	private packageName = "";
	private fileName = "";

	/**
	 * @param inputPath Schema model name (for example `Operation_MergeMode`).
	 */
	public constructor(inputPath: string) {
		let resolvedClassName: string = inputPath;
		for (const prefix of initPackageInfo()) {
			if (inputPath.startsWith(prefix.getAPIPrefix())) {
				resolvedClassName = prefix.shallPreservePrefix(resolvedClassName)
					? resolvedClassName
					: resolvedClassName.replace(prefix.getAPIPrefix(), "");
				this.fileName = prefix.getFileLocation();
				this.packageName = prefix.getPackageLocation();
				break;
			}
		}

		this.className = resolvedClassName
			.split("_")
			.map((part: string): string => capitalize(part))
			.join("");
	}

	/**
	 * Returns the relative file location (without extension) for the model.
	 */
	public getFileName(): string {
		return this.fileName.length === 0 ? this.className : `${this.fileName}${this.className}`;
	}

	/**
	 * Returns the package-style output location for index metadata.
	 */
	public getPackageName(): string {
		return this.packageName.length === 0 ? this.className : `${this.packageName}${this.className}`;
	}

	/**
	 * Returns the generated TypeScript class/interface base name.
	 */
	public getClassName(): string {
		return this.className;
	}
}
