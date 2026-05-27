import path from "node:path";

/**
 * Utility wrapper for a fully qualified model name and path derivations.
 */
export class TypeName {
	private readonly modelName: string;
	private readonly pack: string;
	private readonly name: string;

	/**
	 * Creates a TypeName from a qualified model name (`pkg.Name`) or explicit parts.
	 */
	public constructor(modelName: string);
	public constructor(pack: string, name: string);
	public constructor(modelName: string, pack?: string, name?: string) {
		if (typeof pack === "string" && typeof name === "string") {
			this.modelName = modelName;
			this.pack = pack;
			this.name = name;
			return;
		}

		let resolvedName: string = modelName;
		let resolvedPackage: string = "";
		if (modelName.includes(".")) {
			const split: string[] = modelName.split(".");
			resolvedName = split[split.length - 1] ?? modelName;
			resolvedPackage = split.slice(0, split.length - 1).join(".");
		}

		this.modelName = modelName;
		this.pack = resolvedPackage;
		this.name = resolvedName;
	}

	/**
	 * Returns the full model name as provided.
	 */
	public getModelName(): string {
		return this.modelName;
	}

	/**
	 * Returns the package segment of the model.
	 */
	public getPack(): string {
		return this.pack;
	}

	/**
	 * Returns the short model name without package.
	 */
	public getName(): string {
		return this.name;
	}

	/**
	 * Returns the fully qualified package location relative to a base package.
	 *
	 * @param basePath Base package path.
	 */
	public getPackageLocation(basePath: string): string {
		const packagePath: string = this.getPackagePath(basePath);
		return packagePath.length === 0 ? this.name : `${packagePath}.${this.name}`;
	}

	/**
	 * Returns package path only (without model name), relative to a base package.
	 *
	 * @param basePath Base package path.
	 */
	public getPackagePath(basePath: string): string {
		if (basePath.length === 0) {
			return this.pack;
		}
		if (this.pack.length === 0) {
			return basePath;
		}
		return `${basePath}.${this.pack}`;
	}

	/**
	 * Returns root import location for the model.
	 */
	public getRootFileLocation(): string {
		return `./${path.join(this.pack.replace(/\./g, "/"), this.name).replace(/\\/g, "/")}`;
	}

	/**
	 * Returns the relative file location including model name.
	 *
	 * @param basePath Base package path.
	 */
	public getRelativeFileLocation(basePath: string): string {
		const relativePath: string = this.getRelativeFilePath(basePath);
		return relativePath.length === 0 ? this.name : `${relativePath}/${this.name}`;
	}

	/**
	 * Returns relative folder path between base package and model package.
	 *
	 * @param basePath Base package path.
	 */
	public getRelativeFilePath(basePath: string): string {
		if (this.pack === basePath) {
			return ".";
		}
		const current: string = this.pack.replace(/\./g, "/");
		const target: string = basePath.replace(/\./g, "/");
		return `./${path.relative(target, current).replace(/\\/g, "/")}`;
	}
}
