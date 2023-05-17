import {ConfigNode} from "./ConfigNode";
import {JsonNode} from "./JsonNode";

export class JsonConfigNode implements ConfigNode {
	private readonly node: any;

	constructor(node: any) {
		this.node = node
	}

	getString(key: string, defaultValue: string): string {
		if (typeof this.node === "undefined") {
			return defaultValue;
		}

		let valueNode: any = this.getNode(key);
		return typeof valueNode !== "undefined" ? valueNode : defaultValue;
	}

	getBoolean(key: string, defaultValue: boolean): boolean {
		if (typeof this.node === "undefined") {
			return defaultValue;
		}

		let valueNode: any = this.getNode(key);
		return typeof valueNode !== "undefined" ? valueNode : defaultValue;
	}

	getInteger(key: string, defaultValue: number): number {
		if (typeof this.node === "undefined") {
			return defaultValue;
		}

		let valueNode: any = this.getNode(key);
		return typeof valueNode !== "undefined" ? valueNode : defaultValue;
	}

	private getNode(key: string): any {
		return JsonNode.find(this.node, key);
	}
}