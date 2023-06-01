'use strict';

const {execSync} = require('child_process');

(async () => {
    try {
        console.log('-- clean folders --');
        execSync('yarn run clean', {stdio: "inherit"});

        console.log('-- generate sources --');
        let workdir = "/usr/src/wsclient";
        let volume = __dirname + ":" + workdir;
        let pomPath = workdir + "/codegen/pom.xml";
        let dockerCommand = [
            "docker run", "-it", "--rm", "--name wsclient-maven", "-v " + volume, "-w " + workdir,
            "maven:3.9.2-eclipse-temurin-11-alpine"
        ].join(" ");
        execSync(dockerCommand + ' mvn clean package -f ' + pomPath, {
            stdio: "inherit"
        });

        console.log('-- compile sources --');
        execSync('yarn run compile', {stdio: "inherit"});
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
