export class Expression { }

export class Value extends Expression {
    constructor(value) { super(); this.value = value; }
    toString() { return typeof(this.value) === "string" ? `"${this.value}"` : `${this.value}`; }
}

export class Reference extends Expression {
    constructor(col, row) { super(); this.col = col; this.row = row; }
    toString() { return `${this.col}${this.row}`; }
}

export class BinaryOp extends Expression {
    constructor(left, op, right) { super(); this.left = left; this.op = op; this.right = right; }
    toString() { return `(${this.left} ${this.op} ${this.right})`; }
}

export class UnaryOp extends Expression {
    constructor(op, value) { super(); this.op = op; this.value = value; }
    toString() { return `${this.op}${this.value}`; }
}

export class FunctionCall extends Expression {
    constructor(functionName, args) { super(); this.functionName = functionName; this.args = args; }
    toString() { return `${this.functionName}(${this.args.join(', ')})`; }
}

export class Range extends Expression {
    constructor(from, to) { super(); this.from = from; this.to = to; }
    toString() { return `${this.from}:${this.to}`; }
}