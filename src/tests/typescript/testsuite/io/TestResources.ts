import fs from "node:fs";
import path from "node:path";

export class TestResources {
	private readonly resourcePath: string;
	private readonly RESOURCES_PATH = "../../../resources/"

	constructor(folder: string) {
		this.resourcePath = path.join(import.meta.dirname, this.RESOURCES_PATH, folder);
	}

	public getResource(fileName: string, options?: { flag?: string; } | null): Buffer;
	public getResource(fileName: string, options: { encoding: BufferEncoding; flag?: string; } | BufferEncoding): string;
	public getResource(fileName: string, options?: { encoding?: BufferEncoding; flag?: string; } | BufferEncoding | null): Buffer | string {
		const resolvedPath: string = path.join(this.resourcePath, fileName);
		if (typeof options === "string") {
			return fs.readFileSync(resolvedPath, options);
		}
		if (typeof options !== "undefined" && options !== null && typeof options.encoding !== "undefined") {
			return fs.readFileSync(resolvedPath, options as { encoding: BufferEncoding; flag?: string; });
		}
		return fs.readFileSync(resolvedPath, options as { flag?: string; } | undefined);
	}

	public getPath(): string {
		return this.resourcePath;
	}
}