export class JsonNode {
	public static find(node: any, path: string): any {
		if (typeof node === "undefined") {
			return;
		}

		let subpath: Array<string> = path.split("/").filter((n) => {
			return n;
		}).reverse();
		let key: string | undefined = subpath.pop();

		if (typeof key === "undefined" || typeof node[key] === "undefined") {
			return;
		}

		if (subpath.length > 0) {
			return this.find(node[key], subpath.join("/"));
		}

		return node[key];
	}
}