import { terser } from "rollup-plugin-terser";

export default [
    // Umd
    {
        input: 'src/spreadsheet.js',
        output: {
            file: 'dist/simple-spreadsheet.js',
            format: 'umd',
            name: 'SimpleSpreadsheet',
            sourcemap: true,
        },
    },
    {
        input: 'src/spreadsheet.js',
        output: {
            file: 'dist/simple-spreadsheet.min.js',
            format: 'umd',
            name: 'SimpleSpreadsheet',
            sourcemap: true,
        },
        plugins: [
            terser({ keep_classnames: true }),
        ],
    },

    // Esm
    {
        input: 'src/spreadsheet.js',
        output: {
            file: 'dist/simple-spreadsheet.mjs',
            format: 'esm',
            name: 'SimpleSpreadsheet',
            sourcemap: true,
        },
    },
    {
        input: 'src/spreadsheet.js',
        output: {
            file: 'dist/simple-spreadsheet.min.mjs',
            format: 'esm',
            name: 'SimpleSpreadsheet',
            sourcemap: true
        },
        plugins: [
            terser({ keep_classnames: true }),
        ],
    },

    // IIFE
    {
        input: 'src/spreadsheet.js',
        output: {
            file: 'dist/simple-spreadsheet.browser.js',
            format: 'iife',
            name: 'SimpleSpreadsheet',
            sourcemap: true,
        },
    },
    {
        input: 'src/spreadsheet.js',
        output: {
            file: 'dist/simple-spreadsheet.browser.min.js',
            format: 'iife',
            name: 'SimpleSpreadsheet',
            sourcemap: true
        },
        plugins: [
            terser({ keep_classnames: true }),
        ],
    },
]