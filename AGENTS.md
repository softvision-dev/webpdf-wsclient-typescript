# Agent Instructions

These instructions apply to **any AI coding agent** working in this repository
(Claude Code, Codex, Copilot, Cursor, Gemini, ...). They are intentionally
tool-neutral: follow them regardless of which assistant is invoked.

This is a **public, open-source** repository (Apache-2.0). Everything committed
here is published. Do not add internal-only company material, private
infrastructure references, credentials, or non-public process details.

## Project Overview

- `@softvision/webpdf-wsclient-typescript` is a TypeScript client library for the
  commercial **webPDF** server. It wraps session management and webservice calls
  behind ready-to-use, object-based interfaces.
- The package is published to npm. Only the compiled `lib/**` output ships
  (see `files` in `package.json`); source, tests, and tooling are not part of the
  published artifact.
- Large parts of `src/main/typescript/generated-sources/` are **generated** by an
  OpenAPI code-generation pipeline. See the *Code Generation* section before
  touching anything under that path.

## Toolchain and Commands

This project standardizes on **Node.js 24** (`.nvmrc`) and **Yarn 4 / Berry**
(`packageManager` in `package.json`, activated via Corepack). Use Yarn, not npm.

| Task | Command |
|---|---|
| Install dependencies | `yarn install` |
| Lint (blocking gate) | `yarn run lint` |
| Auto-fix lint issues | `yarn run lint:fix` |
| Type-check sources | `yarn run typecheck` |
| Type-check tests | `yarn run typecheck:tests` |
| Regenerate models | `yarn run codegen` |
| Build package | `yarn run build` |
| Codegen unit tests (no server) | `yarn mocha --config .mocharc.json "src/tests/typescript/codegen/**/*.spec.ts"` |
| Full integration suite (server required) | `yarn mocha --config .mocharc.json` |

See `README.md` for prerequisites, environment variables, and the publishing
workflow. Do not duplicate that content here — link to it instead.

## Code Standards

### TypeScript

- This repo enforces explicit typing. The ESLint config requires
  `@typescript-eslint/typedef` (parameters, arrow parameters, variable
  declarations) and `@typescript-eslint/explicit-function-return-type`. Add
  explicit type annotations to all new variables, parameters, and function return
  types.
- Match the style, naming, and structure of the surrounding code rather than
  introducing new patterns.

### Documentation

- Document new non-trivial exported functions, classes, interfaces, and other
  public APIs using TSDoc (or the established JSDoc style already present in the
  file). Cover purpose, important parameters, return values, side effects, and
  async behavior when relevant to correct usage.
- Add concise comments near non-obvious decisions, async orchestration, caching,
  or interoperability boundaries — explain *why*, not *what*.
- Mark intentionally temporary or partial behavior explicitly, and keep
  documentation aligned with code changes.

### Linting (blocking)

- Run `yarn run lint` before completing any TypeScript or JavaScript change. Lint
  runs with `--max-warnings=0`, so new code must pass with **zero** errors and
  warnings.
- Prefer `yarn run lint:fix` for safe auto-fixes first, then resolve the rest
  manually.
- Do not weaken the lint configuration or suppress rules with inline directives
  such as `eslint-disable` to make a change pass. Fix the code instead, unless a
  configuration change is explicitly requested and justified.

## Testing

- The test framework for this repository is **Mocha + Chai** (configured via
  `.mocharc.json` with `ts-node`). Do not introduce a different test runner.
- Before changing implementation code, inspect existing coverage for the affected
  modules and prefer extending the nearest relevant test over adding implementation
  changes without regression detection. If coverage is missing, note the gap.
- Reuse existing fixtures, helpers, and shared setup (see `src/tests/resources/`
  and `src/tests/typescript/`) instead of duplicating setup inline. Keep reusable
  test assets in the established test-resource locations.
- When a test fails because behavior changed, first determine whether the change is
  intentional or a regression before touching the test. Do not weaken assertions to
  make tests pass.
- Codegen unit tests run without a server. The full integration suite requires a
  reachable webPDF server and is opt-in via `config/testConfig.json`
  (see *Security and Secrets*).

## Code Generation

`src/main/typescript/generated-sources/` is produced by an OpenAPI generation
pipeline driven by `src/codegen/`. Treat it as generated output:

- Do not hand-edit files under `generated-sources/`; changes are overwritten by
  `yarn run codegen`.
- To change models, update the schema source
  (`src/codegen/resources/schema/openapi.json`) or the codegen pipeline, then
  regenerate.
- Schema-drift workflow: regenerate, then validate with `yarn run typecheck`,
  `yarn run typecheck:tests`, `yarn run lint`, `yarn run build`, and the codegen
  unit tests. The codegen contract and accepted placeholder models are documented
  in `README.md`.
- `yarn run codegen` requires a Java runtime for the OpenAPI Generator CLI.

## Security and Secrets

This is a public repository — assume every committed change is permanent and
world-readable.

- **Never commit credentials, tokens, or secrets.** `.env`, `.env.*`,
  `config/testConfig.json`, `config/config.json`, and `docker/.env` are ignored on
  purpose. Only the `*.example` / `*-sample` templates may be committed, and they
  must contain placeholder values only.
- `config/testConfig.json` may hold OAuth client secrets and server credentials.
  Keep it local; never add it to version control.
- Do not hardcode server URLs, usernames, passwords, API tokens, or registry
  credentials in source, tests, or examples. Read them from configuration or
  environment variables.
- Keystores and certificates under `src/tests/resources/` and `docker/ldap/` are
  **test-only fixtures** for integration tests. Do not treat them as real secrets,
  and do not introduce real keys or production certificates into the repository.
- When adding a new configuration input, also add a placeholder entry to the
  relevant example/sample file and document it in `README.md`.

## Local Processing Preference

- Prefer local CLI tooling for document, archive, image, OCR, and metadata work.
  Do not send document contents to external cloud services unless the user
  explicitly requests it.
- Prefer parser-based tools (e.g. `jq`, `xmllint`) over regex or free-text
  reasoning when inspecting JSON, YAML, or XML.

## Working Conventions

- Communicate and write text in the language the user is using. When producing
  German text, use proper umlauts and `ß`; do not substitute `ae`/`oe`/`ue`/`ss`
  unless a target format technically requires ASCII. Prefer UTF-8 for authored
  text files.
- Base findings, reviews, and claims on verifiable evidence (file paths, line
  references, command output, test results). State explicitly when something could
  not be verified.
- Prefer small, concrete fixes aligned with existing repository conventions over
  speculative rewrites.
- Use the local `.ai-workspace/` directory for transient agent artifacts: `temp/`
  for logs and scratch output, `scripts/` for repeatable local helpers, `commands/`
  for reusable request files, and `tracking/` for working notes. Only the `.gitkeep`
  files are tracked — everything else under `.ai-workspace/` is ignored, so keep
  transient artifacts there and out of version control.

## Before You Finish

- `yarn run lint` passes with zero warnings.
- `yarn run typecheck` (and `yarn run typecheck:tests` for test changes) passes.
- Relevant tests run and pass; for generated-code changes, `yarn run build` and the
  codegen unit tests pass.
- No secrets, credentials, or internal-only material were added to tracked files.
