'use strict';

const {execSync} = require('child_process');

(async () => {
    try {
        console.log('-- clean folders --');
        execSync('shx rm -rf lib build', {stdio: "inherit"});

        console.log('-- generate sources --');
        execSync('yarn run codegen', {stdio: "inherit"});

        console.log('-- compile sources (CJS) --');
        execSync('yarn run compile', {stdio: "inherit"});

        console.log('-- compile sources (ESM) --');
        execSync('yarn run compile:esm', {stdio: "inherit"});
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
