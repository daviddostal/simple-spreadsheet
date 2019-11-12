export class SpreadsheetError extends Error { }

export class ParsingError extends SpreadsheetError {
    constructor(message) { super(message); }
    toString() { return `Syntax error: ${this.message}`; }
}

export class RuntimeError extends SpreadsheetError {
    constructor(message) { super(message); }
    toString() { return `Evaluation error: ${this.message}`; }
}
