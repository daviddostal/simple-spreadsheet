import { terser } from 'rollup-plugin-terser';
import typescriptPlugin from '@rollup/plugin-typescript';

function createConfig({ input, output, format, extend = false, typescript = false }) {
    const commonPlugins = [
        ...(typescript ? [typescriptPlugin()] : [])
    ];

    const normalBundleConfig = {
        input: input,
        output: {
            file: output + '.js',
            format: format,
            name: 'SimpleSpreadsheet',
            sourcemap: true,
            extend: extend,
        },
        plugins: [...commonPlugins]
    };

    const minifiedBundleConfig = {
        input: input,
        output: {
            file: output + '.min.js',
            format: format,
            name: extend ? 'SimpleSpreadsheet' : undefined,
            sourcemap: true,
            extend: extend,
        },
        plugins: [
            ...commonPlugins,
            terser({ keep_classnames: true }),
        ],
    }

    return [normalBundleConfig, minifiedBundleConfig];
}

export default [
    // Spreadsheet
    ...createConfig({
        input: 'src/spreadsheet/index.ts',
        output: 'dist/cjs/simple-spreadsheet',
        format: 'cjs',
        typescript: true,
    }),

    ...createConfig({
        input: 'src/spreadsheet/index.ts',
        output: 'dist/esm/simple-spreadsheet',
        format: 'esm',
        typescript: true,
    }),

    ...createConfig({
        input: 'src/spreadsheet/index.ts',
        output: 'dist/browser/simple-spreadsheet',
        format: 'iife',
        typescript: true,
        extend: true
    }),

    // Functions
    ...createConfig({
        input: 'src/functions/index.js',
        output: 'dist/cjs/simple-spreadsheet-functions',
        format: 'cjs'
    }),

    ...createConfig({
        input: 'src/functions/index.js',
        output: 'dist/esm/simple-spreadsheet-functions',
        format: 'esm',
    }),

    ...createConfig({
        input: 'src/functions/index.js',
        output: 'dist/browser/simple-spreadsheet-functions',
        format: 'iife',
        extend: true
    }),
]