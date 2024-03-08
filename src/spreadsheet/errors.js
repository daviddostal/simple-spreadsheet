export class NotImplementedError extends Error {
    shortName = '#IMPL!';
    constructor(message) { super(message); }
    toString() { return `Not implemented: ${this.message}` }
}

export class SpreadsheetError extends Error {
    shortName = '#ERR!';
    constructor(message) { super(message); }
    toString() { return `Spreadsheet error: ${this.message}`; }
}

export class ParsingError extends SpreadsheetError {
    shortName = '#SYNTAX!';
    constructor(message) { super(message); }
    toString() { return `Syntax error: ${this.message}`; }
}

export class RuntimeError extends SpreadsheetError {
    shortName = '#EVAL!';
    constructor(message) { super(message); }
    toString() { return `Evaluation error: ${this.message}`; }
}

export class ReferencedCellError extends RuntimeError {
    shortName = '#REF!';
    constructor(cell) {
        super(`Error in referenced cell: ${cell}`);
        this.cell = cell;
    }
}

export class CircularReferenceError extends RuntimeError {
    shortName = '#CIRCREF!';
    constructor(cells) {
        super(`Circular reference detected: ${cells.join(' -> ')}`);
        this.cells = cells;
    }
}

export class FunctionEvaluationError extends RuntimeError {
    shortName = '#FUNC!';
    constructor(functionName, error) {
        super(`Error in function ${functionName}: ${error}`)
        this.functionName = functionName;
        this.error = error;
    }
}

export class RangeReferenceNotAllowedError extends RuntimeError {
    shortName = '#RANGEREF!';
    constructor() {
        super(`Range references are allowed only as arguments to functions`);
    }
}

export class UnknownFunctionError extends RuntimeError {
    shortName = '#FNAME?';
    constructor(functionName) {
        super(`Unknown function: ${functionName}`);
        this.functionName = functionName;
    }
}