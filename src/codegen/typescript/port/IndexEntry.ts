/**
 * Additional ordering metadata used for index generation.
 */
export type PortModelMeta = {
	parentClassName?: string;
	extendsName?: string;
};

/**
 * One generated index entry including exported type names and metadata.
 */
export class IndexEntry {
	private readonly exportedTypeNames: string[] = [];
	private readonly fileLocation: string;
	private readonly packageLocation: string;
	private readonly model: PortModelMeta;

	/**
	 * @param fileLocation Relative file location (without extension).
	 * @param packageLocation Package-style location.
	 * @param model Ordering metadata.
	 */
	public constructor(fileLocation: string, packageLocation: string, model: PortModelMeta) {
		this.fileLocation = fileLocation;
		this.packageLocation = packageLocation;
		this.model = model;
	}

	/**
	 * Returns the file location used in generated exports.
	 */
	public getFileLocation(): string {
		return this.fileLocation;
	}

	/**
	 * Returns the package-style location used for collision checks.
	 */
	public getPackageLocation(): string {
		return this.packageLocation;
	}

	/**
	 * Returns ordering metadata of the model.
	 */
	public getModel(): PortModelMeta {
		return this.model;
	}

	/**
	 * Returns exported names as a comma-separated string for `export { ... }`.
	 */
	public getExportedNames(): string {
		return this.exportedTypeNames.join(",");
	}

	/**
	 * Returns all exported type names for this entry.
	 */
	public getExportedTypeNames(): string[] {
		return this.exportedTypeNames;
	}

	/**
	 * Adds an exported type name to this entry.
	 *
	 * @param typeName Exported symbol name.
	 */
	public addExportedTypeName(typeName: string): IndexEntry {
		this.exportedTypeNames.push(typeName);
		return this;
	}
}
