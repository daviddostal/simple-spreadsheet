const { Spreadsheet, RuntimeError } = require('../dist/cjs/simple-spreadsheet');
const { builtinFunctions } = require('../dist/cjs/simple-spreadsheet-functions');

describe('SUM function', () => {
    test('returns 0 for empty array', () => {
        const spreadsheet = new Spreadsheet({ A1: [] }, builtinFunctions);
        expect(spreadsheet.query('=SUM()')).toBe(0);
        expect(spreadsheet.query('=SUM(A1)')).toBe(0);
    });

    test('returns sum of numbers', () => {
        const spreadsheet = new Spreadsheet({}, builtinFunctions);
        expect(spreadsheet.query('=SUM(2, 3, -8)')).toBe(-3);
        expect(spreadsheet.query('=SUM(100, 2.8)')).toBe(102.8);
    });

    test('ignores null values', () => {
        const spreadsheet = new Spreadsheet({ A1: null, A2: 1 }, builtinFunctions);
        expect(spreadsheet.query('=SUM(2, A1, A2, A3)')).toBe(3);
    });

    test('accepts array or multiple arguments', () => {
        const spreadsheet = new Spreadsheet(
            { A1: 2, A2: 3, A3: 4, A4: [1, 2, 3] },
            builtinFunctions);
        expect(spreadsheet.query('=SUM(A1, A2, A3)')).toBe(9);
        expect(spreadsheet.query('=SUM(A1:A3)')).toBe(9);
        expect(spreadsheet.query('=SUM(A4)')).toBe(6);
    });

    test('throws when arguments are not numbers', () => {
        const spreadsheet = new Spreadsheet({ A1: 'abc' }, builtinFunctions);
        expect(() => spreadsheet.query('=SUM(2, "hello")')).toThrow(RuntimeError);
        expect(() => spreadsheet.query('=SUM(2, A1)')).toThrow(RuntimeError);
    });
});

describe('AVERAGE function', () => {
    test('returns NaN for empty array', () => {
        const spreadsheet = new Spreadsheet({ A1: [] }, builtinFunctions);
        expect(spreadsheet.query('=AVERAGE()')).toBe(NaN);
        expect(spreadsheet.query('=AVERAGE(A1)')).toBe(NaN);
    });

    test('returns average of numbers', () => {
        const spreadsheet = new Spreadsheet({}, builtinFunctions);
        expect(spreadsheet.query('=AVERAGE(2, 3, -8)')).toBe(-1);
        expect(spreadsheet.query('=AVERAGE(100, 2.8)')).toBe(51.4);
    });

    test('ignores null values', () => {
        const spreadsheet = new Spreadsheet({ A1: null, A2: 4 }, builtinFunctions);
        expect(spreadsheet.query('=AVERAGE(2, A1, A2, A3)')).toBe(3);
    });

    test('accepts array or multiple arguments', () => {
        const spreadsheet = new Spreadsheet(
            { A1: 2, A2: 3, A3: 4, A4: [1, 2, 3] },
            builtinFunctions);
        expect(spreadsheet.query('=AVERAGE(A1, A2, A3)')).toBe(3);
        expect(spreadsheet.query('=AVERAGE(A1:A3)')).toBe(3);
        expect(spreadsheet.query('=AVERAGE(A4)')).toBe(2);
    });

    test('throws when arguments are not numbers', () => {
        const spreadsheet = new Spreadsheet({ A1: 'abc' }, builtinFunctions);
        expect(() => spreadsheet.query('=AVERAGE(2, "hello")')).toThrow(RuntimeError);
        expect(() => spreadsheet.query('=AVERAGE(2, A1)')).toThrow(RuntimeError);
    });
});

describe('PI function', () => {
    const spreadsheet = new Spreadsheet({}, builtinFunctions);

    test('returns PI', () => {
        expect(spreadsheet.query('=PI()')).toBe(Math.PI);
        expect(spreadsheet.query('=PI()')).toBe(3.141592653589793);
    });

    test('throws when there are too many arguments', () => {
        expect(() => spreadsheet.query('=PI(1)')).toThrow(RuntimeError);
        expect(() => spreadsheet.query('=PI(1, 2)')).toThrow(RuntimeError);
    });
})
