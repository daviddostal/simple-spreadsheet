const SimpleSpreadsheet = require('../dist/simple-spreadsheet');

function expectValue(formula, expected) {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({ A1: formula });
    value = spreadsheet.value('A1');
    return expect(value).toBe(expected);
}

function expectException(formula, exceptionType) {
    return expect(() => new SimpleSpreadsheet.Spreadsheet({ A1: formula }).value('A1'))
        .toThrow(exceptionType);
}

test('Non-formula cells are text by default', () => {
    expectValue('', '');
    expectValue('asdf as', 'asdf as');
    expectValue(' ', ' ');
    expectValue('20.12.2018', '20.12.2018');
    expectValue('12 df', '12 df');
    expectValue('12.2 3', '12.2 3');
});

test('Empty cells contain null values', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet();
    expect(spreadsheet.value('A1')).toBe(null);
});

test('Numeric cells are parsed as numbers', () => {
    expectValue('0', 0);
    expectValue('-31', -31);
    expectValue('23.2', 23.2);
    expectValue('-23.2', -23.2);
    expectValue('+23.2', 23.2);
});

test('Number literals are evaluated in formulas', () => {
    expectValue('=2', 2);
    expectValue('=-2.5', -2.5);
    expectValue('=+2.5', 2.5);
    expectValue('=0.908098', 0.908098);
    expectValue('=10000000.000000', 10000000);
});

test('String literals are evaluated in formulas', () => {
    expectValue('="hello, world"', 'hello, world');
    expectValue('="0.908098"', '0.908098');
    expectValue('="¨úů¨dúsafžüě"', '¨úů¨dúsafžüě');

});

test('Backslash escapes next character in string literal', () => {
    expectValue('="\\""', '"');       //  \"  =>  "
    expectValue('="\\\\\\""', '\\"'); //  \\\"  =>  \"
    expectValue('="\\\\"', '\\');     //  \\  =>  \
    expectValue('="\\jkl"', 'jkl');   //  \jkl  =>  jkl
    expectValue('="\\\\jkl\\\\"', '\\jkl\\');   //  \\jkl  =>  \jkl
    expectException('="\\\\\\"', SimpleSpreadsheet.ParsingError);   //  ="\\\"  =>  last quote is escaped
});

