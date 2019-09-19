const SimpleSpreadsheet = require('../dist/simple-spreadsheet');

// SUM
test('SUM function returns sum of numbers', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet();
    expect(spreadsheet.query('=SUM(2, 3, -8)')).toBe(-3);
    expect(spreadsheet.query('=SUM(100, 2.8)')).toBe(102.8);
});

test('SUM function returns 0 for empty array', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({ A1: [] });
    expect(spreadsheet.query('=SUM()')).toBe(0);
    expect(spreadsheet.query('=SUM(A1)')).toBe(0);
});

test('SUM function ignores null values', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({ A1: null, A2: 1 });
    expect(spreadsheet.query('=SUM(2, A1, A2, A3)')).toBe(3);
});

test('SUM function accepts array or multiple arguments', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet(
        { A1: 2, A2: 3, A3: 4, A4: [1, 2, 3] });
    expect(spreadsheet.query('=SUM(A1, A2, A3)')).toBe(9);
    expect(spreadsheet.query('=SUM(A1:A3)')).toBe(9);
    expect(spreadsheet.query('=SUM(A4)')).toBe(6);
});

test('SUM function throws when arguments are not numbers', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({ A1: 'abc' });
    expect(() => spreadsheet.query('=SUM(2, "hello")')).toThrow(SimpleSpreadsheet.RuntimeError);
    expect(() => spreadsheet.query('=SUM(2, A1)')).toThrow(SimpleSpreadsheet.RuntimeError);
});

// AVERAGE
test('AVERAGE function returns average of numbers', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet();
    expect(spreadsheet.query('=AVERAGE(2, 3, -8)')).toBe(-1);
    expect(spreadsheet.query('=AVERAGE(100, 2.8)')).toBe(51.4);
});

test('AVERAGE function returns NaN for empty array', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({ A1: [] });
    expect(spreadsheet.query('=AVERAGE()')).toBe(NaN);
    expect(spreadsheet.query('=AVERAGE(A1)')).toBe(NaN);
});

test('AVERAGE function ignores null values', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({ A1: null, A2: 4 });
    expect(spreadsheet.query('=AVERAGE(2, A1, A2, A3)')).toBe(3);
});

test('AVERAGE function accepts array or multiple arguments', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet(
        { A1: 2, A2: 3, A3: 4, A4: [1, 2, 3] });
    expect(spreadsheet.query('=AVERAGE(A1, A2, A3)')).toBe(3);
    expect(spreadsheet.query('=AVERAGE(A1:A3)')).toBe(3);
    expect(spreadsheet.query('=AVERAGE(A4)')).toBe(2);
});

test('AVERAGE function throws when arguments are not numbers', () => {
    const spreadsheet = new SimpleSpreadsheet.Spreadsheet({ A1: 'abc' });
    expect(() => spreadsheet.query('=AVERAGE(2, "hello")')).toThrow(SimpleSpreadsheet.RuntimeError);
    expect(() => spreadsheet.query('=AVERAGE(2, A1)')).toThrow(SimpleSpreadsheet.RuntimeError);
});
