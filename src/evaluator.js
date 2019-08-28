import { Value, Reference, BinaryOp, FunctionCall, Range, UnaryOp } from './expressions';
import { RuntimeError, ParsingError } from './errors';
import * as Helpers from './helpers';

export default class Evaluator {
    constructor() {
        this._currentCellStack = [];
    }

    evaluateCellAt(position, cell, environment) {
        // TODO: here we could check for cycles in cell references
        // if the stack already contains the position.

        this._currentCellStack.push({ position, references: new Set() });
        const result = this._evaluateCell(cell, environment);
        return result;
        return { result, references: this._currentCellStack.pop().references };
    }

    evaluateQuery(cell, environment) {
        return this._evaluateCell(cell, environment);
    }

    _evaluateCell(cell, environment) {
        switch (cell.constructor) {
            case Value:
                return cell.value;
            case Reference:
                return this._evaluateReference(Helpers.makePosition(cell.col, cell.row), environment);
            case UnaryOp:
                return this._evaluateUnary(cell.op, cell.value, environment);
            case BinaryOp:
                return this._evaluateBinary(cell.left, cell.op, cell.right, environment);
            case FunctionCall:
                return this._evaluateFunction(cell.functionName, cell.args, environment);
            case Range:
                throw new RuntimeError(`Range references are allowed only as arguments of functions`);
            default:
                throw new RuntimeError(`Unknown expression type: ${typeof cell}`);
        }
    }

    _evaluateReference(position, environment) {
        try {
            const value = environment.getValue(position);
            const currentCell = this._currentCellStack[this._currentCellStack.length - 1];
            if (currentCell)
                currentCell.references.add(position);
            return value;
        } catch (e) {
            if (e instanceof ParsingError)
                throw new RuntimeError(`Error in referenced cell: ${position}`);
            else throw e;
        }
    }

    _evaluateExpression(value, environment) {
        switch (value.constructor) {
            case Range: return this._evaluateRange(value.from, value.to, environment);
            default: return this._evaluateCell(value, environment);
        }
    }

    _evaluateUnary(op, expression, environment) {
        const value = this._evaluateCell(expression, environment);
        switch (op) {
            case '+': return value;
            case '-': return -value;
            default: throw new RuntimeError(`Unknown unary operator: '${op}'`);
        }
    }

    _evaluateBinary(left, op, right, environment) {
        const leftValue = this._evaluateCell(left, environment);
        const rightValue = this._evaluateCell(right, environment);
        switch (op) {
            case '+': return leftValue + rightValue;
            case '-': return leftValue - rightValue;
            case '*': return leftValue * rightValue;
            case '/': return leftValue / rightValue;
            default: throw new RuntimeError(`Unknown binary operator: '${op}'`);
        }
    }

    _evaluateFunction(functionName, args, environment) {
        const argumentValues = args.map(arg => this._evaluateExpression(arg, environment));
        const func = environment.getFunction(functionName);
        try {
            return func(...argumentValues);
        } catch (ex) {
            throw new RuntimeError(`Error in function ${functionName}: ${ex}`);
        }
    }

    _evaluateRange(from, to, environment) {
        return Helpers.positionsInRange(from, to)
            .map(pos => Helpers.makePosition(pos.col, pos.row))
            .map(pos => this._evaluateReference(pos, environment));

        const cells = Helpers.positionsInRange(from, to)
            .map(pos => new Reference(pos.col, pos.row));
        return cells.map(cell => this._evaluateCell(cell, environment));
    }
}
