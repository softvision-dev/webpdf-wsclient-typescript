import {execSync} from "node:child_process";

(async () => {
    try {
        console.log('-- clean folders --');
        execSync('shx rm -rf lib build', {stdio: "inherit"});

        console.log('-- generate sources --');
        execSync('yarn run codegen', {stdio: "inherit"});

        console.log('-- compile sources --');
        execSync('yarn run compile', {stdio: "inherit"});

        console.log('-- package smoke test --');
        // The test hook WSCLIENT_SMOKE_PACKAGE_TARBALL must never leak into the release build's
        // own smoke test run: it would silently redirect the build's package gate onto whatever
        // tarball a developer's shell happens to have exported for a one-off test invocation.
        const buildEnv = {...process.env};
        delete buildEnv.WSCLIENT_SMOKE_PACKAGE_TARBALL;
        execSync('yarn run test:package', {stdio: "inherit", env: buildEnv});
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
