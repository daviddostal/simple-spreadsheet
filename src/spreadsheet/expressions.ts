import { CellValue } from './types';

export class Expression { }

export class Value extends Expression {
    readonly value: CellValue;

    constructor(value: CellValue) {
        super();
        this.value = value;
    }

    override toString() {
        return typeof (this.value) === 'string' ? `"${this.value}"` : `${this.value}`;
    }
}

export class Reference extends Expression {
    readonly position: string;

    constructor(position: string) {
        super();
        this.position = position;
    }

    override toString() {
        return this.position.toString()
    }
}

export class BinaryOp extends Expression {
    readonly left: Expression;
    readonly op: string;
    readonly right: Expression;

    constructor(left: Expression, op: string, right: Expression) {
        super();
        this.left = left;
        this.op = op;
        this.right = right;
    }

    override toString() {
        return `(${this.left} ${this.op} ${this.right})`;
    }
}

export class UnaryOp extends Expression {
    readonly op: string;
    readonly value: Expression;

    constructor(op: string, value: Expression) {
        super();
        this.op = op;
        this.value = value;
    }

    override toString() {
        return `${this.op}${this.value}`;
    }
}

export class FunctionCall extends Expression {
    readonly functionName: string;
    readonly args: Expression[];

    constructor(functionName: string, args: Expression[]) {
        super();
        this.functionName = functionName;
        this.args = args;
    }

    override toString() {
        return `${this.functionName}(${this.args.join(', ')})`;
    }
}

export class Range extends Expression {
    readonly from: Reference;
    readonly to: Reference;

    constructor(from: Reference, to: Reference) {
        super();
        this.from = from;
        this.to = to;
    }

    override toString() {
        return `${this.from}:${this.to}`;
    }
}