test('Range references are allowed only as function arguments', () => {
    expectException('=A2:A4', SimpleSpreadsheet.RuntimeError);
    expectException('=3 + A2:A4', SimpleSpreadsheet.RuntimeError);
    expectException('=-A2:A4', SimpleSpreadsheet.RuntimeError);
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({ A1: '1', A2: '2', A3: '=SUM(A1:A2)' });
    expect(spreadsheet.value('A3')).toBe(3);
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

test('Unary operators work properly', () => {
    expectValue('=-0.2', -0.2);
    expectValue('=--0.2', 0.2);
    expectValue('=+0.2', 0.2);
    expectValue('=--+-0.2', -0.2);
    expectValue('=--+-+-0.2', 0.2);
    expectValue('=-23', -23);
    expectValue('=- -- + -   -23', -23);
});

test('Unary operators have precedence over binary operators', () => {
    expectValue('=-3 + 2', -1);
    expectValue('=-(3 + 2)', -5);
    expectValue('=-3 - 2', -5);
    expectValue('=-(3 - 2)', -1);
});

test('Binary operators work properly', () => {
    expectValue('= 1 + 3', 4);
    expectValue('=2*3.4', 6.8);
    expectValue('=3.4/2', 1.7);
    expectValue('=6/2.5', 2.4);
    expectValue('=20-40', -20);
    expectValue('=0.1 + 0.2', 0.1 + 0.2); // 0.30000000000000004 because of binary floating point numbers
    expectValue('=0.1 + 0.2', 0.1 + 0.2);
    expectValue('=0.1 - 0.2', 0.1 - 0.2);
});

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

test('Mathematical properties of addition are true', () => {
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

test('Parentheses work properly', () => {
    expectValue('=3*(2+4)', 18);
    expectValue('=(((3))*(((((2)+((4)))))))', 18);
    expectException('=3*(2+4', SimpleSpreadsheet.ParsingError);
    expectException('=3*(2+4))', SimpleSpreadsheet.ParsingError);
    expectException('=3*((2+4)', SimpleSpreadsheet.ParsingError);
    expectException('=3*(2+4())', SimpleSpreadsheet.ParsingError);
    expectException('=((((3))*(((((2)+((4)))))))', SimpleSpreadsheet.ParsingError);
    expectException('=((3))*(((((2)+((4)))))))', SimpleSpreadsheet.ParsingError);
    expectException('=A2()', SimpleSpreadsheet.RuntimeError);
    expectException('=3*()2', SimpleSpreadsheet.ParsingError);
});

test('Cell references give value at referenced cell', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({
        A1: 34, A2: '42', A3: '=23', Z3423: '=A1 + A3', B43: '=23 + 5.2 + Z3423 + Z3423 + A1'
    });
    expect(spreadsheet.value('A1')).toBe(34);
    expect(spreadsheet.value('A2')).toBe(42);
    expect(spreadsheet.value('A3')).toBe(23);
    expect(spreadsheet.value('Z3423')).toBe(57);
    expect(spreadsheet.value('B43')).toBe(176.2);
})

test('Range references work for any start and end position', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({
        A1:  1, B1:  2, C1:  3, D1:  4,
        A2:  5, B2:  6, C2:  7, D2:  8,
        A3:  9, B3: 10, C3: 11, D3: 12,
        A4: 13, B4: 14, C4: 15, D4: 16,
        A5: 17, B5: 18, C5: 19, D5: 20,
    });
    expect(spreadsheet.query('=SUM(A1:C3)')).toBe(54)
    expect(spreadsheet.query('=SUM(C3:A1)')).toBe(54);
    expect(spreadsheet.query('=SUM(A1:A1)')).toBe(1);
    expect(spreadsheet.query('=SUM(A1:D1)')).toBe(10);
    expect(spreadsheet.query('=SUM(D1:A1)')).toBe(10);
    expect(spreadsheet.query('=SUM(A1:A5)')).toBe(45);
    expect(spreadsheet.query('=SUM(A5:A1)')).toBe(45);
})

test('Spreadsheet accepts user defined functions in js', () => {
    const cells = {
        A1: '=ADD1(4)',
        A2: '=ADD1(4.2 + -0.25)',
        A3: '=ADD1(A2)',
        A4: '=ADD1("abc")',
    };
    const functions = { ADD1: x => x + 1 };
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet(cells, functions);
    expect(spreadsheet.value('A1')).toBe(5);
    expect(spreadsheet.value('A2')).toBe(4.95);
    expect(spreadsheet.value('A3')).toBe(5.95);
    expect(spreadsheet.value('A4')).toBe('abc1');
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
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({}, functions);
    expect(spreadsheet.query('=GET_1()')).toBe(1);
    expect(spreadsheet.query('=SUB_3(100)')).toBe(97);
    expect(spreadsheet.query('=POW(2,5)')).toBe(32);
    expect(spreadsheet.query('=POW2(2, 5)')).toBe(32);
    expect(spreadsheet.query('=SUB_THEN_ADD(1, 2, 3)')).toBe(2);
    expect(spreadsheet.query('=MULTIPLY_ALL(2, 3, 4)')).toBe(24);
    expect(spreadsheet.query('=MULTIPLY_ALL()')).toBe(1);
});

test('Ranges are passed to functions as arrays', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet(
        { A1: 1, A2: 2, B1: 3, B2: 4 },
        {
            TEST_RANGE: (numbers) => {
                if (!numbers instanceof Array) throw new Error('Not an array');
                return numbers.reduce((a, b) => a + b, 0);
            }
        });
    expect(spreadsheet.query('=TEST_RANGE(A1:B2)')).toBe(10);
});

test('Functions can be nested', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet(
        { A1: 1, A2: 2, B1: 3, B2: 4 },
        { ADD: (a, b) => a + b });
    expect(spreadsheet.query('=ADD(A1, ADD(ADD(2, A2), ADD(B1, B2)))')).toBe(12);
});

test('Functions can return arbitrary JS values, even functions', () => {
    const testFunction1 = function (name) { return `Hello, ${name}` };
    const testFunction2 = function () { return testFunction1 };
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({},
        { TEST: testFunction2 });
    expect(spreadsheet.query('=TEST()')).toBe(testFunction1);
});

test('Functions can accept any JS values as arguments', () => {
    const fn = () => 2;
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet(
        { A1: 1, A2: fn, B1: 3, B2: 4 }, {});
    expect(spreadsheet.query('=A2')).toBe(fn);
});

test('Exceptions in functions cause RuntimeErrors when evaluated', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({},
        { THROW: () => { throw new Error('Testing...'); } });
    expect(() => spreadsheet.query('=THROW()')).toThrow(SimpleSpreadsheet.RuntimeError);
});

test('Function arguments can be expressions, which are evaluated', () => {
    expectValue('=SUM(1, 2 + 8, SUM(3, 4, 5))', 23);
});

test('Cell references are case sensitive', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({ a1: 1, A2: 2 });
    expect(spreadsheet.query('=a1')).toBe(1);
    expect(spreadsheet.query('=A1')).toBe(null);
    expect(spreadsheet.query('=A2')).toBe(2);
    expect(spreadsheet.query('=a2')).toBe(null);
});

test('Cell reference rows are parsed as numbers', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({ A1: 1 });
    expect(spreadsheet.query('=A1')).toBe(1);
    expect(spreadsheet.query('=A01')).toBe(1);
});
