import { Spreadsheet } from '../src/spreadsheet';
import { ParsingError, CircularReferenceError, FunctionEvaluationError, ReferencedCellError, RangeReferenceNotAllowedError, UnknownFunctionError, TypeError } from '../src/spreadsheet/errors';
import { builtinFunctions } from '../src/functions';

function expectValue(formula, expected) {
    const spreadsheet = new Spreadsheet({ cells: { A1: formula }, functions: builtinFunctions });
    const value = spreadsheet.getValue('A1');
    expect(value).toBe(expected);
    expect(spreadsheet.evaluateQuery(formula)).toBe(expected);
}

function expectException(formula, exceptionType) {
    expect(exceptionType).toBeDefined();
    expect(() => new Spreadsheet({ cells: { A1: formula }, functions: builtinFunctions }).getValue('A1'))
        .toThrow(exceptionType);
}

describe('Cells and formulas', () => {
    test('Non-formula cells are text by default', () => {
        expectValue('', '');
        expectValue('asdf as', 'asdf as');
        expectValue(' ', ' ');
        expectValue('20.12.2018', '20.12.2018');
        expectValue('12 df', '12 df');
        expectValue('12.2 3', '12.2 3');
    });

    test('Empty cells contain null values', () => {
        const spreadsheet = new Spreadsheet();
        expect(spreadsheet.getValue('A1')).toBe(null);
    });

    test('Numeric cells are parsed as numbers', () => {
        expectValue('0', 0);
        expectValue('-31', -31);
        expectValue('23.2', 23.2);
        expectValue('-23.2', -23.2);
        expectValue('+23.2', 23.2);
    });

    test('Formulas must begin with "="', () => {
        expectValue('=1', 1);
        expectValue(' =1 ', ' =1 ');
        expectValue('=  1  ', 1);
    });

    test('Non-string values yield the given value without parsing', () => {
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

describe('Numbers', () => {
    test('Number literals are evaluated in formulas', () => {
        expectValue('=2', 2);
        expectValue('=-2.5', -2.5);
        expectValue('=+2.5', 2.5);
        expectValue('=0.908098', 0.908098);
        expectValue('=10000000.000000', 10000000);
    });
});

describe('Strings', () => {
    test('String literals are evaluated in formulas', () => {
        expectValue('="hello, world"', 'hello, world');
        expectValue('="0.908098"', '0.908098');
        expectValue('="¨úů¨dúsafžüěκόσμεたれホヘ๏ เป็นมนุ"', '¨úů¨dúsafžüěκόσμεたれホヘ๏ เป็นมนุ');
        expectValue('="🇨🇿😊❤✔░"', '🇨🇿😊❤✔░');

    });

    test('Backslash escapes supported escape sequences', () => {
        expectValue('="\\""', '"');       //  \"  =>  "
        expectValue('="\\\\\\""', '\\"'); //  \\\"  =>  \"
        expectValue('="\\\\"', '\\');     //  \\  =>  \
        expectValue('="\\\\"', '\\'); // \\ => \
        expectValue('="\\""', '"'); // \"" => "
        expectValue('="\n"', '\n'); // \n => newline

        expectException('="\\j"', ParsingError); // \j => unknown escape sequence
        expectException('="\\\\\\"', ParsingError);   //  ="\\\"  =>  last quote is escaped
    });
});

describe('Booleans', () => {
    test('boolean literals are supported in formulas', () => {
        expectValue('=TRUE', true);
        expectValue('=FALSE', false);
    });
    test('boolean literals must be uppercase', () => {
        expectException('=true', ParsingError);
        expectException('=false', ParsingError);
    });
})

describe('Unary operators', () => {
    test('unary minus negates the following number', () => {
        expectValue('=-0.2', -0.2);
    });

    test('unary plus does nothing to the value of the following number', () => {
        expectValue('=+0.2', 0.2);
    });

    test('unary + and - throw when operand is not a number', () => {
        expectException('=+"abc"', TypeError);
        expectException('=+"10"', TypeError);
        expectException('=-"abc"', TypeError);
        expectException('=-TRUE', TypeError);
        expectException('=+TRUE', TypeError);
        expectException('=-FALSE', TypeError);
        expectException('=+FALSE', TypeError);
    });

    test('sequences of multiple unary operators work as expected', () => {
        expectValue('=--0.2', 0.2);
        expectValue('=--+-0.2', -0.2);
        expectValue('=--+-+-0.2', 0.2);
        expectValue('=-23', -23);
        expectValue('=- -- + -   -23', -23);
    });

    test('have precedence over binary operators', () => {
        expectValue('=-3 + 2', -1);
        expectValue('=-(3 + 2)', -5);
        expectValue('=-3 - 2', -5);
        expectValue('=-(3 - 2)', -1);
    });
});

describe('Addition operator', () => {
    test('adds two numbers', () => {
        expectValue('= 1 + 3', 4);
        expectValue('= -1 + 3', 2);
        expectValue('= -1 + -3', -4);
        expectValue('= 1 + -3', -2);
        expectValue('=0.1 + 0.2', 0.1 + 0.2); // 0.30000000000000004 because of binary floating point numbers
    });

    test('concatenates two strings', () => {
        expectValue('="abc" + "def"', 'abcdef');
        expectValue('="abc" + "def" + "ghi"', 'abcdefghi');
    });

    test('throws TypeError when both operands are not strings or numbers', () => {
        expectException('=1 + "s"', TypeError);
        expectException('="s" + 1', TypeError);
        expectException('=TRUE + 1', TypeError);
        expectException('=TRUE + "s"', TypeError);
        expectException('=1 + FALSE', TypeError);
        expectException('="s" + FALSE', TypeError);
    });

    test('mathematical properties of addition are true', () => {
        // Commutativity
        expectValue('=4 + 7', 11);
        expectValue('=7 + 4', 11);

        // Associativity
        expectValue('=(7 + 4) + 3', 14);
        expectValue('=7 + (4 + 3)', 14);
        expectValue('=7 + 4 + 3', 14);

        // 0 is identity element
        expectValue('=7 + 0', 7);
        expectValue('=0 + 7', 7);
        expectValue('=7', 7);
    });
});

describe('Subtraction operator', () => {
    test('subtracts two numbers', () => {
        expectValue('=20-40', -20);
        expectValue('=-20-40', -60);
        expectValue('=-20 - -40', 20);
        expectValue('=20 - -40', 60);
        expectValue('=0.3 - 0.1', 0.3 - 0.1); // 0.19999999999999998 because of binary floating point numbers
    });

    test('throws TypeError when both operands are not numbers', () => {
        expectException('="s" - "s"', TypeError);
        expectException('=1 - "s"', TypeError);
        expectException('="s" - 1', TypeError);
        expectException('=TRUE - 1', TypeError);
        expectException('=TRUE - "s"', TypeError);
        expectException('=1 - FALSE', TypeError);
        expectException('="s" - FALSE', TypeError);
    });

    test('Matematical properties of subtraction are true', () => {
        // Anticommutativity
        //a − b = −(b − a).
        expectValue('=7 - 3', 4);
        expectValue('=-(3 - 7)', 4);

        // Non-associativity (evaluated from left to right)
        expectValue('=2 - 3 - 4', -5);
        expectValue('=(2 - 3) - 4', -5);
        expectValue('=2 - (3 - 4)', 3);
    });
});

describe('Multiplication operator', () => {
    test('multiplies two numbers', () => {
        expectValue('=2*3.4', 6.8);
        expectValue('=2*-3', -6);
        expectValue('=-2*3', -6);
        expectValue('=-2*-3', 6);
        expectValue('=0.3*3', 0.3 * 3); // 0.8999999999999999 because of floating point numbers
        expectValue('=3*0.3', 0.3 * 3); // 0.8999999999999999 because of floating point numbers
    });

    test('throws TypeError when operands are not numbers', () => {
        expectException('="s" * 1', TypeError);
        expectException('=1 * "s"', TypeError);
        expectException('="s" * "s"', TypeError);
        expectException('=TRUE * 1', TypeError);
        expectException('=TRUE * "s"', TypeError);
        expectException('=1 * FALSE', TypeError);
        expectException('="s" * FALSE', TypeError);
    });

    test('Mathematical properties of multiplication are true', () => {
        // Commutativity
        expectValue('=3.5 * 7', 24.5);
        expectValue('=7 * 3.5', 24.5);

        // Associativity
        expectValue('=(7 * 4) * 3', 84);
        expectValue('=7 * (4 * 3)', 84);
        expectValue('=7 * 4 * 3', 84);

        // Distributivity
        expectValue('=3 * (4 + 5)', 27);
        expectValue('=(3*4) + (3*5)', 27);

        // 1 is identity element
        expectValue('=1 * 34', 34)
        expectValue('=34', 34)

        // Property of 0
        expectValue('=0 * 232', 0);
        expectValue('=0', 0);

        // Negation
        expectValue('=(-1) * 86.1', -86.1);
        expectValue('=-86.1', -86.1);
        expectValue('=(-86.1) + 86.1', 0);

        // Inverse element
        // x * (1/x) = 1
        expectValue('=23.3 * (1/23.3)', 1);
        expectValue('=1', 1);
    });
});

describe('Division operator', () => {
    test('divides two numbers', () => {
        expectValue('=3.4/2', 1.7);
        expectValue('=6/2.5', 2.4);
        expectValue('=-6/2', -3);
        expectValue('=6/-2', -3);
        expectValue('=-6/-2', 3);
        expectValue('=0.3/0.1', 0.3 / 0.1); // 2.9999999999999996 because of floating point numbers
    });

    test('throws TypeError when both operands are not numbers', () => {
        expectException('="s" / "s"', TypeError);
        expectException('=1 / "s"', TypeError);
        expectException('="s" / 1', TypeError);
        expectException('=TRUE / 1', TypeError);
        expectException('=TRUE / "s"', TypeError);
        expectException('=1 / FALSE', TypeError);
        expectException('="s" / FALSE', TypeError);
    });

    test('Mathematical properties of division are true', () => {
        // Not commutative
        expectValue('= 6 / 3', 2);
        expectValue('= 3 / 6', 0.5);

        // Non-associativity (evaluated from left to right)
        expectValue('=24 / 3 / 4', 2);
        expectValue('=(24 / 3) / 4', 2);
        expectValue('=24 / (3 / 4)', 32);

        // Distributive
        expectValue('=(4 + 5) / 3', 3);
        expectValue('=(4/3) + (5/3)', 3);

        // Not left distributive
        expectValue('=3 / (4 + 5)', 1 / 3);
        expectValue('=(3/4) + (3/5)', 1.35);
    });
});

describe('Operator precendence', () => {
    test('Multiplication and division has precedence over addition and subtraction', () => {
        expectValue('=2 + 3 * 4 + 5', 19);
        expectValue('=2 * 3 + 4 * 5', 26);
        expectValue('=2 * 3 + 4', 10);
        expectValue('=2 + 3 * 4', 14);

        expectValue('=2 - 4 / 8 - 16', -14.5);
        expectValue('=2 / 4 - 8 / 16', 0);
        expectValue('=1 / 2 - 4', -3.5);
        expectValue('=1 - 2 / 4', 0.5);

        expectValue('=2 + 4 / 8 + 16', 18.5);
        expectValue('=2 / 4 + 8 / 16', 1);
        expectValue('=1 / 2 + 4', 4.5);
        expectValue('=1 + 2 / 4', 1.5);

        expectValue('=2 - 4 * 8 - 16', -46);
        expectValue('=2 * 4 - 8 * 16', -120);
        expectValue('=2 * 3 - 4', 2);
        expectValue('=2 - 3 * 4', -10);
    });
});

describe('Parentheses', () => {
    test('work properly', () => {
        expectValue('=3*(2+4)', 18);
        expectValue('=(((3))*(((((2)+((4)))))))', 18);
        expectException('=3*(2+4', ParsingError);
        expectException('=3*(2+4))', ParsingError);
        expectException('=3*((2+4)', ParsingError);
        expectException('=3*(2+4())', ParsingError);
        expectException('=((((3))*(((((2)+((4)))))))', ParsingError);
        expectException('=((3))*(((((2)+((4)))))))', ParsingError);
        expectException('=A2()', UnknownFunctionError);
        expectException('=3*()2', ParsingError);
    });
});

describe('Cell references', () => {
    test('give value at referenced cell', () => {
        const spreadsheet = new Spreadsheet({
            cells: { A1: 34, A2: '42', A3: '=23', Z3423: '=A1 + A3', B43: '=23 + 5.2 + Z3423 + Z3423 + A1' }
        });
        expect(spreadsheet.getValue('A1')).toBe(34);
        expect(spreadsheet.getValue('A2')).toBe(42);
        expect(spreadsheet.getValue('A3')).toBe(23);
        expect(spreadsheet.getValue('Z3423')).toBe(57);
        expect(spreadsheet.getValue('B43')).toBe(176.2);
    });

    test('rows are parsed as numbers', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
        expect(spreadsheet.evaluateQuery('=A1')).toBe(1);
        expect(spreadsheet.evaluateQuery('=A01')).toBe(1);
    });

    test('Cell references are case sensitive', () => {
        const spreadsheet = new Spreadsheet({ cells: { a1: 1, A2: 2 } });
        expect(spreadsheet.evaluateQuery('=a1')).toBe(1);
        expect(spreadsheet.evaluateQuery('=A1')).toBe(null);
        expect(spreadsheet.evaluateQuery('=A2')).toBe(2);
        expect(spreadsheet.evaluateQuery('=a2')).toBe(null);
    });

    test('Columns can go further than Z', () => {
        const spreadsheet = new Spreadsheet({
            cells: { Y10: 1, Z10: 2, AA10: 3, AB10: 4, '[': 99 },
            functions: builtinFunctions
        });
        expect(spreadsheet.evaluateQuery('=AA10')).toBe(3);
        expect(spreadsheet.evaluateQuery('=SUM(Y10:AB10)')).toBe(10);
        expect(() => spreadsheet.evaluateQuery('=AŽ10')).toThrow(ParsingError);
    })

    test('Cyclic references cause runtime exception', () => {
        const spreadsheet = new Spreadsheet({
            cells: { A1: '=A2', A2: '=A1' }, functions: builtinFunctions
        });

        expect(() => spreadsheet.getValue('A1')).toThrow(CircularReferenceError);

        const spreadsheet2 = new Spreadsheet({
            cells: { A1: '=2 * A1' }, functions: builtinFunctions
        });

        expect(() => spreadsheet2.getValue('A1')).toThrow(CircularReferenceError);

        const spreadsheet3 = new Spreadsheet({
            cells: { B2: '=SUM(A1:C3)' }, functions: builtinFunctions
        });

        expect(() => spreadsheet3.getValue('B2')).toThrow(CircularReferenceError);
    });
});

describe('Range references', () => {
    test('Range references work for any start and end position', () => {
        const spreadsheet = new Spreadsheet({
            cells: {
                A1: 1, B1: 2, C1: 3, D1: 4,
                A2: 5, B2: 6, C2: 7, D2: 8,
                A3: 9, B3: 10, C3: 11, D3: 12,
                A4: 13, B4: 14, C4: 15, D4: 16,
                A5: 17, B5: 18, C5: 19, D5: 20,
            },
            functions: builtinFunctions
        });
        expect(spreadsheet.evaluateQuery('=SUM(A1:C3)')).toBe(54)
        expect(spreadsheet.evaluateQuery('=SUM(C3:A1)')).toBe(54);
        expect(spreadsheet.evaluateQuery('=SUM(A1:A1)')).toBe(1);
        expect(spreadsheet.evaluateQuery('=SUM(A1:D1)')).toBe(10);
        expect(spreadsheet.evaluateQuery('=SUM(D1:A1)')).toBe(10);
        expect(spreadsheet.evaluateQuery('=SUM(A1:A5)')).toBe(45);
        expect(spreadsheet.evaluateQuery('=SUM(A5:A1)')).toBe(45);
    });

    test('Range references are allowed only as function arguments', () => {
        expectException('=A2:A4', RangeReferenceNotAllowedError);
        expectException('=3 + A2:A4', RangeReferenceNotAllowedError);
        expectException('=-A2:A4', RangeReferenceNotAllowedError);
        const spreadsheet = new Spreadsheet({
            cells: { A1: '1', A2: '2', A3: '=SUM(A1:A2)' },
            functions: builtinFunctions
        });
        expect(spreadsheet.getValue('A3')).toBe(3);
    });
});

describe('Spreadsheet functions', () => {
    test('Spreadsheet accepts user defined functions in js', () => {
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

    test('Spreadsheet functions can have multiple arguments and be any JS function', () => {
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

    test('Ranges are passed to functions as arrays', () => {
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

    test('Functions can be nested', () => {
        const spreadsheet = new Spreadsheet({
            cells: { A1: 1, A2: 2, B1: 3, B2: 4 },
            functions: { ADD: (a, b) => a + b }
        });
        expect(spreadsheet.evaluateQuery('=ADD(A1, ADD(ADD(2, A2), ADD(B1, B2)))')).toBe(12);
    });

    test('Functions can return arbitrary JS values, even functions', () => {
        const testFunction1 = function (name) { return `Hello, ${name}` };
        const testFunction2 = function () { return testFunction1 };
        const spreadsheet = new Spreadsheet({ functions: { TEST: testFunction2 } });
        expect(spreadsheet.evaluateQuery('=TEST()')).toBe(testFunction1);
    });

    test('Functions can accept any JS values as arguments', () => {
        const fn = () => 2;
        const spreadsheet = new Spreadsheet({ cells: { A1: 1, A2: fn, B1: 3, B2: 4 } });
        expect(spreadsheet.evaluateQuery('=A2')).toBe(fn);
    });

    test('Cannot call result of a function', () => {
        expectException('=SUM(2, 3)()', ParsingError);
    });

    test('Exceptions in functions cause FunctionEvaluationErrors when evaluated', () => {
        const spreadsheet = new Spreadsheet({
            functions: { THROW: () => { throw new Error('Testing...'); } }
        });
        expect(() => spreadsheet.evaluateQuery('=THROW()')).toThrow(FunctionEvaluationError);
    });

    test('Function throws when argument throws', () => {
        const spreadsheet = new Spreadsheet({
            functions: { ...builtinFunctions, THROW: () => { throw 'testing' } }
        });
        expect(() => spreadsheet.evaluateQuery('=SUM(1, THROW())')).toThrowError('testing');
    });

    test('When a function references a function with errors, it throws a ReferencedCellError', () => {
        const spreadsheet = new Spreadsheet({
            cells: { A1: '=(', A2: '=A2:A4', A3: '=A1', A4: '=A2' }
        });
        expect(() => spreadsheet.getValue('A3')).toThrow(ReferencedCellError);
        expect(() => spreadsheet.getValue('A4')).toThrow(ReferencedCellError);
    });

    test('Function arguments can be expressions, which are evaluated', () => {
        expectValue('=SUM(1, 2 + 8, SUM(3, 4, 5))', 23);
    });

    test('Function names can be any valid identifier', () => {
        expectException('=A(', ParsingError);
        expectException('=1A()', ParsingError);
        expectException('=_A()', ParsingError);
        expectException('=A()', UnknownFunctionError);
        expectException('=AB()', UnknownFunctionError);
        expectException('=A_B()', UnknownFunctionError);
        expectException('=A1()', UnknownFunctionError);
        expectException('=A-()', ParsingError);
        expectException('=A:()', ParsingError);
        expectException('=A1:A3()', ParsingError);
    })
});

describe('Cell edit', () => {
    test('cells can be edited', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: '=1' } });
        expect(spreadsheet.getValue('A1')).toBe(1);
        spreadsheet.setText('A1', '=5');
        expect(spreadsheet.getValue('A1')).toBe(5);
    });

    test('propagates to referencing cells', () => {
        const spreadsheet = new Spreadsheet({
            cells: { A1: 1, A2: '=A1 * 2', A3: '=A2 * 2', A4: '= A3 * 2' }
        });

        expect(spreadsheet.getValue('A1')).toBe(1);
        expect(spreadsheet.getValue('A2')).toBe(2);
        expect(spreadsheet.getValue('A3')).toBe(4);
        expect(spreadsheet.getValue('A4')).toBe(8);

        spreadsheet.setText('A1', '=3+2');
        expect(spreadsheet.getValue('A1')).toBe(5);
        expect(spreadsheet.getValue('A2')).toBe(10);
        expect(spreadsheet.getValue('A3')).toBe(20);
        expect(spreadsheet.getValue('A4')).toBe(40);
    });

    test('works properly even without evaluating other cells first', () => {
        const spreadsheet = new Spreadsheet({
            cells: { A1: 1, A2: '=A1 * 2', A3: '=A2 * 2', A4: '= A3 * 2' }
        });

        // evaluates A3, which depends on A2, but on A1 only indirectly
        spreadsheet.getValue('A3');

        // changes A1, A3 should be invalidated even though A2 was never queried
        spreadsheet.setText('A1', '=3+2');
        expect(spreadsheet.getValue('A1')).toBe(5);
        expect(spreadsheet.getValue('A2')).toBe(10);
        expect(spreadsheet.getValue('A3')).toBe(20);
        expect(spreadsheet.getValue('A4')).toBe(40);
    });

    test('propagates with ranges', () => {
        const spreadsheet = new Spreadsheet({
            cells: { A1: 1, A2: 2, A3: 4, A4: '=SUM(A1:A3)' },
            functions: builtinFunctions
        });

        expect(spreadsheet.getValue('A1')).toBe(1);
        expect(spreadsheet.getValue('A2')).toBe(2);
        expect(spreadsheet.getValue('A3')).toBe(4);
        expect(spreadsheet.getValue('A4')).toBe(7);

        spreadsheet.setText('A1', 5);
        expect(spreadsheet.getValue('A1')).toBe(5);
        expect(spreadsheet.getValue('A2')).toBe(2);
        expect(spreadsheet.getValue('A3')).toBe(4);
        expect(spreadsheet.getValue('A4')).toBe(11);
    });

    test('propagates with ranges even if not all evaluated', () => {
        const spreadsheet = new Spreadsheet({
            cells: { A1: 1, A2: '=SUM(A1:A1)', A3: '=SUM(A2:A2)', A4: '=SUM(A3:A3)' },
            functions: builtinFunctions
        });

        spreadsheet.getValue('A3');

        spreadsheet.setText('A1', 5);
        expect(spreadsheet.getValue('A1')).toBe(5);
        expect(spreadsheet.getValue('A2')).toBe(5);
        expect(spreadsheet.getValue('A3')).toBe(5);
        expect(spreadsheet.getValue('A4')).toBe(5);
    });

    test('Cell changes are reported', () => {
        const changedPositions = [];
        const spreadsheet = new Spreadsheet({
            cells: { A1: 1, A2: '=A1' }, onCellsChanged: changed => changedPositions.push(changed)
        });

        expect(spreadsheet.getValue('A1')).toBe(1);
        expect(spreadsheet.getValue('A2')).toBe(1);

        spreadsheet.setText('A1', 2);
        expect(changedPositions).toStrictEqual([['A1', 'A2']]);

        expect(spreadsheet.getValue('A1')).toBe(2);
        expect(spreadsheet.getValue('A2')).toBe(2);
    });

    test('Cell changes are reported only for already evaluated cells', () => {
        const changedPositions = [];
        const spreadsheet = new Spreadsheet({
            cells: { A1: 1, A2: '=A1 * 2', A3: '=A2 * 2', A4: '= A3 * 2' },
            onCellsChanged: changed => changedPositions.push(changed)
        });

        // evaluates A3, A2 and A1
        spreadsheet.getValue('A3');

        // changes A1, A2, A3 but not A4 since A4 was never evaluated
        spreadsheet.setText('A1', '=3+2');
        expect(changedPositions).toStrictEqual([['A1', 'A2', 'A3']]);
    });

    test('Cell change is not triggered if original cell text remains unchanged', () => {
        const changedPositions = [];
        const spreadsheet = new Spreadsheet({
            cells: { A1: 1, A2: '=A1 * 2', A3: '=A2 * 2', A4: '= A3 * 2' },
            onCellsChanged: changed => changedPositions.push(changed)
        });

        // evaluates A3, A2 and A1
        spreadsheet.getValue('A3');
        spreadsheet.setText('A1', '1');
        spreadsheet.setText('A2', '=A1 * 2');

        expect(changedPositions.length).toBe(0);
    });

    test('Cell edits do not trigger a cell change for cells after their reference has changed', () => {
        let changedPositions = [];
        const spreadsheet = new Spreadsheet({
            cells: { A1: 1, A2: '=A1 * 2', A3: '=A2 * 2', A4: '= A3 * 2', A5: '=A2', A6: '=A3', A7: '=A4' },
            onCellsChanged: changed => changedPositions.push(changed)
        });
        // trigger evaluation of A1-A4
        spreadsheet.getValue('A4');

        spreadsheet.setText('A3', '=A1 * 2');
        expect(changedPositions).toStrictEqual([['A3', 'A4']]);

        changedPositions = [];
        // trigger evaluation of A1-A4
        spreadsheet.getValue('A4');
        spreadsheet.getValue('A2');
        spreadsheet.setText('A2', 10);
        expect(changedPositions).toStrictEqual([['A2']]);
    });
});

describe('Spreadsheet event listeners', () => {
    test('unsupported event types throw an error', () => {
        const spreadsheet = new Spreadsheet();
        expect(() => spreadsheet.addListener('aiosudfaslkd', () => { })).toThrow();
        expect(() => spreadsheet.removeListener('aiosudfaslkd', () => { })).toThrow();
    });

    test('cellsChanged event listener is called on cell change', () => {

    });

    test('event listeners are called in the order they were added', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
        const eventHistory = [];
        const listener1 = () => eventHistory.push(1);
        const listener2 = () => eventHistory.push(2);
        const listener3 = () => eventHistory.push(3);

        spreadsheet.addListener('cellsChanged', listener1);
        spreadsheet.addListener('cellsChanged', listener2);
        spreadsheet.addListener('cellsChanged', listener3);

        expect(eventHistory).toEqual([]);

        // Make sure the value is used (else cellsChanged will not be called)
        spreadsheet.getValue('A1');
        spreadsheet.setText('A1', '2');
        expect(eventHistory).toEqual([1, 2, 3]);

        spreadsheet.setText('A1', '3');
        expect(eventHistory).toEqual([1, 2, 3, 1, 2, 3]);
    });

    test('the same event listener can be added multiple times', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
        const eventHistory = [];
        let value1 = 0;
        const listener1 = () => eventHistory.push(value1++);
        let value2 = 100;
        const listener2 = () => eventHistory.push(value2++);

        spreadsheet.addListener('cellsChanged', listener1);
        spreadsheet.addListener('cellsChanged', listener2);
        spreadsheet.addListener('cellsChanged', listener1);
        spreadsheet.addListener('cellsChanged', listener1);

        // Make sure the value is used (else cellsChanged will not be called)
        spreadsheet.getValue('A1');

        spreadsheet.setText('A1', '2');
        expect(eventHistory).toEqual([0, 100, 1, 2]);
    });

    test('event listener is not called after being unregistered', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
        const eventHistory = [];
        const eventListener = () => eventHistory.push('called');
        spreadsheet.addListener('cellsChanged', eventListener);

        // Make sure the value is used (else cellsChanged will not be called)
        spreadsheet.getValue('A1');

        spreadsheet.removeListener('cellsChanged', eventListener);
        spreadsheet.setText('A1', '2');
        expect(eventHistory.length).toBe(0);
    });

    test('removeEventListener removes only listener with same type and callback', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
        const eventHistory = [];
        const eventListener = () => eventHistory.push('changed');
        spreadsheet.addListener('cellsChanged', eventListener);

        spreadsheet.removeListener('cellsChanged', () => { });

        // Make sure the value is used (else cellsChanged will not be called)
        spreadsheet.getValue('A1');

        spreadsheet.setText('A1', '2');
        expect(eventHistory).toEqual(['changed']);
        spreadsheet.setText('A1', '3');
        expect(eventHistory).toEqual(['changed', 'changed']);

        spreadsheet.removeListener('cellsChanged', eventListener);
        spreadsheet.setText('A1', '4');
        expect(eventHistory).toEqual(['changed', 'changed']);
    });

    test('when an event listener is registered mulitple times, removeEventListener removes only the last one', () => {
        const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
        const eventHistory = [];
        let value1 = 0;
        const listener1 = () => eventHistory.push(value1++);
        let value2 = 100;
        const listener2 = () => eventHistory.push(value2++);

        spreadsheet.addListener('cellsChanged', listener1);
        spreadsheet.addListener('cellsChanged', listener2);
        spreadsheet.addListener('cellsChanged', listener1);
        spreadsheet.addListener('cellsChanged', listener1);

        // Make sure the value is used (else cellsChanged will not be called)
        spreadsheet.getValue('A1');

        spreadsheet.removeListener('cellsChanged', listener1);
        spreadsheet.setText('A1', '2');
        expect(eventHistory).toEqual([0, 100, 1]);

        spreadsheet.removeListener('cellsChanged', listener1);
        spreadsheet.setText('A1', '3');
        expect(eventHistory).toEqual([0, 100, 1, 2, 101]);
    });

    test('removing an unregistered event listener does not throw', () => {
        const spreadsheet = new Spreadsheet();
        const listener = () => { };
        spreadsheet.removeListener('cellsChanged', listener);

        spreadsheet.addListener('cellsChanged', listener);
        spreadsheet.removeListener('cellsChanged', () => { });
        spreadsheet.removeListener('cellsChanged', listener);
        spreadsheet.removeListener('cellsChanged', listener);
    });
})