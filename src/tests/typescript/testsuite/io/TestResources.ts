const fs = require('fs');
const path = require('path');

export class TestResources {
	private readonly resourcePath: string;
	private readonly RESOURCES_PATH = "../../../resources/"

	constructor(folder: string) {
		this.resourcePath = path.join(__dirname, this.RESOURCES_PATH, folder);
	}

	public getResource(fileName: string, options?: { encoding: string; flag?: string; } | string): Buffer {
		return fs.readFileSync(path.join(this.resourcePath, fileName), options);
	}

	public getPath(): string {
		return this.resourcePath;
	}
}