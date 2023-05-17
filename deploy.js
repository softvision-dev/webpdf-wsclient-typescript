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
			// TODO: deploy to live repo
			// let registry = execSync('npm config get registry', {stdio: "inherit"}).toString();
			//
			// let username = execSync('npm config get username', {stdio: "inherit"}).toString();
			// username.replaceAll("\n", "");
			// let password = execSync('npm config get password', {stdio: "inherit"}).toString();
			// password.replaceAll("\n", "");
			// let token = ':_authToken=' + Buffer.from(username + ':' + password).toString('base64');
			//
			// console.log('-- deploy project --');
			// execSync('npm config list', {stdio: "inherit"});
			// execSync('npm login --registry=' + registry + token + ' --non-interactive', {stdio: "inherit"});
			// execSync('npm publish --registry=' + registry, {stdio: "inherit"});
			// execSync('npm logout --registry=' + registry, {stdio: "inherit"});
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