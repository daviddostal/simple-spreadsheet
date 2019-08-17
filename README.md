# SimpleSpreadsheet
A simple evaluator for spreadsheet-like formulas

## Example usage:

```javascript
const spreadsheet = new SimpleSpreadsheet.Spreadsheet({
            J1: '=SUM(A2:B3)', A3: '3', B3: '6',
            A1: 'column 1', B1: 'column 2', C1: 'sum',
            A2: '2', B2: '5', C2: '=SUM(A2:B2)', C3: '=SUM(3, 4)',
            C4: '=AVERAGE(2, 5)', C5: '=AVERAGE(A2:B2)',
            D3: '= A2 + B2',
            D4: '=Z87',
            D5: '= 1 / 0',
            D6: '=1 + D7',
            D7: '=SUM(A2:A342)(',
            D8: '=D6:F8',
            D9: '=D8',
            D10: '=A2:B2',
            D11: '=-3*2',
        });

        for (let cell in spreadsheet.cells) {
            console.log(`${cell}: '${spreadsheet.text(cell)}'`);
            try {
                console.log('    ' + spreadsheet.environment.getExpression(cell).toString());
                console.log(' -> ' + spreadsheet.value(cell));
            } catch (ex) {
                if (ex instanceof SimpleSpreadsheet.RuntimeError || ex instanceof SimpleSpreadsheet.ParsingError)
                    console.error(ex.toString());
                else throw ex;
            }
            console.log('');
        }
```
