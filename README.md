# SimpleSpreadsheet
A simple evaluator for spreadsheet-like formulas

## Example usage:

### Create new spreadsheet
```javascript
const SimpleSpreadsheet = require('simple-spreadsheet');

const spreadsheet = new SimpleSpreadsheet.Spreadsheet({
    A1: 'Product', B1: 'Quantity',
    A2: 'Yoghurt', B2: '14',
    A3: 'Tacos',   B3: '8',
    A4: 'Eggs',    B4: '=6 * 3',
    A5: '-----',   B5: '-----',
    A6: 'TOTAL',   B6: '=SUM(B2:B4)',
});
```

### Get text entered in cell
```javascript
const totalText = spreadsheet.text('B6');
// returns "=SUM(B2:B4)"
```

### Get calculated value of cell (evaluated formula)
```javascript
const totalCalculated = spreadsheet.value('B6');
// returns 40
```

### Iterate over spreadsheet cells
```javascript
for (let cell in spreadsheet.cells) {
    console.log(`Position: ${cell}`);
    console.log(`Text: ${spreadsheet.text(cell)}`);
    console.log(`Value: ${spreadsheet.value(cell)}`);
    console.log('');
}
```

### Query spreadsheet / evaluate formula without creating cell
```javascript
    spreadsheet.query('=AVERAGE(B2:B4)');
    spreadsheet.query('=AVERAGE(2, 3, 4+5)');
```

### Handle errors in entered formulas:
```javascript
const spreadsheet = new SimpleSpreadsheet.Spreadsheet({
    A1: '=SUM(', B1: '=SUM(1, "hello")',
});

try {
    const val = spreadsheet.value('A1'); // Syntax error (missing parenthesis)
    const val2 = spreadsheet.value('B1'); // Evaluation error (cannot sum string)
} catch(ex) {
    if(ex instanceof SimpleSpreadsheet.SpreadsheetError)
        console.error(ex); // handle error here
    else throw ex;
}
```
`SpreadsheetError` is the common ancestor of `ParsingError` and `RuntimeError`, you can catch the specific exceptions too, if you want to.

### Change value of existing cell
At the moment changing values of cells is not possible. You can only create a spreadsheet with the given cells and then get the evaluated values.

## Supported constructs in formulas:
**NOTE:**: In cells, strings don't have to be quoted - text is treated as a string by default and converted to a number if it is a number. To make the content of a cell evaluate as a formula, start the formula with `=` (as you are probably used to from excel).

For example `2 + 3` gives you the string `"2+3"`, but `=2+3` evaluates to the number `5`. `23.5` would evaluate to `23.5` as a number (you don't need the equal sign), to make entering numbers into cells easier.

### Primitives

#### Strings
`"hi there"`

`"escaping \"quotes\" is so much fun"`

#### Numbers
`42`

`5.245`

#### Arithmetic operators
All the usual stuff, nothing interesting here...

`1 + 2 - 3 * 4 / 5`

...Including unary operators.

`-+--3`

#### Parentheses

`1 + 2 * 3` (=> 7)

`(1 + 2) * 3` (=> 9)

#### Ranges

`A2:C5`

**NOTE:** Ranges are allowed only as arguments to functions.

#### Builtin functions

`SUM(A1:C4) - SUM(1, 2, 5.3, 2*4)`

`AVERAGE(2, 3, 4, 5)`

## Adding custom functions
Just pass an object with the function names as keys and the actual functions as values. Then you can use them in your spreadsheet formulas and everything just works like magic!

Strings and numbers from the spreadsheet are passed to you as normal js strings and numbers, ranges are passed as an array of values.

```javascript
const withCustomFunction = new SimpleSpreadsheet.Spreadsheet(
    { A1: '=CONCAT(" - ", "Bananas", "Apples", "Ninjas")'},
    { CONCAT: (separator, ...strings) => strings.join(separator) }
);
```

The value of the cell `A1` above would have the value `"Bananas - Apples - Ninjas"`, which uses your own custom CONCAT function.

You may want to improve your CONCAT function by for example validating the input types and throwing an error with a more meaningful error message. But this is standard JS stuff, which you probably already know :-)

### Keeping the builtin functions when adding your own

When you aren't adding any custom functions, the builtin functions are added by default.
Specifying your own functions overwrites the defaults, so they are no longer available.
But you can include the default functions, which are available from `SimpleSpreadsheet.builtinFunctions`.

```javascript
const withOriginalAndCustomFUnctions = new SimpleSpreadsheet.Spreadsheet(
    { A1: '=MAKE_SPARKLY("Unicorns")'},
    {
        // Include the builtin functions
        ...SimpleSpreadsheet.builtinFunctions,

        // Your own awesome functions
        MAKE_SPARKLY: (text) => `O*°.* ${text} *.°*O`
    }
);
```

### Spreadsheet without builtin functions
Just pass an empty object as the second argument when constructing the spreadsheet.

```javascript
const withoutFunctions = new SimpleSpreadsheet.Spreadsheet({ A1: '=1 + 2'}, {});
```
