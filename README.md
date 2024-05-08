# SimpleSpreadsheet

A library for evaluating simple Excel-like spreadsheet functions.

The goal of this library isn't to be fully compatible with formulas from Excel or other spreadsheet editors (there already are solutions for that), but to strike a good balance
between familiar formula syntax and easy extensibility thanks to the
ability to add custom spreadsheet functions in the form of simple JavaScript functions.

***Please note:*** *This library is just a personal project and still evolving, so its API and features might change. I would not recommend using it in production for any important projects.*


# Table of contents

- [Installation](#installation)
- [Usage example](#usage-example)
- [Library API](#library-api)
- [Formula syntax](#formula-syntax)
- [Built-in spreadsheet functions](#built-in-spreadsheet-functions)

# Installation

Because this library just a personal project, it is only available from this GitHub repository at the moment. If you still want to use it, you can try installing it directly from GitHub:

```bash
npm install github:daviddostal/simple-spreadsheet#[commit-hash]
```

Replace `[commit-hash]` with the hash of the commit you want to install. This prevents the library from changing from install to install and unexpectedly breaking your code when a new version is released.

# Usage example

```js
import { Spreadsheet, Errors } from "simple-spreadsheet";
import { builtinFunctions } from "simple-spreadsheet/functions";

const initialCellValues = {
   A1: 2, A2: '=A1 * 2', A3: '=SUM(A1:A2)', A4: '=SAY_HELLO("Kitty")'
};

// Initialize a spreadsheet with initial cell values and available
// spreadsheet functions.
const spreadsheet = new Spreadsheet({
  cells: initialCellValues,
  functions: {
    ...builtinFunctions,
    SAY_HELLO: (name) => `Hello, ${name}!`
  }
});

// Add a callback to listen for changes in cell values.
spreadsheet.addListener('cellsChanged', onCellsChanged);

function onCellsChanged(changedPositions, { originatingCell }) {
  console.log(`Cell ${originatingCell} was edited.`);
  for(let position of changedPositions) {
    try {
      const newValue = spreadsheet.getValue(position);
      console.log(`Cell ${position} changed to ${newValue}.`);
    } catch(error) {
      if(error instanceof Errors.SpreadsheetError)
        console.error(`Error in cell ${position}: ${error.message}.`);
      else
        throw error;
    }
  }
}

// Get the text of a cell
spreadsheet.getText('A2'); // -> "=A1 * 2";

// Get the calculated value of a cell
spreadsheet.getValue('A2'); // -> 4
spreadsheet.getValue('A3'); // -> 6
spreadsheet.getValue('A4'); // -> "Hello, Kitty!"

// Evaluate queries against the spreadsheet
spreadsheet.evaluateQuery('=IF(A3 > 5, "large", "small")'); // -> "large"

// Edit the content of a cell
spreadsheet.setText('A1', '3');

// The cellsChanged listener gets triggered and prints the following:
// 
// Cell A1 was edited.
// Cell A1 changed to 3.
// Cell A2 changed to 6.
// Cell A3 changed to 9.
```

For a more comprehensive example of a very simple spreadsheet editor built on top of the library, you can check out the `example/` directory of this repository.

# Library API

## new Spreadsheet(options)
```
constructor Spreadsheet(
  options?: {
    cells?: Record<string, any> | Map<string, any>,
    functions?:
      Record<string, (...args: any[]) => any> |
      Map<string, (...args: any[]) => any>,
    onCellsChanged?: (cells: string[], { originatingCell: string }) => void
  }
): Spreadsheet
```

You can create a new spreadsheet instance by calling the `new Spreadsheet()` constructor, optionally providing an `options` object configure initial spreadsheet cells, spreadsheet functions available in formulas and a callback,
which gets called on cell change.

- `cells` is an optional JavaScript object or Map containing initial contents of cells.
- `functions` is an optional JavaScript object or Map containing functions, which can be called inside spreadsheet formulas. You can read more on authoring custom spreadsheet functions in the [Authoring spreadsheet functions](#authoring-spreadsheet-functions) section.
- `onCellsChanged` is an optional callback function, which is called when the value
  of one or more cells changes (due to a cell being edited).
  Alternatively, the `addListener()` method can also be used to listen for cell changes and provides more flexibility, such as the ability to add multiple listeners or remove registered listeners. To read more, visit the [Spreadsheet events](#spreadsheet-events) section.

Example usage:
```js
import { Spreadsheet } from "simple-spreadsheet";
import { builtinFunctions } from "simple-spreadsheet/functions";

const spreadsheet = new Spreadsheet({
   cells: { A1: 1, A2: '= 1 + 2', A3: '=SUM(A1:A2)', A4: '=SAY_HELLO("John")' },
   functions: {
    ...builtinFunctions,
    SAY_HELLO: (name) => `Hello, ${name}!`
  }
});
```

## Spreadsheet.getText(position)
`Spreadsheet.getText(position: string): any`

To get the underlying non-evaluated value of a spreadsheet cell, call `getText()`
on a spreadsheet instance.
If the given cell is empty or does not exist, the method returns an empty string.
If the spreadsheet was initialized with non-string cell contents, `getText()` returns these values (even if they aren't technically text).

Example usage:
```js
const spreadsheet = new Spreadsheet({ cells: { A1: 'hello' A2: '= 1 + 2' } });
spreadsheet.getText('A1'); // -> "hello"
spreadsheet.getText('A2'); // -> "= 1 + 2"
```

## Spreadsheet.getValue(position)
`Spreadsheet.getValue(position: string): any`

The `getValue()` method on a spreadsheet instance returns the calculated value
of a cell. If the cell contains a formula (starting with `=`), this is the result of evaluating the formula. If the cell doesn't contain a formula , the result
is the same as when calling `getText()`.

Example usage:
```js
const spreadsheet = new Spreadsheet({ cells: { A1: 'hello' A2: '= 1 + 2' } });
spreadsheet.getValue('A1'); // -> "hello"
spreadsheet.getValue('A2'); // -> 3
```

When the cell contains a syntax error or evaluation error, `getValue()` throws
an error, which is a subclass of `SpreadsheetError`.
You can read more in the [Error handling](#error-handling) section.

## Spreadsheet.evaluateQuery(query)
`Spreadsheet.evaluateQuery(query: string): any`

The `evaluateQuery()` method allows to evaluate spreadsheet formulas without attaching them to a specific cell. The formulas can still reference cells
from the spreadsheet instance.

Example usage:
```js
const spreadsheet = new Spreadsheet({ 
  cells: { A1: '=1 + 2', A2: 3, A3: 5 },
  functions: builtinFunctions
});

spreadsheet.evaluateQuery('=SUM(A1:A3)'); // -> 11
spreadsheet.evaluateQuery('=1 + 1'); // -> 2
```

When the formula contains a syntax error or evaluation error, `evaluateQuery()` throws an error, which is a subclass of `SpreadsheetError`.
You can read more in the [Error handling](#error-handling) section.

## Spreadsheet.cells()
`Spreadsheet.cells(): IterableIterator<[string, any]>`

The `Spreadsheet.cells()` method returns an iterator, which allows iterating through all non-empty cells in the spreadsheet.

Example usage:
```js
const spreadsheet = new Spreadsheet({ cells: { A1: 1, A2: 3, }});

for(let [cell, text] of spreadsheet.cells()) {
  console.log({ cell, text, value: spreadsheet.getValue(cell) });
}
```

## Spreadsheet.addListener(type, listener)
`Spreadsheet.addListener(type: string, listener: (...args: any[]) => void): void`

Adds an event listener callback, which listens for a specific event type.
When the given event is triggered, listeners for the event type get called
in the order they were added. It is possible to add the same listener multiple times, although this is not recommended.

At the moment, the only supported event `type` is `"cellsChanged"`. See the [Spreadsheet events](#spreadsheet-events) section for more information.
An alternative way to listen for the `cellsChanged` event is specifying the
`onCellsChanged` option in the [`new Spreadsheet()`](#new-spreadsheetoptions) constructor options.

Example usage:
```js
const spreadsheet = new Spreadsheet({ cells: { A1: 1, A2: '=A1 * 2' }});
spreadsheet.addListener('cellsChanged', handleCellsChanged);

function handleCellsChanged(changedCells, { originatingCell }) {
  // React to cell change (update UI, etc.)
}
```

## Spreadsheet.removeListener(type, listener)
`Spreadsheet.removeListener(type: string, listener: (...args: any[]) => void): void`

Stops the given event listener added with `addListener()` from being called when the given event type occurs.
When the same listener is registered multiple times for the same event type,
the listener which was last added is removed first.

Example usage:
```js
const spreadsheet = new Spreadsheet();
spreadsheet.addListener('cellsChanged', handleCellsChanged);

function handleCellsChanged(changedCells, { originatingCell }) {
  // React to cell change (update UI, etc.)
}

// Once we no longer want to listen for cell changes:
spreadsheet.removeListener('cellsChanged', handleCellsChanged);
```

## Spreadsheet events

### cellsChanged(changedCells, { originatingCell })

`event cellsChanged(listener: (changedCells: string[], { originatingCell: string }) => void)`

This event is triggered, when the value of one or more cells changed due to a cell
being edited. When one cell is edited, this can also cause values of other cells
to change, if they directly or indirectly reference the edited cell.

Example usage:
```js
const spreadsheet = new Spreadsheet({ cells: { A1: 1, A2: '=A1 * 2' }});
spreadsheet.addListener('cellsChanged', handleCellsChanged);

function handleCellsChanged(changedCells, { originatingCell }) {
    console.log(`Cell ${originatingCell} was edited.`);

    for(let cell of changedCells) {
      const newValue = spreadsheet.getValue(cell);
      console.log(`Value of cell ${cell} changed to ${newValue}`);
    }
}
```

## Error handling

When evaluating formulas, such as when using the `Spreadsheet.getValue()` or
`Spreadsheet.evaluateQuery()` methods, an error can be thrown, signalling
that there was a syntax or evaluation error in the given cell. All errors
are subclasses of the `SpreadsheetError` class and have the following hierarchy:

- **`SpreadsheetError`**: A superclass for all spreadsheet formula errors.
  - **`ParsingError`**: The formula contains a syntax error.
  - **`RuntimeError`**: A general error which occurred while evaluating a formula.
    - **`ReferencedCellError`**: The cell couldn't be evaluated, because it references another cell, which has an error.
    - **`CircularReferenceError`**: There is a circular reference between cells, such as `A1 -> A2 -> A3 -> A1`
    - **`FunctionEvaluationError`**: A called spreadsheet function threw an error.
    - **`UnknownFunctionError`**: The formula called a spreadsheet function, which does not exist.
    - **`RangeReferenceNotAllowedError`**: The formula contains a range reference (such as `A1:B3`), which is outside of a function call (ranges are currently permitted only as function arguments).
    - **`TypeError`**: An operator in the formula was used with the wrong types of operands (such as dividing a boolean by a string).

All SpreadsheetErrors have a `.message` property with a message describing
why the error occurred and a `.shortName` property, which contains a short
identifier of the error for displaying in spreadsheet cells, for example `"#SYNTAX!"`, `"#REF!"` etc.

Below is an example, on how error handling can be implemented for the `Spreadsheet.getValue()`
method:

```js
import { Spreadsheet, Errors } from "simple-spreadsheet";

const spreadsheet = new Spreadsheet({ cells: { A1: '= 1 +', A2: '=A1 * 2' } });

try {
  const value = spreadsheet.getValue('A2');
} catch(error) {
  if(error instanceof Errors.SpreadsheetError)
    console.error(error.shortName, error.message);
  else throw error;
}
```

## Authoring spreadsheet functions

As a user of the library, you can customize, which functions are available to be
used in spreadsheet formulas. The library provides a few basic built-in functions,
but you can also create your own functions in the form of normal JavaScript functions. Just pass them as an object when initializing the Spreadsheet:

```js
const spreadsheet = new Spreadsheet({
  functions: {
    // optional, remove if you don't want to include the built-in functions
    ...builtinFunctions,
    SAY_HELLO: (name, greeting = "Hello") => {
      if(typeof(name) !== "string" || typeof(greeting) !== "string")
        throw new Error(`'name' and 'greeting' must be strings`);

      return `${greeting}, ${name}`;
    }
  }
});
```
Your JavaScript function gets called with evaluated values of any arguments, which were passed to the function in the formula.

Spreadsheet functions must do their own error handling and type checking and
throw an Error when appropriate. The only restriction is ***you may not throw
errors, which are instances of `SpreadsheetError` or any of its subclasses***.

### Lazily evaluating spreadsheet function arguments

Some spreadsheet functions require, that not all of their arguments are evaluated
before the function is called. For example, the `IF(condition, ifTrue, ifFalse)`
function needs to evaluate only one of the `ifTrue` and `ifFalse` branches, or
the `OR` and `AND` functions do short-circuiting and don't evaluate additional
arguments once the result is clear. To delay evaluation of spreadsheet function
arguments, you can pass an object containing the `isLazy: true` option instead
of just the spreadsheet function, for example:

```js
const spreadsheet = new Spreadsheet({
  functions: {
    // optional, remove if you don't want to include the built-in functions
    ...builtinFunctions,
    IF: {
      isLazy: true,
      function: (condition, ifTrue, ifFalse) => {
        // NOTE: error handling skipped for brevity
        if (condition())
          return ifTrue();
        else
          return ifFalse();
      }
    }
  }
});
```

When `isLazy` is set to `true`, the spreadsheet function's arguments aren't
evaluated values, but functions, which can be called to evaluate the argument
and get its value. If an argument function doesn't get called, its value won't
be evaluated.


# Formula syntax

For a cell to be evaluated as a formula, it must start with a `=`. 

For example, if a cell has the text `= 1 + 2`, it will be evaluated as a formula and result in the value `3`, but without the equal sign at the beginning, `1 + 2` would just result in the literal string `"1 + 2"`.

You can also group expressions in formulas using parentheses, which work as you may expect from mathematics or other programming languages.

## Quick overview

- **Data type literals**:
  - **strings**: `"i am a string"`, `"i can contain some \" \\ \n escaped characters"`
  - **numbers**: for example `1.25`, `94`, etc.
  - **booleans**: `TRUE` or `FALSE` (both uppercase)
- **Mathematical operators**:
  - **unary `-`** (negates a number) and **`+`** (does nothing)
  - **`+`**, **`-`**, **`*`**, **`/`**: work as you'd expect, including operator precedence; `+` can also concatenate two strings
  - **parentheses** `(` and `)` can also be used
- **Equality operators**:
  - **`=`**: checks for equality
  - **`<>`**: checks if both sides are *not* equal
- **Comparison operators**:
  - `>`, `<`, `>=`, `<=`
- **Built-in spreadsheet functions**:
  - `STRING()`, `NUMBER()`, `BOOLEAN()`: convert the argument to the given type (for example strings to numbers)
  - `SUM()`, `AVERAGE()`
  - `IF(condition, ifTrue, ifFalse)`
  - `AND()`, `OR()`
- **Cell references**: reference other cells by their name, such as `A1`, `C5`, etc.
- **Range references**: for example `A2:C4` or `D12:AB5`; selects all cells between two cells; can only be used inside functions

**Examples of formulas**:
- `= -(1 + 2) * -3.5`
- `= A2 * A3`
- `= AVERAGE(A5:C8)`
- `= IF(A1 = 0, "zero", "nonzero")`
- `= OR(3 - 2 >= 4, "a" <> FALSE)`
- `= IF(SUM(A1:A7) >= 10, "high", "low")`

## Literals

### Strings

String literals are enclosed in double quotes, like so: `"Hello, I am a string!"`.
The following escape sequences are supported inside strings: `\"` for quotes, `\\` for backslashes and `\n` for newlines.

### Numbers

Number literals can either be integers, for example `12` or contain a decimal part, for example `12.34`.

### Booleans

Booleans can either be `TRUE` or `FALSE`. The boolean literals must be uppercase.

## Supported operators

### Mathematical operators

**Unary + and -** (`+number` and `-number`)

 Unary `-` negates the number, unary `+` does nothing. Both operands must be numbers.

**Addition** (`number + number` or `string + string`)

Adds two numbers or concatenates two strings.

**Subtraction** (`number - number`)

Subtracts two numbers.

**Multiplication** (`number * number`)

Multiplies two numbers.

**Division** (`number / number`)

Divides two numbers.

### Equality operators

**Equals** (`any = any`)

Returns `TRUE`, if both sides are equal, `FALSE` otherwise. Equality is determined in the following ways:
- If both sides have a different type, the result is `FALSE`.
- If both sides are strings, the result is `TRUE` if both sides have exactly the same length and contents.
- If both sides are numbers, return true if both of them are the same value. `NaN` is not equal to `NaN`, but `Infinity` is equal to `Infinity` and `-Infinity` is equal to `-Infinity.`.
- If both sides are ranges, the result is only `TRUE` if both have the same length and every item in one range equals the item at the same position in the other range.

**Not equal** (`any <> any`)

The oposite of the `=` operator. Where `=` would have returned `TRUE`, `<>` returns `FALSE` and vice versa.

### Comparison operators

**Greater than** (`number > number`)

Returns `TRUE`, if the number on the left is greater than the number on the right. `NaN` and `Infinity` are handled in the same way as in JavaScript.

**Less than** (`number < number`)

Returns `TRUE`, if the number on the left is less than the number on the right. `NaN` and `Infinity` are handled in the same way as in JavaScript.

**Greater or equal** (`number >= number`)

Returns `TRUE`, if the number on the left is equal to or greater than the number on the right. `NaN` and `Infinity` are handled in the same way as in JavaScript.

**Less or equal** (`number <= number`)

Returns `TRUE`, if the number on the left is equal to or less than the number on the right. `NaN` and `Infinity` are handled in the same way as in JavaScript.

### Operator precedence

As probably expected, `*` and `/` have precedence over `+` and `-`.
All mathematical operators have higher precedence than equality and comparison operators (equality and comparison operators have the same precedence among themselves).

To get around operator precedence and explicitly specify the grouping of operations in formulas, you can also surround any expression with parentheses, for example:
`=(1 + 2) * -(4 + 5)`.

## Cell references

### Simple references

Formulas can reference values of other cells by their position. Cell positions must have one or more characters between `A-Z` followed by an integer. Valid cell positions are for example `A1`, `B10` or `ABC123`, but not `1A`, `FOO` or `A_2`, etc.

### Range references

Range references allow selecting values from a range of multiple cells. For example, the range `A2:C4` references values of the following cells: `A2`, `A3`, `A4`, `B2`, `B3`, `B4`, `C2`, `C3`, `C4`. The order of cells is from left to right and the rows go from top to bottom.

Range references can only be used as arguments to spreadsheet functions and may not appear in formulas outside of functions.

## Spreadsheet functions

Besides literals and operators, spreadsheet formulas can also contain spreadsheet functions, which can either be the built-in functions provided by the library or custom spreadsheet functions provided by the library user.

Spreadsheet functions are called with `()` and optionally contain comma separated arguments, for example `SUM(A2:A4)` or `IF(1 > 2, "foo", "bar")`. Function names are case-sensitive and although function names can technically be lowercase or be the same as cell positions, it is not recommended to do so and all built-in spreadsheet functions use uppercase.


# Built-in spreadsheet functions

## Aggregation functions

### SUM
`SUM(...values: (number | number[])[]): number`

Returns the sum of the given values, ignoring empty cells. Arguments can be either numbers or ranges of numbers.

### AVERAGE
`AVERAGE(...values: (number | number[])[]): number`

Returns the average of the given values, ignoring empty cells. Arguments can be either numbers or ranges of numbers.

## Conditionals and logical operators
### IF
`IF(condition: boolean; ifTrue: any; ifFalse: any): any`

If the `condition` is true, returns the value of the `if_true` branch, if it is false, returns the value of the `if_false` branch.
Only one of the two branches is evaluated, depending on the condition.

### OR
`OR(value1: boolean, ...values: boolean[]): boolean`

Returns `TRUE` if any of its operands evaluates to `TRUE`. Supports short-circuiting.

### AND
`AND(value1: boolean, ...values: boolean[]], ...): boolean`

Returns `TRUE` if all of its operands evaluate to `TRUE`. Supports short-circuiting.

### NOT
`NOT(value: boolean): boolean`

Negates the argument (if given an expression that evaluates to `TRUE`, it returns `FALSE` and vice versa).

## Type conversion functions
To prevent unexpected behavior due to type coercion, the supported operators and built-in spreadsheet functions do some type checking to make sure all operands or arguments have the correct type and if not, an error is reported for the cell. If you want to convert from one type to another, you can use the following built-in spreadsheet functions:

### STRING
`STRING(value: number | boolean | string): string`

Converts `value` to a string. If `value` is a number, it gets converted using JavaScript's `toString()`. If `value` is a boolean,`TRUE` gets converted to `"TRUE"` and `FALSE` to `"FALSE"`.

### NUMBER
`NUMBER(value: string | boolean | number): number`

Converts `value` to a number. If `value` is a string, it parses the string into a number. If `value` it is a boolean, it returns `1` for `TRUE` and `0` for `FALSE`.

### BOOLEAN
`BOOLEAN(value: number | string | boolean): boolean`

Converts `value` to a boolean. If `value` is a number, returns `FALSE` for `0` and `NaN` and `TRUE` for all other numbers. If `value` it is a string, it returns `FALSE` for an empty string (`""`) and `TRUE` for all other strings.