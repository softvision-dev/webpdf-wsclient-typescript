/**
 * Prefix mapping configuration used to map schema model names to output folders/packages.
 */
export class PackagePrefix {
	public readonly prefix: string;
	public readonly location: string;
	public readonly preservePrefixTypes: string[];

	/**
	 * @param prefix Schema name prefix to match.
	 * @param location Relative output location for mapped models.
	 * @param preservePrefixTypes Full schema names that must keep their prefix.
	 */
	public constructor(prefix: string, location: string, preservePrefixTypes: string[]) {
		this.prefix = prefix;
		this.location = location;
		this.preservePrefixTypes = preservePrefixTypes;
	}

	/**
	 * Returns the configured schema prefix.
	 */
	public getAPIPrefix(): string {
		return this.prefix;
	}

	/**
	 * Returns the relative output folder for generated files.
	 */
	public getFileLocation(): string {
		return this.location;
	}

	/**
	 * Returns the package-style output path.
	 */
	public getPackageLocation(): string {
		return this.location.replace(/\//g, ".");
	}

	/**
	 * Returns whether a concrete model must keep its original schema prefix.
	 *
	 * @param modelName Full schema model name.
	 */
	public shallPreservePrefix(modelName: string): boolean {
		return this.preservePrefixTypes.includes(modelName);
	}
}
