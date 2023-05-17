'use strict';

const {execSync} = require('child_process');
const download = require('download');
const decompress = require('decompress');
const decompressTargz = require('decompress-targz');
const Path = require('path');
const fs = require("fs");

const isWin = /^win/.test(process.platform);
const mvnVersion = '3.8.8';
const openjdkVersion = '11.0.16';
const openjdkBuildNumber = '8';

(async () => {
	try {
		console.log('-- clean folders --');
		execSync('yarn run clean', {stdio: "inherit"});

		console.log('-- download java --');
		let javaBaseUrl = 'https://github.com/AdoptOpenJDK/openjdk11-upstream-binaries/releases/download/jdk-' + openjdkVersion + '%2B' + openjdkBuildNumber + "/";
		let platformUrl = 'OpenJDK11U-jdk_x64_windows_' + openjdkVersion + '_' + openjdkBuildNumber + '.zip';
		let options = {strip: 1};

		if (!isWin) {
			platformUrl = 'OpenJDK11U-jdk_x64_linux_' + openjdkVersion + '_' + openjdkBuildNumber + '.tar.gz';
			options.plugins = [decompressTargz()];
		}

		await download(
			javaBaseUrl + platformUrl, 'build'
		);
		fs.mkdirSync("build/jre");
		await decompress(Path.join('build', platformUrl), Path.join('build', 'jre'), options);

		console.log('-- download maven --');
		let mvnMainVersion = mvnVersion.split('.')[0];
		let mvnUrl = 'https://dlcdn.apache.org/maven/maven-' + mvnMainVersion + '/' + mvnVersion + '/binaries/apache-maven-' + mvnVersion + '-bin.tar.gz';
		await download(mvnUrl, 'build');
		fs.mkdirSync("build/maven");
		await decompress(
			'build/apache-maven-' + mvnVersion + '-bin.tar.gz', 'build/maven', {
				strip: 1,
				plugins: [decompressTargz()]
			}
		);

		console.log('-- generate sources --');
		let javaHome = Path.join(__dirname, 'build', 'jre');
		let mvnPath = Path.join(__dirname, 'build', 'maven', 'bin', isWin ? 'mvn.cmd' : 'mvn');
		let codegenPath = Path.join(__dirname, 'codegen');
		let pomPath = Path.join(codegenPath, 'pom.xml');
		execSync(mvnPath + ' clean package -f ' + pomPath, {
			cwd: codegenPath, windowsHide: true, env: {
				JAVA_HOME: javaHome
			},
			stdio: "inherit"
		});

		console.log('-- compile sources --');
		execSync('tsc', {stdio: "inherit"});
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
