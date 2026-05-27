import {IndexEntry} from "./IndexEntry";

/**
 * In-memory model export index with deterministic ordering support.
 */
export class Index {
	private readonly names = new Map<string, IndexEntry>();
	private readonly modelPackage: string;
	private orderedEntries: IndexEntry[] = [];

	/**
	 * @param modelPackage Logical root package for generated models.
	 */
	public constructor(modelPackage: string) {
		this.modelPackage = modelPackage;
	}

	/**
	 * Adds one or more index entries and registers all exported names.
	 *
	 * @throws Error when two different package locations export the same symbol.
	 */
	public add(...indexEntries: IndexEntry[]): Index {
		for (const indexEntry of indexEntries) {
			if (this.contains(indexEntry)) {
				continue;
			}
			for (const exportedName of indexEntry.getExportedTypeNames()) {
				this.names.set(exportedName, indexEntry);
			}
			this.orderedEntries.push(indexEntry);
		}
		return this;
	}

	/**
	 * Returns index entry for a specific exported name.
	 *
	 * @param exportedName Exported symbol to resolve.
	 */
	public get(exportedName: string): IndexEntry | undefined {
		return this.names.get(exportedName);
	}

	/**
	 * Checks whether the index already contains any exported name from the entry.
	 *
	 * @param indexEntry Entry to check.
	 * @throws Error when the same exported symbol appears in a different package location.
	 */
	public contains(indexEntry: IndexEntry): boolean {
		for (const exportedName of indexEntry.getExportedTypeNames()) {
			if (this.names.has(exportedName)) {
				const existing: IndexEntry | undefined = this.names.get(exportedName);
				if (existing && existing.getPackageLocation() !== indexEntry.getPackageLocation()) {
					throw new Error(
						`${existing.getPackageLocation()} and ${indexEntry.getPackageLocation()} collide for name ${exportedName}!`,
					);
				}
				return true;
			}
		}
		return false;
	}

	/**
	 * Sorts entries based on inheritance and extension dependencies.
	 */
	public sort(): Index {
		const nextOrdered: IndexEntry[] = [];
		for (const entry of this.orderedEntries) {
			this.addOrdered(nextOrdered, entry);
		}
		this.orderedEntries = nextOrdered;
		return this;
	}

	/**
	 * Inserts an entry in dependency-correct order.
	 */
	private addOrdered(orderedList: IndexEntry[], entry: IndexEntry): void {
		if (orderedList.includes(entry)) {
			return;
		}

		const parentName: string | undefined = entry.getModel().parentClassName;
		const extendsName: string | undefined = entry.getModel().extendsName;
		if (parentName && this.names.has(parentName)) {
			this.addOrdered(orderedList, this.names.get(parentName)!);
		}
		if (extendsName && this.names.has(extendsName)) {
			this.addOrdered(orderedList, this.names.get(extendsName)!);
		}

		orderedList.push(entry);
	}

	/**
	 * Returns entries in deterministic export order.
	 */
	public getOrderedEntries(): IndexEntry[] {
		return this.orderedEntries;
	}

	/**
	 * Returns the logical root model package.
	 */
	public getModelPackage(): string {
		return this.modelPackage;
	}
}
