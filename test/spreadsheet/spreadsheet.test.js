import { Spreadsheet, Errors } from '../../src/spreadsheet';
import { builtinFunctions } from '../../src/functions';
import { expectValue, expectException } from '../test-helpers';

describe('Cells and formulas', () => {
  test('non-formula cells are text by default', () => {
    expectValue('', '');
    expectValue('asdf as', 'asdf as');
    expectValue(' ', ' ');
    expectValue('20.12.2018', '20.12.2018');
    expectValue('12 df', '12 df');
    expectValue('12.2 3', '12.2 3');
  });

  test('empty cells contain null values', () => {
    const spreadsheet = new Spreadsheet();
    expect(spreadsheet.getValue('A1')).toBe(null);
  });

  test('numeric cells are parsed as numbers', () => {
    expectValue('0', 0);
    expectValue('-31', -31);
    expectValue('23.2', 23.2);
    expectValue('-23.2', -23.2);
    expectValue('+23.2', 23.2);
  });

  test('formulas must begin with "="', () => {
    expectValue('=1', 1);
    expectValue(' =1 ', ' =1 ');
    expectValue('=  1  ', 1);
  });

  test('non-string values yield the given value without parsing', () => {
    // compared to using strings for formulas
    // expectValue('2134.5', '2134.5');
    expectValue(2134.5, 2134.5);
    expectValue(2 + 3, 2 + 3);
    expectValue(null, null);
    expectValue(undefined, undefined);
    expectValue(NaN, NaN);
    expectValue(Infinity, Infinity);
    expectValue(-Infinity, -Infinity);
    const arr = [1, 'A', 23.4];
    expectValue(arr, arr);
    const obj = { a: 'a', b: 3 }
    expectValue(obj, obj);
    let a = () => 1;
    expectValue(a, a);
    expectValue(String, String);
  });
});

describe('Parentheses', () => {
  test('work properly', () => {
    expectValue('=3*(2+4)', 18);
    expectValue('=(((3))*(((((2)+((4)))))))', 18);
    expectException('=3*(2+4', Errors.ParsingError);
    expectException('=3*(2+4))', Errors.ParsingError);
    expectException('=3*((2+4)', Errors.ParsingError);
    expectException('=3*(2+4())', Errors.ParsingError);
    expectException('=((((3))*(((((2)+((4)))))))', Errors.ParsingError);
    expectException('=((3))*(((((2)+((4)))))))', Errors.ParsingError);
    expectException('=A2()', Errors.UnknownFunctionError);
    expectException('=3*()2', Errors.ParsingError);
  });
});

