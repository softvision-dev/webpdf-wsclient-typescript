export interface ConfigNode {
	getString(key: string, defaultValue: string): string;
	getBoolean(key: string, defaultValue: boolean): boolean;
	getInteger(key: string, defaultValue: number): number;
}