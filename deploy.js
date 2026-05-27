'use strict';

require('dotenv').config();

const {execSync} = require('child_process');
const {URL} = require('url');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const packageJson = require('./package.json');

const PUBLISH_TARGETS = new Set(['local', 'public']);

const getArgValue = (name) => {
    const withEquals = process.argv.find((arg) => arg.startsWith(name + '='));
    if (withEquals) {
        return withEquals.substring(name.length + 1);
    }

    const index = process.argv.indexOf(name);
    if (index !== -1) {
        return process.argv[index + 1];
    }

    return undefined;
};

const resolveTarget = () => {
    const target = getArgValue('--target') || process.env.DEPLOY_TARGET;
    if (!target || !PUBLISH_TARGETS.has(target)) {
        throw new Error('Missing or invalid deploy target. Use --target local|public or DEPLOY_TARGET=local|public.');
    }

    return target;
};

const requireEnv = (name) => {
    const rawValue = process.env[name];
    if (!rawValue) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    const value = rawValue.trim();
    if (!value) {
        throw new Error(`Environment variable is empty after trimming: ${name}`);
    }

    return value;
};

const packProject = () => {
    execSync('npm pack', {stdio: 'inherit'});
    const packageName = process.env.npm_package_name || packageJson.name;
    const packageVersion = process.env.npm_package_version || packageJson.version;
    const archiveName = `${packageName.replace('@', '').replace('/', '-')}-${packageVersion}.tgz`;
    return archiveName;
};

const publishLocal = async () => {
    const api = requireEnv('LOCAL_PUBLISH_API');
    const repository = requireEnv('LOCAL_PUBLISH_REPOSITORY');
    const username = requireEnv('LOCAL_PUBLISH_USERNAME');
    const password = requireEnv('LOCAL_PUBLISH_PASSWORD');
    const npmTag = process.env.WEBPDF_LOCAL_PUBLISH_NPM_TAG ? process.env.WEBPDF_LOCAL_PUBLISH_NPM_TAG.trim() : '';

    console.log('-- pack project --');
    const packageFile = packProject();

    const formData = new FormData();
    formData.append('npm.asset', fs.createReadStream(packageFile));
    if (npmTag) {
        formData.append('npm.tag', npmTag);
    }

    const url = new URL(api);
    url.searchParams.set('repository', repository);

    console.log('-- upload package to nexus components api --');
    const response = await axios.post(url.toString(), formData, {
        headers: {
            ...formData.getHeaders(),
            Accept: 'application/json'
        },
        auth: {
            username,
            password
        },
        maxBodyLength: Infinity
    });

    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Local publish failed: ${response.status} ${response.statusText}`);
    }
};

const publishPublic = () => {
    // Requires npm auth config (for example via NODE_AUTH_TOKEN/NPM_TOKEN in CI).
    console.log('-- publish package to npmjs --');
    execSync('yarn npm publish --access public', {stdio: 'inherit'});
};

(async () => {
    try {
        const target = resolveTarget();
        if (target === 'local') {
            await publishLocal();
        } else if (target === 'public') {
            publishPublic();
        }
    } catch (err) {
        if (err.response) {
            console.error(`HTTP ${err.response.status} ${err.response.statusText}`);
            if (err.response.data) {
                console.error(err.response.data);
            }
            process.exit(1);
        }

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
