'use strict';

const {execSync} = require('child_process');
const fs = require("fs");
const fetch = require("node-fetch");
const {Headers} = require("node-fetch");
const {URL} = require('url');
const FormData = require('form-data');
const Path = require('path');

const configPath = Path.join(__dirname, "config", "buildConfig.json");

(async () => {
	try {
		console.log('-- build project --');
		execSync('yarn run build', {stdio: "inherit"});

		let config = JSON.parse(fs.readFileSync(configPath).toString());

		if (config.publish === "local") {
			console.log('-- pack project --');
			execSync('npm pack', {stdio: "inherit"});

			let version = process.env.npm_package_version;
			let packageName = 'softvision-webpdf-wsclient-typescript-' + version + '.tgz';
			let readStream = fs.createReadStream(packageName);

			const formData = new FormData();
			formData.append('file', readStream);

			let headers = new Headers();
			headers.append('Accept', 'application/json');
			headers.append(
				'Authorization',
				'Basic ' + Buffer.from(config.username + ":" + config.password).toString("base64")
			);

			let url = new URL(config.api);
			url.searchParams.set("repository", config.repository);
			let response = await fetch(url, {
				method: "POST",
				headers: headers,
				body: formData
			});

			if (!response.ok) {
				let error = new Error(response.statusText);
				error.code = response.status;
				error.stack = await response.text();
				throw error;
			}
		} else {
			// public publish needs .npmrc file with: //registry.npmjs.org/:_authToken=<TOKEN>
			let version = process.env.npm_package_version;

			console.log('-- deploy project --');
			execSync('yarn publish --access=public --always-auth=true --non-interactive --new-version ' + version, {stdio: "inherit"});
		}
	} catch (err) {
		if (typeof err.stderr !== 'undefined' && err.stderr !== null && err.stderr.toString() !== '') {
			console.error(err.stderr.toString());
		} else if (typeof err.stdout !== 'undefined' && err.stdout !== null && err.stdout.toString() !== '') {
			console.error(err.stdout.toString());
		} else {
			console.error(err);
		}

		process.exit(1);
	}
})();