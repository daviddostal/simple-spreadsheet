import { Spreadsheet, FunctionEvaluationError } from '../src/spreadsheet';
import { builtinFunctions } from '../src/functions';

describe('SUM function', () => {
    test('returns 0 for empty array', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: [] }, functions: builtinFunctions });
        expect(spreadsheet.evaluateQuery('=SUM()')).toBe(0);
        expect(spreadsheet.evaluateQuery('=SUM(A1)')).toBe(0);
    });

    test('returns sum of numbers', () => {
        const spreadsheet = new Spreadsheet({ cells: {}, functions: builtinFunctions });
        expect(spreadsheet.evaluateQuery('=SUM(2, 3, -8)')).toBe(-3);
        expect(spreadsheet.evaluateQuery('=SUM(100, 2.8)')).toBe(102.8);
    });

    test('ignores null values', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: null, A2: 1 }, functions: builtinFunctions });
        expect(spreadsheet.evaluateQuery('=SUM(2, A1, A2, A3)')).toBe(3);
    });

    test('accepts array or multiple arguments', () => {
        const spreadsheet = new Spreadsheet({
            cells: { A1: 2, A2: 3, A3: 4, A4: [1, 2, 3] },
            functions: builtinFunctions
        });
        expect(spreadsheet.evaluateQuery('=SUM(A1, A2, A3)')).toBe(9);
        expect(spreadsheet.evaluateQuery('=SUM(A1:A3)')).toBe(9);
        expect(spreadsheet.evaluateQuery('=SUM(A4)')).toBe(6);
    });

    test('throws when arguments are not numbers', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: 'abc' }, functions: builtinFunctions });
        expect(() => spreadsheet.evaluateQuery('=SUM(2, "hello")')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=SUM(2, A1)')).toThrow(FunctionEvaluationError);
    });
});

describe('AVERAGE function', () => {
    test('returns NaN for empty array', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: [] }, functions: builtinFunctions });
        expect(spreadsheet.evaluateQuery('=AVERAGE()')).toBe(NaN);
        expect(spreadsheet.evaluateQuery('=AVERAGE(A1)')).toBe(NaN);
    });

    test('returns average of numbers', () => {
        const spreadsheet = new Spreadsheet({ functions: builtinFunctions });
        expect(spreadsheet.evaluateQuery('=AVERAGE(2, 3, -8)')).toBe(-1);
        expect(spreadsheet.evaluateQuery('=AVERAGE(100, 2.8)')).toBe(51.4);
    });

    test('ignores null values', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: null, A2: 4 }, functions: builtinFunctions });
        expect(spreadsheet.evaluateQuery('=AVERAGE(2, A1, A2, A3)')).toBe(3);
    });

    test('accepts array or multiple arguments', () => {
        const spreadsheet = new Spreadsheet({
            cells: { A1: 2, A2: 3, A3: 4, A4: [1, 2, 3] },
            functions: builtinFunctions
        });
        expect(spreadsheet.evaluateQuery('=AVERAGE(A1, A2, A3)')).toBe(3);
        expect(spreadsheet.evaluateQuery('=AVERAGE(A1:A3)')).toBe(3);
        expect(spreadsheet.evaluateQuery('=AVERAGE(A4)')).toBe(2);
    });

    test('throws when arguments are not numbers', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: 'abc' }, functions: builtinFunctions });
        expect(() => spreadsheet.evaluateQuery('=AVERAGE(2, "hello")')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=AVERAGE(2, A1)')).toThrow(FunctionEvaluationError);
    });
});

describe('PI function', () => {
    const spreadsheet = new Spreadsheet({ functions: builtinFunctions });

    test('returns PI', () => {
        expect(spreadsheet.evaluateQuery('=PI()')).toBe(Math.PI);
        expect(spreadsheet.evaluateQuery('=PI()')).toBe(3.141592653589793);
    });

    test('throws when there are too many arguments', () => {
        expect(() => spreadsheet.evaluateQuery('=PI(1)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=PI(1, 2)')).toThrow(FunctionEvaluationError);
    });
});

