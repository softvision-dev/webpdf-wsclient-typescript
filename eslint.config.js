import { includeIgnoreFile } from "@eslint/compat";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { fileURLToPath } from "node:url";

const gitignorePath = fileURLToPath(new URL(".gitignore", import.meta.url));

export default [
    includeIgnoreFile(gitignorePath),
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsParser
        },
        plugins: {
            "@typescript-eslint": tseslint
        },
        rules: {
            "@typescript-eslint/typedef": [
                "error",
                {
                    parameter: true,
                    arrowParameter: true,
                    variableDeclaration: true
                }
            ],
            "@typescript-eslint/explicit-function-return-type": [
                "error",
                {
                    allowExpressions: false,
                    allowTypedFunctionExpressions: false
                }
            ],
            "@typescript-eslint/no-inferrable-types": "off"
        }
    }
];
