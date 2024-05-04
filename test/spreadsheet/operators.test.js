import { Spreadsheet, Errors } from '../../src/spreadsheet';
import { expectValue, expectException } from '../test-helpers';

describe('Unary operators', () => {
  test('unary minus negates the following number', () => {
    expectValue('=-0.2', -0.2);
  });

  test('unary plus does nothing to the value of the following number', () => {
    expectValue('=+0.2', 0.2);
  });

  test('infinity and NaN are handled correctly', () => {
    expectValue('=-(1/0)', -Infinity);
    expectValue('=+(1/0)', Infinity);
    expectValue('=-((1/0) - (1/0))', NaN);
    expectValue('=+((1/0) - (1/0))', NaN);
  });

  test('unary + and - throw when operand is not a number', () => {
    expectException('=+"abc"', Errors.TypeError);
    expectException('=+"10"', Errors.TypeError);
    expectException('=-"abc"', Errors.TypeError);
    expectException('=-TRUE', Errors.TypeError);
    expectException('=+TRUE', Errors.TypeError);
    expectException('=-FALSE', Errors.TypeError);
    expectException('=+FALSE', Errors.TypeError);
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

  test('correctly handles Infinity and NaN', () => {
    expectValue('= (1/0) + 3', Infinity);
    expectValue('= (1/0) + -3', Infinity);
    expectValue('= (1/0) + (1/0)', Infinity);
    expectValue('= (-1/0) + (-1/0)', -Infinity);
    expectValue('= (-1/0) + (1/0)', NaN);
    expectValue('= (1/0) + -(1/0)', NaN);
    expectValue('= ((-1/0) + (1/0)) + ((-1/0) + (1/0))', NaN);
  });

  test('concatenates two strings', () => {
    expectValue('="abc" + "def"', 'abcdef');
    expectValue('="abc" + "def" + "ghi"', 'abcdefghi');
  });

  test('throws TypeError when both operands are not strings or numbers', () => {
    expectException('=1 + "s"', Errors.TypeError);
    expectException('="s" + 1', Errors.TypeError);
    expectException('=TRUE + 1', Errors.TypeError);
    expectException('=TRUE + "s"', Errors.TypeError);
    expectException('=1 + FALSE', Errors.TypeError);
    expectException('="s" + FALSE', Errors.TypeError);
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

  test('correctly handles Infinity and NaN', () => {
    expectValue('= (1/0) - 3', Infinity);
    expectValue('= (1/0) - -3', Infinity);
    expectValue('= (1/0) - (1/0)', NaN);
    expectValue('= (-1/0) - (-1/0)', NaN);
    expectValue('= (-1/0) - (1/0)', -Infinity);
    expectValue('= (1/0) - (-1/0)', Infinity);
    expectValue('= ((1/0) - (1/0)) - ((1/0) - (1/0))', NaN);
  });

  test('throws TypeError when both operands are not numbers', () => {
    expectException('="s" - "s"', Errors.TypeError);
    expectException('=1 - "s"', Errors.TypeError);
    expectException('="s" - 1', Errors.TypeError);
    expectException('=TRUE - 1', Errors.TypeError);
    expectException('=TRUE - "s"', Errors.TypeError);
    expectException('=1 - FALSE', Errors.TypeError);
    expectException('="s" - FALSE', Errors.TypeError);
  });

  test('matematical properties of subtraction are true', () => {
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

  test('correctly handles Infinity and NaN', () => {
    expectValue('= (1/0) * 3', Infinity);
    expectValue('= (1/0) * -3', -Infinity);
    expectValue('= (1/0) * (1/0)', Infinity);
    expectValue('= (-1/0) * (-1/0)', Infinity);
    expectValue('= (-1/0) * (1/0)', -Infinity);
    expectValue('= (1/0) * -(1/0)', -Infinity);
    expectValue('= 0 * (1/0)', NaN);
    expectValue('= (1/0) * 0', NaN);
    expectValue('= 0 * (-1/0)', NaN);
    expectValue('= (-1/0) * 0', NaN);
    expectValue('= (0 * (1/0)) * (0 * (1/0))', NaN);
  });

  test('throws TypeError when operands are not numbers', () => {
    expectException('="s" * 1', Errors.TypeError);
    expectException('=1 * "s"', Errors.TypeError);
    expectException('="s" * "s"', Errors.TypeError);
    expectException('=TRUE * 1', Errors.TypeError);
    expectException('=TRUE * "s"', Errors.TypeError);
    expectException('=1 * FALSE', Errors.TypeError);
    expectException('="s" * FALSE', Errors.TypeError);
  });

  test('mathematical properties of multiplication are true', () => {
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

  test('correctly handles Infinity and NaN', () => {
    expectValue('= (1/0) / 3', Infinity);
    expectValue('= (1/0) / -3', -Infinity);
    expectValue('= (1/0) / (1/0)', NaN);
    expectValue('= (-1/0) / (-1/0)', NaN);
    expectValue('= (-1/0) / (1/0)', NaN);
    expectValue('= (1/0) / -(1/0)', NaN);
    expectValue('= 1/0', Infinity);
    expectValue('= -1/0', -Infinity);
    expectValue('= 0/0', NaN);
    expectValue('= 0 / (1/0)', 0);
    expectValue('= (1/0) / 0', Infinity);
    expectValue('= 0 / (-1/0)', -0);
    expectValue('= (-1/0) / 0', -Infinity);
    expectValue('= ((1/0) / (1/0)) / ((1/0) / (1/0))', NaN);
  });

  test('throws TypeError when both operands are not numbers', () => {
    expectException('="s" / "s"', Errors.TypeError);
    expectException('=1 / "s"', Errors.TypeError);
    expectException('="s" / 1', Errors.TypeError);
    expectException('=TRUE / 1', Errors.TypeError);
    expectException('=TRUE / "s"', Errors.TypeError);
    expectException('=1 / FALSE', Errors.TypeError);
    expectException('="s" / FALSE', Errors.TypeError);
  });

  test('mathematical properties of division are true', () => {
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

describe('Equals operator', () => {
  test('compares strings', () => {
    expectValue('="abc" = "abc"', true);
    expectValue('="abc" = "abcd"', false);
    expectValue('="" = ""', true);
    expectValue('="ab" = "a" + "b"', true);
    expectValue('="¨úů¨dúsa\\nfžüěκόσμεたれホヘ๏ เป็นมนุ🇨🇿😊❤✔░" = "¨úů¨dúsa\\nfžüěκόσμεたれホヘ๏ เป็นมนุ🇨🇿😊❤✔░"', true);
    expectValue('="1"=1', false);
    expectValue('=""=0', false);
    expectValue('=""=FALSE', false);
    expectValue('="TRUE"=TRUE', false);
    // ID is needed to get around ranges being allowed only as function arguments
    const spreadsheet = new Spreadsheet({ cells: { A1: 'a' }, functions: { ID: x => x } });
    expect(spreadsheet.evaluateQuery('=ID(A1:A1)="a"')).toBe(false);
  });

  test('compares numbers', () => {
    expectValue('=10 = 10', true);
    expectValue('=-10 = -10', true);
    expectValue('=10 = 11', false);
    expectValue('=-10 = 10', false);
    expectValue('=-0 = 0', true);
    expectValue('=(1/0) = (1/0)', true);
    expectValue('=(-1/0) = (-1/0)', true);
    expectValue('=(-1/0) = (1/0)', false);
    expectValue('=((1/0) - (1/0)) = ((1/0) - (1/0))', false);
    expectValue('=10 = "10"', false);
    expectValue('=0 = ""', false);
    expectValue('=0 = FALSE', false);
    expectValue('=1 = TRUE', false);
    // ID is needed to get around ranges being allowed only as function arguments
    const spreadsheet = new Spreadsheet({ cells: { A1: 1 }, functions: { ID: x => x } });
    expect(spreadsheet.evaluateQuery('=ID(A1:A1)=1')).toBe(false);
  });

  test('compares booleans', () => {
    expectValue('=TRUE = TRUE', true);
    expectValue('=FALSE = FALSE', true);
    expectValue('=FALSE = TRUE', false);
    expectValue('=FALSE = 0', false);
    expectValue('=FALSE = ""', false);
    expectValue('=TRUE = 1', false);
    expectValue('=TRUE = "1"', false);
    // ID is needed to get around ranges being allowed only as function arguments
    const spreadsheet = new Spreadsheet({ cells: { A1: false }, functions: { ID: x => x } });
    expect(spreadsheet.evaluateQuery('=ID(A1:A1)=FALSE')).toBe(false);
  });

  test('compares null and undefined', () => {
    // ID is needed to get around ranges being allowed only as function arguments
    const spreadsheet = new Spreadsheet({ cells: { A1: null, A2: undefined }, functions: { ID: x => x } });
    expect(spreadsheet.evaluateQuery('=A1=A1')).toBe(true);
    expect(spreadsheet.evaluateQuery('=A2=A2')).toBe(true);
    expect(spreadsheet.evaluateQuery('=A1=A2')).toBe(false);
    expect(spreadsheet.evaluateQuery('=A1=0')).toBe(false);
    expect(spreadsheet.evaluateQuery('=A2=0')).toBe(false);
    expect(spreadsheet.evaluateQuery('=A1=FALSE')).toBe(false);
    expect(spreadsheet.evaluateQuery('=A2=FALSE')).toBe(false);
    expect(spreadsheet.evaluateQuery('=A1=""')).toBe(false);
    expect(spreadsheet.evaluateQuery('=A2=""')).toBe(false);
    expect(spreadsheet.evaluateQuery('=ID(A1:A1)=A1')).toBe(false);
  });

  test('compares ranges', () => {
    const spreadsheet = new Spreadsheet({
      cells: {
        A1: 1, A2: '2', A3: true,
        B1: 1, B2: '=1+1', B3: '=TRUE',
        C1: '2', C2: 1, C3: true,
      },
      // ID is needed to get around ranges being allowed only as function arguments
      functions: { ID: x => x }
    });
    expect(spreadsheet.evaluateQuery('=ID(A1:A3)=ID(B1:B3)')).toBe(true);
    expect(spreadsheet.evaluateQuery('=ID(A1:A2)=ID(A1:A3)')).toBe(false);
    expect(spreadsheet.evaluateQuery('=ID(A1:A3)=ID(A1:A2)')).toBe(false);
    expect(spreadsheet.evaluateQuery('=ID(A1:A3)=ID(C1:C3)')).toBe(false);
    expect(spreadsheet.evaluateQuery('=ID(A1:B2)=ID(A1:B2)')).toBe(true);
  });

  test('compares other types through ===', () => {
    let obj1 = {};
    let fn1 = () => { };
    let symbol1 = Symbol('test');
    const spreadsheet = new Spreadsheet({
      cells: {
        A1: obj1, A2: obj1, A3: {},
        B1: fn1, B2: fn1, B3: () => { },
        C1: symbol1, C2: symbol1, C3: Symbol('test')
      }
    });

    expect(spreadsheet.evaluateQuery('=A1=A2')).toBe(true);
    expect(spreadsheet.evaluateQuery('=A1=A3')).toBe(false);
    expect(spreadsheet.evaluateQuery('=B1=B2')).toBe(true);
    expect(spreadsheet.evaluateQuery('=B1=B3')).toBe(false);
    expect(spreadsheet.evaluateQuery('=C1=C2')).toBe(true);
    expect(spreadsheet.evaluateQuery('=C1=C3')).toBe(false);
  });
});

describe('Not equal operator', () => {
  test('compares strings', () => {
    expectValue('="abc" <> "abc"', false);
    expectValue('="abc" <> "abcd"', true);
    expectValue('="" <> ""', false);
    expectValue('="ab" <> "a" + "b"', false);
    expectValue('="¨úů¨dúsa\\nfžüěκόσμεたれホヘ๏ เป็นมนุ🇨🇿😊❤✔░" <> "¨úů¨dúsa\\nfžüěκόσμεたれホヘ๏ เป็นมนุ🇨🇿😊❤✔░"', false);
    expectValue('="1"<>1', true);
    expectValue('=""<>0', true);
    expectValue('=""<>FALSE', true);
    expectValue('="TRUE"<>TRUE', true);
    // ID is needed to get around ranges being allowed only as function arguments
    const spreadsheet = new Spreadsheet({ cells: { A1: 'a' }, functions: { ID: x => x } });
    expect(spreadsheet.evaluateQuery('=ID(A1:A1)<>"a"')).toBe(true);
  });

  test('compares numbers', () => {
    expectValue('=10 <> 10', false);
    expectValue('=-10 <> -10', false);
    expectValue('=10 <> 11', true);
    expectValue('=-10 <> 10', true);
    expectValue('=-0 <> 0', false);
    expectValue('=(1/0) <> (1/0)', false);
    expectValue('=(-1/0) <> (-1/0)', false);
    expectValue('=(-1/0) <> (1/0)', true);
    expectValue('=((1/0) - (1/0)) <> ((1/0) - (1/0))', true);
    expectValue('=10 <> "10"', true);
    expectValue('=0 <> ""', true);
    expectValue('=0 <> FALSE', true);
    expectValue('=1 <> TRUE', true);
    // ID is needed to get around ranges being allowed only as function arguments
    const spreadsheet = new Spreadsheet({ cells: { A1: 1 }, functions: { ID: x => x } });
    expect(spreadsheet.evaluateQuery('=ID(A1:A1) <> 1')).toBe(true);
  });

  test('compares booleans', () => {
    expectValue('=TRUE <> TRUE', false);
    expectValue('=FALSE <> FALSE', false);
    expectValue('=FALSE <> TRUE', true);
    expectValue('=FALSE <> 0', true);
    expectValue('=FALSE <> ""', true);
    expectValue('=TRUE <> 1', true);
    expectValue('=TRUE <> "1"', true);
    // ID is needed to get around ranges being allowed only as function arguments
    const spreadsheet = new Spreadsheet({ cells: { A1: false }, functions: { ID: x => x } });
    expect(spreadsheet.evaluateQuery('=ID(A1:A1)<>FALSE')).toBe(true);
  });

  test('compares null and undefined', () => {
    // ID is needed to get around ranges being allowed only as function arguments
    const spreadsheet = new Spreadsheet({ cells: { A1: null, A2: undefined }, functions: { ID: x => x } });
    expect(spreadsheet.evaluateQuery('=A1<>A1')).toBe(false);
    expect(spreadsheet.evaluateQuery('=A2<>A2')).toBe(false);
    expect(spreadsheet.evaluateQuery('=A1<>A2')).toBe(true);
    expect(spreadsheet.evaluateQuery('=A1<>0')).toBe(true);
    expect(spreadsheet.evaluateQuery('=A2<>0')).toBe(true);
    expect(spreadsheet.evaluateQuery('=A1<>FALSE')).toBe(true);
    expect(spreadsheet.evaluateQuery('=A2<>FALSE')).toBe(true);
    expect(spreadsheet.evaluateQuery('=A1<>""')).toBe(true);
    expect(spreadsheet.evaluateQuery('=A2<>""')).toBe(true);
    expect(spreadsheet.evaluateQuery('=ID(A1:A1)<>A1')).toBe(true);
  });

  test('compares ranges', () => {
    const spreadsheet = new Spreadsheet({
      cells: {
        A1: 1, A2: '2', A3: true,
        B1: 1, B2: '=1+1', B3: '=TRUE',
        C1: '2', C2: 1, C3: true,
      },
      // ID is needed to get around ranges being allowed only as function arguments
      functions: { ID: x => x }
    });
    expect(spreadsheet.evaluateQuery('=ID(A1:A3)<>ID(B1:B3)')).toBe(false);
    expect(spreadsheet.evaluateQuery('=ID(A1:A2)<>ID(A1:A3)')).toBe(true);
    expect(spreadsheet.evaluateQuery('=ID(A1:A3)<>ID(A1:A2)')).toBe(true);
    expect(spreadsheet.evaluateQuery('=ID(A1:A3)<>ID(C1:C3)')).toBe(true);
    expect(spreadsheet.evaluateQuery('=ID(A1:B2)<>ID(A1:B2)')).toBe(false);
  });

  test('compares other types through ===', () => {
    let obj1 = {};
    let fn1 = () => { };
    let symbol1 = Symbol('test');
    const spreadsheet = new Spreadsheet({
      cells: {
        A1: obj1, A2: obj1, A3: {},
        B1: fn1, B2: fn1, B3: () => { },
        C1: symbol1, C2: symbol1, C3: Symbol('test')
      }
    });

    expect(spreadsheet.evaluateQuery('=A1<>A2')).toBe(false);
    expect(spreadsheet.evaluateQuery('=A1<>A3')).toBe(true);
    expect(spreadsheet.evaluateQuery('=B1<>B2')).toBe(false);
    expect(spreadsheet.evaluateQuery('=B1<>B3')).toBe(true);
    expect(spreadsheet.evaluateQuery('=C1<>C2')).toBe(false);
    expect(spreadsheet.evaluateQuery('=C1<>C3')).toBe(true);
  });
});

describe('Greater than operator', () => {
  test('compares numbers', () => {
    expectValue('=1 > 1', false);
    expectValue('=1 > 2', false);
    expectValue('=2 > 1', true);
    expectValue('=-1 > 2', false);
    expectValue('=2 > -1', true);
    expectValue('=1 > -2', true);
    expectValue('=-2 > 1', false);
    expectValue('=-1 > -2', true);
    expectValue('=-2 > -1', false);
    expectValue('=(1/0) > (1/0)', false);
    expectValue('=-999 > (-1/0)', true);
    expectValue('=(1/0) > (-1/0)', true);
    expectValue('=(-1/0) > (1/0)', false);
    expectValue('=(1/0 - 1/0) > (1/0 - 1/0)', false);
    expectValue('=(1/0 - 1/0) > 0', false);
    expectValue('=(1/0 - 1/0) > (-1/0)', false);
  });

  test('throws when operands are not numbers', () => {
    expectException('=1 > "a"', Errors.TypeError);
    expectException('="a" > 1', Errors.TypeError);
    expectException('=TRUE > 0', Errors.TypeError);
    expectException('=1 > FALSE', Errors.TypeError);
    expectException('=1 > Z99', Errors.TypeError);
  });
});

describe('Less than operator', () => {
  test('compares numbers', () => {
    expectValue('=1 < 1', false);
    expectValue('=1 < 2', true);
    expectValue('=2 < 1', false);
    expectValue('=-1 < 2', true);
    expectValue('=2 < -1', false);
    expectValue('=1 < -2', false);
    expectValue('=-2 < 1', true);
    expectValue('=-1 < -2', false);
    expectValue('=-2 < -1', true);
    expectValue('=(1/0) < (1/0)', false);
    expectValue('=999 < (1/0)', true);
    expectValue('=(-1/0) < (1/0)', true);
    expectValue('=(1/0) < (-1/0)', false);
    expectValue('=(1/0 - 1/0) < (1/0 - 1/0)', false);
    expectValue('=(1/0 - 1/0) < 0', false);
    expectValue('=(1/0 - 1/0) < (-1/0)', false);
  });

  test('throws when operands are not numbers', () => {
    expectException('=1 < "a"', Errors.TypeError);
    expectException('="a" < 1', Errors.TypeError);
    expectException('=TRUE < 0', Errors.TypeError);
    expectException('=1 < FALSE', Errors.TypeError);
    expectException('=1 < Z99', Errors.TypeError);
  });
});

describe('Greater or equal operator', () => {
  test('compares numbers', () => {
    expectValue('=1 >= 1', true);
    expectValue('=-0 >= +0', true);
    expectValue('=1 >= 2', false);
    expectValue('=2 >= 1', true);
    expectValue('=-1 >= 2', false);
    expectValue('=2 >= -1', true);
    expectValue('=1 >= -2', true);
    expectValue('=-2 >= 1', false);
    expectValue('=-1 >= -2', true);
    expectValue('=-2 >= -1', false);
    expectValue('=(1/0) >= (1/0)', true);
    expectValue('=(-1/0) >= (-1/0)', true);
    expectValue('=-999 >= (-1/0)', true);
    expectValue('=(1/0) >= (-1/0)', true);
    expectValue('=(-1/0) >= (1/0)', false);
    expectValue('=(1/0 - 1/0) >= (1/0 - 1/0)', false);
    expectValue('=(1/0 - 1/0) >= 0', false);
    expectValue('=(1/0 - 1/0) >= (-1/0)', false);
  });

  test('throws when operands are not numbers', () => {
    expectException('=1 >= "a"', Errors.TypeError);
    expectException('="a" >= 1', Errors.TypeError);
    expectException('=TRUE >= 0', Errors.TypeError);
    expectException('=1 >= FALSE', Errors.TypeError);
    expectException('=1 >= Z99', Errors.TypeError);
  });
});

describe('Less or equal operator', () => {
  test('compares numbers', () => {
    expectValue('=1 <= 1', true);
    expectValue('=+0 <= -0', true);
    expectValue('=1 <= 2', true);
    expectValue('=2 <= 1', false);
    expectValue('=-1 <= 2', true);
    expectValue('=2 <= -1', false);
    expectValue('=1 <= -2', false);
    expectValue('=-2 <= 1', true);
    expectValue('=-1 <= -2', false);
    expectValue('=-2 <= -1', true);
    expectValue('=(1/0) <= (1/0)', true);
    expectValue('=(-1/0) <= (-1/0)', true);
    expectValue('=(-1/0) <= -999', true);
    expectValue('=(-1/0) <= (1/0)', true);
    expectValue('=(1/0) <= (-1/0)', false);
    expectValue('=(1/0 - 1/0) <= (1/0 - 1/0)', false);
    expectValue('=(1/0 - 1/0) <= 0', false);
    expectValue('=(1/0 - 1/0) <= (-1/0)', false);
  });

  test('throws when operands are not numbers', () => {
    expectException('=1 <= "a"', Errors.TypeError);
    expectException('="a" <= 1', Errors.TypeError);
    expectException('=TRUE <= 0', Errors.TypeError);
    expectException('=1 <= FALSE', Errors.TypeError);
    expectException('=1 <= Z99', Errors.TypeError);
  });
});

describe('Operator precendence', () => {
  test('multiplication and division has precedence over addition and subtraction', () => {
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

  test('mathematical operators have precedence over comparison operators', () => {
    expectValue('= 2 * 3 + 4 = 5 + 5', true);
    expectValue('= 5 = 2 + 3', true);
    expectValue('= 10 / 2 = 5', true);
    expectValue('= 2 * 3 + 4 >= 5 + 5', true);
    expectValue('= 5 = 2 + 3', true);
    expectValue('= 5 * 2 = 10', true);

    expectValue('= 2 + 3 = 1 + 4', true);
    expectValue('= 2 - 3 = 3 - 4', true);
    expectValue('= 2 * 6 = 3 * 4', true);
    expectValue('= 6 / 2 = 9 / 3', true);

    expectValue('= 2 + 3 <> 1 + 4', false);
    expectValue('= 2 - 3 <> 3 - 4', false);
    expectValue('= 2 * 6 <> 3 * 4', false);
    expectValue('= 6 / 2 <> 9 / 3', false);

    expectValue('= 2 + 3 > 1 + 4', false);
    expectValue('= 2 - 3 > 3 - 4', false);
    expectValue('= 2 * 6 > 3 * 4', false);
    expectValue('= 6 / 2 > 9 / 3', false);

    expectValue('= 2 + 3 < 1 + 4', false);
    expectValue('= 2 - 3 < 3 - 4', false);
    expectValue('= 2 * 6 < 3 * 4', false);
    expectValue('= 6 / 2 < 9 / 3', false);

    expectValue('= 2 + 3 <= 1 + 4', true);
    expectValue('= 2 - 3 <= 3 - 4', true);
    expectValue('= 2 * 6 <= 3 * 4', true);
    expectValue('= 6 / 2 <= 9 / 3', true);

    expectValue('= 2 + 3 >= 1 + 4', true);
    expectValue('= 2 - 3 >= 3 - 4', true);
    expectValue('= 2 * 6 >= 3 * 4', true);
    expectValue('= 6 / 2 >= 9 / 3', true);
  });

  test('comparision operators have the same precedence', () => {
    // Because equality is transitive (P(a) = P(b) and P(b) = P(c) means that P(a) = P(c)),
    // we don't have to test the precedence of all combinations of operations
    // is the same, but just have to make sure, they are 'connected' to each
    // other through having the same precedence as another operation, which we
    // have already compared.

    // <> and >
    expectValue('= 1 > 2 <> FALSE', false);
    expectException('= FALSE <> 1 > 2', Errors.TypeError);

    // = and >
    expectValue('= 1 > 2 = TRUE', false);
    expectException('= TRUE = 1 > 2', Errors.TypeError);

    // = and <
    expectValue('= 2 < 1 = TRUE', false);
    expectException('= TRUE = 2 < 1', Errors.TypeError);

    // = and >=
    expectValue('= 1 >= 2 = TRUE', false);
    expectException('= TRUE = 1 >= 2', Errors.TypeError);

    // = and <=
    expectValue('= 2 <= 1 = TRUE', false);
    expectException('= TRUE = 2 <= 1', Errors.TypeError);

    // = and <=
    expectValue('= 2 <= 1 = TRUE', false);
    expectException('= TRUE = 2 <= 1', Errors.TypeError);
  });

  test('comparison operator chaining evaluates each operator individually from left to right', () => {
    expectValue('= 2 = 2 = 2', false);
    expectValue('= 2 = 2 = TRUE', true);
    expectValue('= 2 = 2 = 2 = FALSE', true);

    expectValue('= 2 <> 2 = TRUE', false);

    expectException('= 1 < 2 < 3', Errors.TypeError);
    expectValue('= 1 < 2 = TRUE', true);

    expectException('= 1 > 2 > 3', Errors.TypeError);
    expectValue('= 1 > 2 = FALSE', true);

    expectException('= 1 <= 2 <= 3', Errors.TypeError);
    expectException('= 1 <= 1 <= 1', Errors.TypeError);
    expectValue('= 1 <= 2 = TRUE', true);
    expectValue('= 1 <= 1 = TRUE', true);

    expectException('= 1 >= 2 >= 3', Errors.TypeError);
    expectException('= 1 >= 1 >= 1', Errors.TypeError);
    expectValue('= 1 >= 2 = FALSE', true);
    expectValue('= 1 >= 1 = TRUE', true);
  });
});