describe('IF function', () => {
    let evaluatedBranches;
    const spreadsheet = new Spreadsheet({
        functions: {
            ...builtinFunctions,
            TEST: (v) => { evaluatedBranches.push(v); return v },
            THROW: () => { throw new Error(); }
        }
    });

    test('Returns value of first branch if the condition is true', () => {
        expect(spreadsheet.evaluateQuery('=IF(1, 2, 3)')).toBe(2);
    });

    test('Returns value of second branch if the condition is false', () => {
        expect(spreadsheet.evaluateQuery('=IF(0, 2, 3)')).toBe(3);
    });

    test('Evaluates only one branch of the function', () => {
        evaluatedBranches = [];
        spreadsheet.evaluateQuery('=IF(1, TEST(2), TEST(3))');
        expect(evaluatedBranches).toEqual([2]);

        evaluatedBranches = [];
        spreadsheet.evaluateQuery('=IF(0, TEST(2), TEST(3))');
        expect(evaluatedBranches).toEqual([3]);
    });

    test('Exception in function causes FunctionEvaluationError', () => {
        expect(() => spreadsheet.evaluateQuery('=IF(1, THROW(), 3)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=IF(0, THROW(), 3)')).not.toThrow();
        expect(() => spreadsheet.evaluateQuery('=IF(THROW(), 2, 3)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=IF(0, 2, THROW())')).toThrow(FunctionEvaluationError);
    });
});

describe('NOT function', () => {
    const spreadsheet = new Spreadsheet({ functions: builtinFunctions });

    test('returns negated values of booleans', () => {
        expect(spreadsheet.evaluateQuery('=NOT(TRUE)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(FALSE)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=NOT(NOT(FALSE))')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(NOT(NOT(FALSE)))')).toBe(true);
    });

    // TODO: Add proper type checking to functions and operators
    // and do not coerce types like JavaScript does
    test('converts non-booleans to booleans like JavaScript', () => {
        expect(spreadsheet.evaluateQuery('=NOT(1)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(0)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=NOT(-1)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(24)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT("")')).toBe(true);
        expect(spreadsheet.evaluateQuery('=NOT("a")')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(A1:A2)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(A1)')).toBe(true);
    });
});

describe('AND function', () => {
    const spreadsheet = new Spreadsheet({
        functions: { ...builtinFunctions, THROW: () => { throw new Error(); } }
    });

    test('returns true only if all arguments are true', () => {
        expect(spreadsheet.evaluateQuery('=AND(TRUE)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=AND(FALSE)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=AND(TRUE, FALSE, TRUE)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=AND(TRUE, TRUE, TRUE)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=AND(FALSE, TRUE, FALSE)')).toBe(false);
    });

    test('throws when no arguments are present', () => {
        expect(() => spreadsheet.evaluateQuery('=AND()')).toThrow(FunctionEvaluationError);
    });

    test('evaluates arguments lazily (short-circuiting)', () => {
        expect(() => spreadsheet.evaluateQuery('=AND(FALSE, THROW())')).not.toThrow();
        expect(() => spreadsheet.evaluateQuery('=AND(TRUE, THROW())'))
            .toThrow(FunctionEvaluationError);
    });

    test('converts non-booleans to booleans like JavaScript', () => {
        expect(spreadsheet.evaluateQuery('=NOT(1)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(0)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=NOT(-1)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(24)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT("")')).toBe(true);
        expect(spreadsheet.evaluateQuery('=NOT("a")')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(A1:A2)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(A1)')).toBe(true);
    });
});

describe('OR function', () => {
    const spreadsheet = new Spreadsheet({
        functions: { ...builtinFunctions, THROW: () => { throw new Error(); } }
    });

    test('returns true if any argument is true', () => {
        expect(spreadsheet.evaluateQuery('=OR(TRUE)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=OR(FALSE)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=OR(FALSE, TRUE, FALSE)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=OR(FALSE, FALSE, FALSE)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=OR(FALSE, TRUE, TRUE)')).toBe(true);
    });

    test('throws when no arguments are present', () => {
        expect(() => spreadsheet.evaluateQuery('=OR()')).toThrow(FunctionEvaluationError);
    });

    test('evaluates arguments lazily (short-circuiting)', () => {
        expect(() => spreadsheet.evaluateQuery('=OR(TRUE, THROW())')).not.toThrow();
        expect(() => spreadsheet.evaluateQuery('=OR(FALSE, THROW())'))
            .toThrow(FunctionEvaluationError);
    });

    test('converts non-booleans to booleans like JavaScript', () => {
        expect(spreadsheet.evaluateQuery('=NOT(1)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(0)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=NOT(-1)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(24)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT("")')).toBe(true);
        expect(spreadsheet.evaluateQuery('=NOT("a")')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(A1:A2)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(A1)')).toBe(true);
    });
});