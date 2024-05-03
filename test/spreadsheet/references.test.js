import { Spreadsheet } from '../../src/spreadsheet';
import { ParsingError, CircularReferenceError, RangeReferenceNotAllowedError } from '../../src/spreadsheet/errors';
import { builtinFunctions } from '../../src/functions';
import { expectException } from '../test-helpers';

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

  test('cell references are case sensitive', () => {
    const spreadsheet = new Spreadsheet({ cells: { a1: 1, A2: 2 } });
    expect(spreadsheet.evaluateQuery('=a1')).toBe(1);
    expect(spreadsheet.evaluateQuery('=A1')).toBe(null);
    expect(spreadsheet.evaluateQuery('=A2')).toBe(2);
    expect(spreadsheet.evaluateQuery('=a2')).toBe(null);
  });

  test('columns can go further than Z', () => {
    const spreadsheet = new Spreadsheet({
      cells: { Y10: 1, Z10: 2, AA10: 3, AB10: 4, '[': 99 },
      functions: builtinFunctions
    });
    expect(spreadsheet.evaluateQuery('=AA10')).toBe(3);
    expect(spreadsheet.evaluateQuery('=SUM(Y10:AB10)')).toBe(10);
    expect(() => spreadsheet.evaluateQuery('=AŽ10')).toThrow(ParsingError);
  });

  test('cyclic references cause runtime exception', () => {
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
  test('range references work for any start and end position', () => {
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

  test('range references are allowed only as function arguments', () => {
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