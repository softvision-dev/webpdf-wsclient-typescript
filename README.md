# webPDF wsclient TypeScript
This repository contains a simplified and optimized client library for the webPDF server, and serves as an alternative to more complex REST APIs.
The library implements the required stubs and session management in ready-to-use interface classes and provides a common object based parameterization for webservice calls.

![webPDF Logo](images/logo.png)

[webPDF](https://www.webpdf.de/) is a commercial multi-platform server solution for creating and processing PDF documents. To use the webPDF wsclient library for webservice calls, a running webPDF installation is required. A demo version as Windows installation, Linux package or as a virtual machine can be downloaded from the [product page](https://docs.webpdf.de/docs/download/).

> **Note**: Unless otherwise marked, the following is based on webPDF version 11 or newer. If you are using an older version please update to use all parameters for the current release of the library. You will always find the newest version at the product [download page](https://docs.webpdf.de/docs/download/).

## Download
> **Note:** Starting with wsclient 9.x the wsclient´s and webPDF server´s version numbers have been synchronized, to simplify finding the proper wsclient for your webPDF server.

You can use this library by adding this dependency to your project:
```
yarn add @softvision/webpdf-wsclient-typescript
```
```
npm install @softvision/webpdf-wsclient-typescript
```

## Usage
You will find some [usage examples](https://github.com/softvision-dev/webpdf-wsclient-typescript/wiki/Usage) in the wiki.

## Examples

The `examples/` directory contains runnable code samples for common use cases, available in two flavors:

| Flavor     | Location                      | Runtime                      |
|------------|-------------------------------|------------------------------|
| TypeScript | `examples/typescript/node/`   | Node.js                      |
| JavaScript | `examples/js/`                | Browser (HTML entry points)  |

The following topics are covered:

| Topic            | Description                                                                    |
|------------------|--------------------------------------------------------------------------------|
| `administration` | Server status, logs, support bundle, session table, datastore, configuration   |
| `barcode`        | Add a barcode to a PDF                                                         |
| `converter`      | Convert documents to PDF                                                       |
| `documents`      | Upload, manage, and download documents                                         |
| `ocr`            | Apply OCR to a scanned PDF                                                     |
| `pdfa`           | Convert PDFs to PDF/A                                                          |
| `signature`      | Add digital signatures                                                         |
| `toolbox`        | Watermark, annotations, attachments, description, display options, encryption  |
| `urlconverter`   | Convert a URL to PDF                                                           |

> **Note:** The examples import directly from the library source. Adapt the server URL and credentials in each file before running.

## Documentation
Have a look at our [wiki](https://github.com/softvision-dev/webpdf-wsclient-typescript/wiki) for examples and details.

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values before running development scripts.
The `.env` file is loaded automatically and is excluded from version control.

| Variable | Required for | Description |
|---|---|---|
| `JAVA_HOME` | `yarn run codegen` | Absolute path to the JDK used by the OpenAPI Generator CLI. Not required when `java` is already on the system `PATH`. Example: `C:\Program Files\Java\jdk-21.0.11+10` |
| `LOCAL_PUBLISH_API` | `yarn run publish:local` | Nexus Components API endpoint URL. Example: `https://nexus.example.com/service/rest/v1/components` |
| `LOCAL_PUBLISH_REPOSITORY` | `yarn run publish:local` | Nexus repository name where the npm package is uploaded. |
| `LOCAL_PUBLISH_USERNAME` | `yarn run publish:local` | Nexus username for authentication against the repository. |
| `LOCAL_PUBLISH_PASSWORD` | `yarn run publish:local` | Nexus password for authentication against the repository. |
| `LOCAL_PUBLISH_NPM_TAG` | `yarn run publish:local` | Optional npm distribution tag applied during upload (e.g., `beta`, `latest`). Leave empty to upload without an explicit tag. |

> **Note:** `yarn run publish:public` uses npm auth config instead of the `LOCAL_PUBLISH_*` variables. Provide `NODE_AUTH_TOKEN` (or `NPM_TOKEN`) in your CI environment for public npm releases.

## Development

### Prerequisites

This project requires **Node.js 24** and **Yarn 4** (Berry), managed via [nvm](https://github.com/nvm-sh/nvm) and [Corepack](https://nodejs.org/api/corepack.html).

**Node.js (nvm):**
```bash
nvm install   # reads .nvmrc → installs Node 24
nvm use       # switches to Node 24
```

Optional: add a shell hook to `~/.zshrc` so `nvm use` runs automatically on `cd`:
```bash
autoload -U add-zsh-hook
load-nvmrc() {
  local nvmrc_path
  nvmrc_path="$(nvm_find_nvmrc)"
  if [ -n "$nvmrc_path" ]; then
    nvm use
  fi
}
add-zsh-hook chpwd load-nvmrc
```

**Corepack (Yarn 4):**

Corepack reads the `packageManager` field in `package.json` and activates the exact Yarn version automatically. Enable it once per Node.js installation:
```bash
corepack enable
```

> After switching Node versions via nvm, run `corepack enable` again for the new version.

Install dependencies:
```bash
yarn install
```

Run code generation:
```bash
yarn run codegen
```

Run quality checks:
```bash
yarn run lint
yarn run typecheck
```

Build package:
```bash
yarn run build
```

Schema drift workflow (when `openapi.json` changes):
1. Update schema source: `src/codegen/resources/schema/openapi.json`
2. Regenerate models: `yarn run codegen`
3. Validate compile and quality:
   - `yarn run typecheck`
   - `yarn run typecheck:tests`
   - `yarn run lint`
   - `yarn run build`
   - `yarn mocha --config .mocharc.json "src/tests/typescript/codegen/**/*.spec.ts"`

CI should run the same commands:
- `yarn run codegen`
- `yarn run typecheck`
- `yarn run typecheck:tests`
- `yarn run lint`
- `yarn run build`

## Testing

### Test suites

| Suite | Command | Server required |
|---|---|---|
| Codegen unit tests (30 tests) | `yarn mocha --config .mocharc.json "src/tests/typescript/codegen/**/*.spec.ts"` | No |
| Full integration suite (62 tests) | `yarn mocha --config .mocharc.json` | Yes |

### Test configuration

Integration tests read `config/testConfig.json`, which is excluded from version control.
Copy the sample file and adapt it to your environment:

```bash
cp config/testConfig-sample.json config/testConfig.json
```

The file has two top-level sections:

#### `server`

Defines the webPDF server endpoints used during tests.

| Field | Description |
|---|---|
| `server.local.url` | Base URL of the local webPDF server (default: `http://localhost`) |
| `server.local.httpPort` | HTTP port (default: `8080`) |
| `server.local.httpsPort` | HTTPS port (default: `8443`) |
| `server.local.path` | Context path (default: `/webPDF`) |
| `server.local.adminName` / `adminPassword` | Admin credentials |
| `server.local.userName` / `userPassword` | Regular user credentials |
| `server.local.ldapAdminName` / `ldapAdminPassword` | Admin credentials for LDAP auth tests |
| `server.local.ldapUserName` / `ldapUserPassword` | User credentials for LDAP auth tests |
| `server.public.url` | Public portal URL — used when running against `portal.webpdf.de` |

#### `integrationTests`

Controls which integration test groups are active.

| Field | Default | Description |
|---|---|---|
| `integrationTests.enabled` | `false` | Master switch — set to `true` to run integration tests |
| `integrationTests.useContainer` | `false` | Start a webPDF Docker container via Testcontainers instead of using a pre-running server |
| `integrationTests.oAuth.azureClient.enabled` | `false` | Enable Azure OAuth tests; fill in `authority`, `clientId`, `clientSecret`, `scope` |
| `integrationTests.oAuth.auth0Client.enabled` | `false` | Enable Auth0 OAuth tests; fill in `authority`, `clientId`, `clientSecret`, `audience` |
| `integrationTests.proxy.enabled` | `false` | Enable proxy routing tests; set `url` and `urlSSL` |
| `integrationTests.tls.enabled` | `false` | Enable TLS/HTTPS tests |
| `integrationTests.ldap.enabled` | `false` | Enable LDAP authentication tests |

> **Note:** `testConfig.json` may contain OAuth client secrets — never commit this file.
> It is already covered by `.gitignore`.

## Publishing

`yarn run build` must complete successfully before publishing. It cleans the output directories, regenerates sources via codegen, and compiles TypeScript to `lib/`.

### Local (Nexus)

Publishes the package to an internal Nexus repository using the Nexus Components REST API.

**Prerequisites:** fill in all `LOCAL_PUBLISH_*` variables in `.env` (see [Environment Variables](#environment-variables)).

```bash
yarn run build
yarn run publish:local
```

What the script does:
1. Packs the `lib/` output into a `.tgz` archive via `npm pack`.
2. Uploads the archive to Nexus via `POST {LOCAL_PUBLISH_API}?repository={LOCAL_PUBLISH_REPOSITORY}` with Basic Auth.
3. Attaches the npm distribution tag from `LOCAL_PUBLISH_NPM_TAG` when set (e.g., `beta`).

### Public (npmjs.org)

Publishes the package to the public npm registry.

**Prerequisites:** npm authentication must be configured. In CI, set `NODE_AUTH_TOKEN` (or `NPM_TOKEN`) as an environment secret. Locally, run `yarn npm login` once.

```bash
yarn run build
yarn run publish:public
```

What the script does:
1. Runs `yarn npm publish --access public` against the registry configured in `package.json` (`publishConfig.registry`).

## Codegen Contract

The codegen contract defines the stable behavior of the TypeScript-based code generation pipeline.
Changes to the pipeline must not break the rules below without a deliberate decision to update the contract.

### Naming and package rules

- Package routing config: `src/codegen/resources/generator_config.json`
  Defines `prefix` → `location` mappings and `preservePrefix` exceptions that keep the full prefix in the exported class name.
- OpenAPI Generator CLI config: `src/codegen/resources/openapi-generator-config.json`
  Controls upstream raw generation options (ES6, naming conventions, etc.).
- Model names are resolved via `ModelName` and mapped to:
  - exported type/class names,
  - generated file path under `src/main/typescript/generated-sources`,
  - package/index location.
- `preservePrefix` rules keep configured prefixes in exported names.

### Export surface rules

- `src/main/typescript/generated-sources/index.ts` is generated deterministically.

### Adapter coverage and placeholders

- Adapter summary: `build/codegen/adapter/adapter-summary.json`.
- Strict unresolved coverage appears in `missingFromRaw` and is treated as a known coverage gap.
- The following placeholder fallback models are currently accepted for compatibility:
  - `Appearance`
  - `Clear`
  - `Decrypt`
  - `FormsFlatten`
  - `SelectionBackground`
  - `SelectionHeaderFooter`
  - `UserXml`

### Runtime and environment constraints

- `yarn run codegen` requires Java for the OpenAPI Generator CLI.
- The generator version is configured in `openapitools.json` (currently `7.22.0`).
  OpenAPI Generator 7.x requires **Java 11 or newer**; Java 17 LTS or Java 21 LTS are recommended.
  The required Java version per generator release is documented on the
  [OpenAPI Generator releases page](https://github.com/OpenAPITools/openapi-generator/releases).
- Project-local Java via `JAVA_HOME` is supported (no global `PATH` entry required), e.g.:
  - `C:\Program Files\Java\jdk-21.0.11+10`

## Development and support
If you have any questions on how to use webPDF, or this library, or have ideas for future development, please get in touch via our [product homepage](https://www.webpdf.de).

If you find any issues, please file a [bug](https://github.com/softvision-dev/webpdf-wsclient-typescript/issues) after checking for duplicates or create a [pull request](https://github.com/softvision-dev/webpdf-wsclient-typescript/pulls).

## More help
Learn even more about our product in our [webPDF Documentation](https://www.webpdf.de/en/documentation).

## License
Please, see the [license](LICENSE) file for more information.
