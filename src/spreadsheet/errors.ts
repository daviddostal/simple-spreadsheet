export class NotImplementedError extends Error {
    shortName = '#IMPL!';

    constructor(message: string) {
        super(message);
    }

    override toString() {
        return `Not implemented: ${this.message}`
    }
}

export class SpreadsheetError extends Error {
    shortName = '#ERR!';

    constructor(message: string) {
        super(message);
    }

    override toString() {
        return `Spreadsheet error: ${this.message}`;
    }
}

export class ParsingError extends SpreadsheetError {
    override shortName = '#SYNTAX!';

    constructor(message: string) {
        super(message);
    }

    override toString() {
        return `Syntax error: ${this.message}`;
    }
}

export class RuntimeError extends SpreadsheetError {
    override shortName = '#EVAL!';

    constructor(message: string) {
        super(message);
    }

    override toString() {
        return `Evaluation error: ${this.message}`;
    }
}

export class ReferencedCellError extends RuntimeError {
    override shortName = '#REF!';

    cell: string;

    constructor(cell: string) {
        super(`Error in referenced cell: ${cell}`);
        this.cell = cell;
    }
}

export class CircularReferenceError extends RuntimeError {
    overrideshortName = '#CIRCREF!';

    cells: string[];

    constructor(cells: string[]) {
        super(`Circular reference detected: ${cells.join(' -> ')}`);
        this.cells = cells;
    }
}

export class FunctionEvaluationError extends RuntimeError {
    override shortName = '#FUNC!';

    functionName: string;
    error: unknown;

    constructor(functionName: string, error: unknown) {
        super(`Error in function ${functionName}: ${error}`)
        this.functionName = functionName;
        this.error = error;
    }
}

export class RangeReferenceNotAllowedError extends RuntimeError {
    override shortName = '#RANGEREF!';

    constructor() {
        super(`Range references are allowed only as arguments to functions`);
    }
}

export class UnknownFunctionError extends RuntimeError {
    override shortName = '#FNAME?';

    functionName: string;

    constructor(functionName: string) {
        super(`Unknown function: ${functionName}`);
        this.functionName = functionName;
    }
}

export class TypeError extends RuntimeError {
    override shortName = '#TYPE!';

    allowedTypes: string[];
    actualType: string;

    constructor(allowedTypes: string[], actualType: string) {
        super(`TypeError: expected ${allowedTypes.join(' or ')}, got ${actualType}`);
        this.allowedTypes = allowedTypes;
        this.actualType = actualType;
    }
}
