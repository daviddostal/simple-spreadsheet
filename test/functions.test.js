import { Spreadsheet, FunctionEvaluationError } from '../src/spreadsheet';
import { builtinFunctions } from '../src/functions';

describe('STRING function', () => {
    const spreadsheet = new Spreadsheet({
        functions: builtinFunctions,
        cells: {
            A1: 1, A2: 1,
            B1: {}, B2: null, B3: undefined
        }
    });

    test('converts strings to strings', () => {
        expect(spreadsheet.evaluateQuery('=STRING("abc")')).toBe('abc');
        expect(spreadsheet.evaluateQuery('=STRING("")')).toBe('');
    });

    test('converts numbers to strings', () => {
        expect(spreadsheet.evaluateQuery('=STRING(2)')).toBe('2');
        expect(spreadsheet.evaluateQuery('=STRING(2.5)')).toBe('2.5');
        expect(spreadsheet.evaluateQuery('=STRING(1/3)')).toBe('0.3333333333333333');
        expect(spreadsheet.evaluateQuery('=STRING(0.1 + 0.2)')).toBe('0.30000000000000004'); // Because of floating point imprecisions
    });

    test('converts booleans to strings', () => {
        expect(spreadsheet.evaluateQuery('=STRING(TRUE)')).toBe('TRUE');
        expect(spreadsheet.evaluateQuery('=STRING(FALSE)')).toBe('FALSE');
    });

    test('throws when given a range', () => {
        expect(() => spreadsheet.evaluateQuery('=STRING(A1:A2)')).toThrow(FunctionEvaluationError);
    });

    test('throws when given an unknown type', () => {
        expect(() => spreadsheet.evaluateQuery('=STRING(B1)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=STRING(B2)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=STRING(B3)')).toThrow(FunctionEvaluationError);
    });

    test('throws when not given exactly 1 agrument', () => {
        expect(() => spreadsheet.evaluateQuery('=STRING()')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=STRING(1, 2)')).toThrow(FunctionEvaluationError);
    });
});

describe('NUMBER function', () => {
    const spreadsheet = new Spreadsheet({
        functions: builtinFunctions,
        cells: {
            A1: 1, A2: 1,
            B1: {}, B2: null, B3: undefined
        }
    });

    test('converts numbers to numbers', () => {
        expect(spreadsheet.evaluateQuery('=NUMBER(2)')).toBe(2);
        expect(spreadsheet.evaluateQuery('=NUMBER(3.5)')).toBe(3.5);
        expect(spreadsheet.evaluateQuery('=NUMBER(-10)')).toBe(-10);
    });

    test('converts strings to numbers', () => {
        expect(spreadsheet.evaluateQuery('=NUMBER("2")')).toBe(2);
        expect(spreadsheet.evaluateQuery('=NUMBER("2.5")')).toBe(2.5);
        expect(spreadsheet.evaluateQuery('=NUMBER("asdf")')).toBe(NaN);
        expect(spreadsheet.evaluateQuery('=NUMBER("-5")')).toBe(-5);
    });

    test('converts booleans to numbers', () => {
        expect(spreadsheet.evaluateQuery('=NUMBER(TRUE)')).toBe(1);
        expect(spreadsheet.evaluateQuery('=NUMBER(FALSE)')).toBe(0);
    });

    test('throws when given a range', () => {
        expect(() => spreadsheet.evaluateQuery('=NUMBER(A1:A2)')).toThrow(FunctionEvaluationError);
    });

    test('throws when given an unknown type', () => {
        expect(() => spreadsheet.evaluateQuery('=NUMBER(B1)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=NUMBER(B2)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=NUMBER(B3)')).toThrow(FunctionEvaluationError);
    });

    test('throws when not given exactly 1 agrument', () => {
        expect(() => spreadsheet.evaluateQuery('=NUMBER()')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=NUMBER(1, 2)')).toThrow(FunctionEvaluationError);
    });
});

describe('BOOLEAN function', () => {
    const spreadsheet = new Spreadsheet({
        functions: builtinFunctions,
        cells: {
            A1: 1, A2: 1,
            B1: {}, B2: null, B3: undefined
        }
    });

    test('converts booleans to booleans', () => {
        expect(spreadsheet.evaluateQuery('=BOOLEAN(TRUE)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=BOOLEAN(FALSE)')).toBe(false);
    });

    test('converts strings to booleans', () => {
        expect(spreadsheet.evaluateQuery('=BOOLEAN("2")')).toBe(true);
        expect(spreadsheet.evaluateQuery('=BOOLEAN("FALSE")')).toBe(true);
        expect(spreadsheet.evaluateQuery('=BOOLEAN("0")')).toBe(true);
        expect(spreadsheet.evaluateQuery('=BOOLEAN("sdf")')).toBe(true);
        expect(spreadsheet.evaluateQuery('=BOOLEAN("")')).toBe(false);
    });

    test('converts numbers to booleans', () => {
        expect(spreadsheet.evaluateQuery('=BOOLEAN(0)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=BOOLEAN(-0)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=BOOLEAN(+0)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=BOOLEAN(1)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=BOOLEAN(1/0)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=BOOLEAN(5)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=BOOLEAN(-5)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=BOOLEAN(-5.4)')).toBe(true);
    });

    test('throws when given a range', () => {
        expect(() => spreadsheet.evaluateQuery('=BOOLEAN(A1:A2)')).toThrow(FunctionEvaluationError);
    });

    test('throws when given an unknown type', () => {
        expect(() => spreadsheet.evaluateQuery('=BOOLEAN(B1)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=BOOLEAN(B2)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=BOOLEAN(B3)')).toThrow(FunctionEvaluationError);
    });

    test('throws when not given exactly 1 agrument', () => {
        expect(() => spreadsheet.evaluateQuery('=BOOLEAN()')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=BOOLEAN(1, 2)')).toThrow(FunctionEvaluationError);
    });
});

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
        expect(spreadsheet.evaluateQuery('=IF(TRUE, 2, 3)')).toBe(2);
    });

    test('Returns value of second branch if the condition is false', () => {
        expect(spreadsheet.evaluateQuery('=IF(FALSE, 2, 3)')).toBe(3);
    });

    test('Evaluates only one branch of the function', () => {
        evaluatedBranches = [];
        spreadsheet.evaluateQuery('=IF(TRUE, TEST(2), TEST(3))');
        expect(evaluatedBranches).toEqual([2]);

        evaluatedBranches = [];
        spreadsheet.evaluateQuery('=IF(FALSE, TEST(2), TEST(3))');
        expect(evaluatedBranches).toEqual([3]);
    });

    test('Exception in function causes FunctionEvaluationError', () => {
        expect(() => spreadsheet.evaluateQuery('=IF(TRUE, THROW(), 3)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=IF(FALSE, THROW(), 3)')).not.toThrow();
        expect(() => spreadsheet.evaluateQuery('=IF(THROW(), 2, 3)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=IF(FALSE, 2, THROW())')).toThrow(FunctionEvaluationError);
    });

    test('throws when condition is not a boolean', () => {
        expect(() => spreadsheet.evaluateQuery('=IF(1, 2, 3)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=IF("", 2, 3)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=IF(A1:A10, 2, 3)')).toThrow(FunctionEvaluationError);
    });

    test('throws when argument count is not 3', () => {
        expect(() => spreadsheet.evaluateQuery('=IF()')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=IF(TRUE)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=IF(TRUE, 2)')).toThrow(FunctionEvaluationError);
    })
});

describe('NOT function', () => {
    const spreadsheet = new Spreadsheet({ functions: builtinFunctions });

    test('returns negated values of booleans', () => {
        expect(spreadsheet.evaluateQuery('=NOT(TRUE)')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(FALSE)')).toBe(true);
        expect(spreadsheet.evaluateQuery('=NOT(NOT(FALSE))')).toBe(false);
        expect(spreadsheet.evaluateQuery('=NOT(NOT(NOT(FALSE)))')).toBe(true);
    });

    test('throws when the argument is not a boolean', () => {
        expect(() => spreadsheet.evaluateQuery('=NOT(1)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=NOT("")')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=NOT(A1:A10)')).toThrow(FunctionEvaluationError);
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

    test('throws when some argument is not a boolean', () => {
        expect(() => spreadsheet.evaluateQuery('=AND(1)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=AND("")')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=AND(A1:A10)')).toThrow(FunctionEvaluationError);
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

    test('throws when some argument is not boolean', () => {
        expect(() => spreadsheet.evaluateQuery('=OR(1)')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=OR("")')).toThrow(FunctionEvaluationError);
        expect(() => spreadsheet.evaluateQuery('=OR(A1:A10)')).toThrow(FunctionEvaluationError);
    });
});