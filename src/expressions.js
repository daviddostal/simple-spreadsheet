export class Expression { }

export class Value extends Expression {
    constructor(value) { super(); this.value = value; }
    toString() { return this.value.constructor === String ? `"${this.value}"` : `${this.value}`; }
}

export class CellReference extends Expression {
    constructor(position) { super(); this.position = position }
    toString() { return `${this.position}`; }
}

export class Reference extends Expression {
    constructor(name) { super(); this.name = name }
    toString() { return `${this.name}`; }
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
    constructor(functionValue, args) { super(); this.functionValue = functionValue; this.args = args; }
    toString() { return `${this.functionValue}(${this.args.join(', ')})`; }
}

export class Range extends Expression {
    constructor(from, to) { super(); this.from = from; this.to = to; }
    toString() { return `${this.from}:${this.to}`; }
}