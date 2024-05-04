import { Helpers } from '../src/spreadsheet';
const { colIndexToString, positionsInRange, stringToColIndex } = Helpers;

describe('Spreadsheet helpers', () => {
  test('colIndexToString', () => {
    expect(colIndexToString(0)).toBe('A');
    expect(colIndexToString(1)).toBe('B');
    expect(colIndexToString(25)).toBe('Z');
    expect(colIndexToString(26)).toBe('AA');
    expect(colIndexToString(27)).toBe('AB');
    expect(colIndexToString(701)).toBe('ZZ');
    expect(colIndexToString(16383)).toBe('XFD');
    expect(colIndexToString(stringToColIndex('ASDIFHOIUAZ'))).toBe('ASDIFHOIUAZ');
  });

  test('stringToColIndex', () => {
    expect(stringToColIndex('A')).toBe(0);
    expect(stringToColIndex('B')).toBe(1);
    expect(stringToColIndex('Z')).toBe(25);
    expect(stringToColIndex('AA')).toBe(26);
    expect(stringToColIndex('AB')).toBe(27);
    expect(stringToColIndex('ZZ')).toBe(701);
    expect(stringToColIndex('XFD')).toBe(16383);
    expect(stringToColIndex(colIndexToString(984091984065419))).toBe(984091984065419);
  });

  test('positionsInRange', () => {
    expect(
      positionsInRange('A1', 'C3')
    ).toStrictEqual([
      'A1', 'B1', 'C1',
      'A2', 'B2', 'C2',
      'A3', 'B3', 'C3',
    ]);

    expect(
      positionsInRange('Z1', 'AB3')
    ).toStrictEqual([
      'Z1', 'AA1', 'AB1',
      'Z2', 'AA2', 'AB2',
      'Z3', 'AA3', 'AB3',
    ]);
  })
})