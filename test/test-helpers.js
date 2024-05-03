import { Spreadsheet } from '../src/spreadsheet';
import { builtinFunctions } from '../src/functions';

export function expectValue(formula, expected) {
    const spreadsheet = new Spreadsheet({ cells: { A1: formula }, functions: builtinFunctions });
    const value = spreadsheet.getValue('A1');
    expect(value).toBe(expected);
    expect(spreadsheet.evaluateQuery(formula)).toBe(expected);
}

export function expectException(formula, exceptionType) {
    expect(exceptionType).toBeDefined();
    expect(() => new Spreadsheet({ cells: { A1: formula }, functions: builtinFunctions }).getValue('A1'))
        .toThrow(exceptionType);
}