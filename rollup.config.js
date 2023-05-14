import { terser } from "rollup-plugin-terser";

function createConfig(input, output, format, extend) {
    return [{
        input: input,
        output: {
            file: output + '.js',
            format: format,
            name: 'SimpleSpreadsheet',
            sourcemap: true,
            extend: extend,
        },
    },
    {
        input: input,
        output: {
            file: output + '.min.js',
            format: format,
            name: extend ? 'SimpleSpreadsheet': undefined,
            sourcemap: true,
            extend: extend,
        },
        plugins: [
            terser({ keep_classnames: true }),
        ],
    }]
}

export default [
    // Spreadsheet
    ...createConfig(
        'src/spreadsheet/index.js',
        'dist/cjs/simple-spreadsheet',
        'cjs', false),

    ...createConfig(
        'src/spreadsheet/index.js',
        'dist/esm/simple-spreadsheet',
        'esm', false),

    ...createConfig(
        'src/spreadsheet/index.js',
        'dist/browser/simple-spreadsheet',
        'iife', true),

    // Functions
    ...createConfig(
        'src/functions/index.js',
        'dist/cjs/simple-spreadsheet-functions',
        'cjs', false),

    ...createConfig(
        'src/functions/index.js',
        'dist/esm/simple-spreadsheet-functions',
        'esm', false),

    ...createConfig(
        'src/functions/index.js',
        'dist/browser/simple-spreadsheet-functions',
        'iife', true),
]