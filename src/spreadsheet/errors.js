export class NotImplementedError extends Error {
    constructor(message) { super(message); }
    toString() { return `Not implemented: ${this.message}` }
}

export class SpreadsheetError extends Error { }

export class ParsingError extends SpreadsheetError {
    constructor(message) { super(message); }
    toString() { return `Syntax error: ${this.message}`; }
}

export class RuntimeError extends SpreadsheetError {
    constructor(message) { super(message); }
    toString() { return `Evaluation error: ${this.message}`; }
}

export class ReferencedCellError extends RuntimeError {
    constructor(cell) {
        super(`Error in referenced cell: ${cell}`);
        this.cell = cell;
    }
}

export class CircularReferenceError extends RuntimeError {
    constructor(cells) {
        super(`Circular reference detected: ${cells.join(' -> ')}`);
        this.cells = cells;
    }
}

export class FunctionEvaluationError extends RuntimeError {
    constructor(functionName, error) {
        super(`Error in function ${functionName}: ${error}`)
        this.functionName = functionName;
        this.error = error;
    }
}

export class RangeReferenceNotAllowedError extends RuntimeError {
    constructor() { super(`Range references are allowed only as references to functions`); }
}
