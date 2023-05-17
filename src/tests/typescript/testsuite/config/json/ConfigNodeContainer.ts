import {ConfigNode} from "./ConfigNode";
import {JsonConfigNode} from "./JsonConfigNode";

export abstract class ConfigNodeContainer implements ConfigNode {
	private readonly node: JsonConfigNode;

	public constructor(node: any) {
		this.node = new JsonConfigNode(node);
	}

	public getString(key: string, defaultValue: string): string {
		return this.node.getString(key, defaultValue);
	}

	public getBoolean(key: string, defaultValue: boolean): boolean {
		return this.node.getBoolean(key, defaultValue);
	}

	public getInteger(key: string, defaultValue: number): number {
		return this.node.getInteger(key, defaultValue);
	}
}