import { RuntimeError } from './environment';
import { Value, Reference, BinaryOp, FunctionCall, Range } from './expressions';

export default class Evaluator {
    evaluateCell(cell, environment) {
        switch (cell.constructor) {
            case Value:
                return cell.value;
            case Reference:
                const entry = environment.getEntry(cell.col, cell.row) || new Value(null);
                return this.evaluateCell(entry, environment);
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

    evaluateExpression(value, environment) {
        switch (value.constructor) {
            case Range: return this.evaluateRange(value.from, value.to, environment);
            default: return this.evaluateCell(value, environment);
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
            default: throw new RuntimeError(`Unknown binary operator: ${op.type}`);
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
        if (from.col === to.col)
            return this._range(from.row, to.row)
                .map(row => new Reference(from.col, row));
        else if (from.row === to.row)
            return this._range(from.col.charCodeAt(0), to.col.charCodeAt(0))
                .map(col => new Reference(String.fromCharCode(col), from.row));
        else
            throw new RuntimeError(`Range must be in same row or column. From: ${from}, To: ${to}`);
    }

    _range(from, to) {
        return from <= to
            ? Array.from({ length: to - from + 1 }, (_, i) => i + from)
            : Array.from({ length: from - to + 1 }, (_, i) => from - i);
    }
}
