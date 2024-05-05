import { Spreadsheet, Errors } from '../src/spreadsheet/index.js';
import { builtinFunctions } from '../src/functions/index.js';

const spreadsheet = new Spreadsheet({
  cells: {
    A1: 'Hello, world!',
    A2: '="Hello,\\nworld" + "!"',
    A3: 2.5,
    A4: '3',
    A5: '= A3 * A4 - 1.8',
    A6: '= -+--SUM(A3:A5)',
    A7: '=AVERAGE(2, 5)',
    A8: '=AVERAGE(A3:B5)',

    E1: '=SUM(A3:A5((',
    E2: '=1 + E1',
    E3: '=1 + E4',
    E4: '=E3 + 2',
    E5: '=D6:F8',

  },
  functions: builtinFunctions
});

[...spreadsheet.cells()].forEach(([position, text]) => {
  console.log(`${position}: '${spreadsheet.getText(position)}'`);
  try {
    console.log('-> ' + spreadsheet.getValue(position));
  } catch (ex) {
    if (ex instanceof Errors.SpreadsheetError)
      console.error(ex.toString());
    else throw ex;
  }
  console.log('');
});