describe('Spreadsheet functions', () => {
  test('spreadsheet accepts user defined functions in js', () => {
    const cells = {
      A1: '=ADD1(4)',
      A2: '=ADD1(4.2 + -0.25)',
      A3: '=ADD1(A2)',
      A4: '=ADD1("abc")',
    };
    const functions = { ADD1: x => x + 1 };
    const spreadsheet = new Spreadsheet({ cells, functions });
    expect(spreadsheet.getValue('A1')).toBe(5);
    expect(spreadsheet.getValue('A2')).toBe(4.95);
    expect(spreadsheet.getValue('A3')).toBe(5.95);
    expect(spreadsheet.getValue('A4')).toBe('abc1');
  });

  test('spreadsheet functions can have multiple arguments and be any JS function', () => {
    const functions = {
      GET_1: () => 1,
      SUB_3: (x) => x - 3,
      POW: (base, exponent) => Math.pow(base, exponent),
      POW2: Math.pow,
      SUB_THEN_ADD: function (a, b, c) { return a - b + c },
      MULTIPLY_ALL: (...values) => values.reduce((a, b) => a * b, 1),
    };
    const spreadsheet = new Spreadsheet({ functions });
    expect(spreadsheet.evaluateQuery('=GET_1()')).toBe(1);
    expect(spreadsheet.evaluateQuery('=SUB_3(100)')).toBe(97);
    expect(spreadsheet.evaluateQuery('=POW(2,5)')).toBe(32);
    expect(spreadsheet.evaluateQuery('=POW2(2, 5)')).toBe(32);
    expect(spreadsheet.evaluateQuery('=SUB_THEN_ADD(1, 2, 3)')).toBe(2);
    expect(spreadsheet.evaluateQuery('=MULTIPLY_ALL(2, 3, 4)')).toBe(24);
    expect(spreadsheet.evaluateQuery('=MULTIPLY_ALL()')).toBe(1);
  });

  test('ranges are passed to functions as arrays', () => {
    const spreadsheet = new Spreadsheet({
      cells: { A1: 1, A2: 2, B1: 3, B2: 4 },
      functions: {
        TEST_RANGE: (numbers) => {
          if (!(numbers instanceof Array)) throw new Error('Not an array');
          return numbers.reduce((a, b) => a + b, 0);
        }
      }
    });
    expect(spreadsheet.evaluateQuery('=TEST_RANGE(A1:B2)')).toBe(10);
  });

  test('functions can be nested', () => {
    const spreadsheet = new Spreadsheet({
      cells: { A1: 1, A2: 2, B1: 3, B2: 4 },
      functions: { ADD: (a, b) => a + b }
    });
    expect(spreadsheet.evaluateQuery('=ADD(A1, ADD(ADD(2, A2), ADD(B1, B2)))')).toBe(12);
  });

  test('functions can return arbitrary JS values, even functions', () => {
    const testFunction1 = function (name) { return `Hello, ${name}` };
    const testFunction2 = function () { return testFunction1 };
    const spreadsheet = new Spreadsheet({ functions: { TEST: testFunction2 } });
    expect(spreadsheet.evaluateQuery('=TEST()')).toBe(testFunction1);
  });

  test('functions can accept any JS values as arguments', () => {
    const fn = () => 2;
    const spreadsheet = new Spreadsheet({ cells: { A1: 1, A2: fn, B1: 3, B2: 4 } });
    expect(spreadsheet.evaluateQuery('=A2')).toBe(fn);
  });

  test('cannot call result of a function', () => {
    expectException('=SUM(2, 3)()', Errors.ParsingError);
  });

  test('fxceptions in functions cause FunctionEvaluationErrors when evaluated', () => {
    const spreadsheet = new Spreadsheet({
      functions: { THROW: () => { throw new Error('Testing...'); } }
    });
    expect(() => spreadsheet.evaluateQuery('=THROW()')).toThrow(Errors.FunctionEvaluationError);
  });

  test('function throws when argument throws', () => {
    const spreadsheet = new Spreadsheet({
      functions: { ...builtinFunctions, THROW: () => { throw 'testing' } }
    });
    expect(() => spreadsheet.evaluateQuery('=SUM(1, THROW())')).toThrowError('testing');
  });

  test('when a function references a function with errors, it throws a ReferencedCellError', () => {
    const spreadsheet = new Spreadsheet({
      cells: { A1: '=(', A2: '=A2:A4', A3: '=A1', A4: '=A2' }
    });
    expect(() => spreadsheet.getValue('A3')).toThrow(Errors.ReferencedCellError);
    expect(() => spreadsheet.getValue('A4')).toThrow(Errors.ReferencedCellError);
  });

  test('function arguments can be expressions, which are evaluated', () => {
    expectValue('=SUM(1, 2 + 8, SUM(3, 4, 5))', 23);
  });

  test('function names can be any valid identifier', () => {
    expectException('=A(', Errors.ParsingError);
    expectException('=1A()', Errors.ParsingError);
    expectException('=_A()', Errors.ParsingError);
    expectException('=A()', Errors.UnknownFunctionError);
    expectException('=AB()', Errors.UnknownFunctionError);
    expectException('=A_B()', Errors.UnknownFunctionError);
    expectException('=A1()', Errors.UnknownFunctionError);
    expectException('=A-()', Errors.ParsingError);
    expectException('=A:()', Errors.ParsingError);
    expectException('=A1:A3()', Errors.ParsingError);
  });
});
