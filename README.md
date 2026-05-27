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

## Development

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

- `yarn run codegen` requires Java for OpenAPI Generator.
- Project-local Java via `JAVA_HOME` is supported (no global PATH required), e.g.:
  - `C:\Program Files\Java\jdk-21.0.11+10`

## Development and support
If you have any questions on how to use webPDF, or this library, or have ideas for future development, please get in touch via our [product homepage](https://www.webpdf.de).

If you find any issues, please file a [bug](https://github.com/softvision-dev/webpdf-wsclient-typescript/issues) after checking for duplicates or create a [pull request](https://github.com/softvision-dev/webpdf-wsclient-typescript/pulls).

## More help
Learn even more about our product in our [webPDF Documentation](https://www.webpdf.de/en/documentation).

## License
Please, see the [license](LICENSE) file for more information.
