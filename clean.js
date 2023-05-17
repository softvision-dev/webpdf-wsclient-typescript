"use strict";

const fs = require("fs");
const Path = require("path");

function cleanup(path) {
	if (!fs.existsSync(path)) {
		return;
	}

	console.log("clean", path);
	fs.rmSync(path, { recursive: true, force: true });
	fs.mkdirSync(path);
}

let paths = [
	Path.join(__dirname, "build"), // build path
	Path.join(__dirname, "lib"), // output path
];

for (let path of paths) {
	cleanup(path);
}