import { RuntimeError } from './environment';
import { Value, Reference, BinaryOp, FunctionCall, Range, UnaryOp } from './expressions';
import { ParsingError } from './tokenizer';

export default class Evaluator {
    evaluateCell(cell, environment) {
        switch (cell.constructor) {
            case Value:
                return cell.value;
            case Reference:
                return this.evaluateReference(cell.position, environment);
            case UnaryOp:
                return this.evaluateUnary(cell.op, cell.value, environment);
            case BinaryOp:
                return this.evaluateBinary(cell.left, cell.op, cell.right, environment);
            case FunctionCall:
                return this.evaluateFunction(cell.functionName, cell.args, environment);
            case Range:
                throw new RuntimeError(`Range references are allowed only as arguments of functions`);
            default:
                throw new RuntimeError(`Unknown expression type: ${typeof cell}`);
        }
    }

    evaluateReference(position, environment) {
        try {
            const entry = environment.getExpression(position) || new Value(null);
            return this.evaluateCell(entry, environment);
        } catch (e) {
            if (e instanceof ParsingError)
                throw new RuntimeError(`Error in referenced cell: ${position}`);
            else throw e;
        }
    }

    evaluateExpression(value, environment) {
        switch (value.constructor) {
            case Range: return this.evaluateRange(value.from, value.to, environment);
            default: return this.evaluateCell(value, environment);
        }
    }

    evaluateUnary(op, expression, environment) {
        const value = this.evaluateCell(expression, environment);
        switch (op) {
            case '+': return value;
            case '-': return -value;
            default: throw new RuntimeError(`Unknown unary operator: '${op}'`);
        }
    }

    evaluateBinary(left, op, right, environment) {
        const leftValue = this.evaluateCell(left, environment);
        const rightValue = this.evaluateCell(right, environment);
        switch (op) {
            case '+': return leftValue + rightValue;
            case '-': return leftValue - rightValue;
            case '*': return leftValue * rightValue;
            case '/': return leftValue / rightValue;
            default: throw new RuntimeError(`Unknown binary operator: '${op}'`);
        }
    }

    evaluateFunction(functionName, args, environment) {
        const argumentValues = args.map(arg => this.evaluateExpression(arg, environment));
        const func = environment.getFunction(functionName);
        try {
            return func(...argumentValues);
        } catch (ex) {
            throw new RuntimeError(`Error in function ${functionName}: ${ex}`);
        }
    }

    evaluateRange(from, to, environment) {
        const cells = this._cellsInRange(from, to);
        const cellValues = cells.map(cell => this.evaluateCell(cell, environment));
        return cellValues;
    }

    _cellsInRange(from, to) {
        const cells = [];
        for (let col of this._range(from.col.charCodeAt(0), to.col.charCodeAt(0)))
            for (let row of this._range(from.row, to.row))
                cells.push(new Reference(String.fromCharCode(col), row));
        return cells;
    }

    _range(from, to) {
        return from <= to
            ? Array.from({ length: to - from + 1 }, (_, i) => i + from)
            : Array.from({ length: from - to + 1 }, (_, i) => from - i);
    }
}
