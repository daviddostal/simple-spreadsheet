import { Value, Reference, BinaryOp, FunctionCall, Range, UnaryOp, CellReference } from './expressions';
import { RuntimeError, ParsingError } from './errors';
import * as Helpers from './helpers';

export default class Evaluator {
    constructor() {
        this.visitedCellStack = [];
    }

    evaluateCellAt(position, cell, environment) {
        if (this.visitedCellStack.includes(position))
            throw new RuntimeError(`Circular reference detected (${this.visitedCellStack.join(' -> ')} -> ${position})`);

        this.visitedCellStack.push(position);
        const result = this._evaluateCell(cell, environment);
        this.visitedCellStack.pop();
        return result;
    }

    evaluateQuery(cell, environment) {
        return this._evaluateCell(cell, environment);
    }

    _evaluateCell(cell, environment) {
        switch (cell.constructor) {
            case Value:
                return cell.value;
            case CellReference:
                return this._evaluateCellReference(cell.position, environment);
            case Reference:
                return this._evaluateReference(cell.name, environment);
            case UnaryOp:
                return this._evaluateUnary(cell.op, cell.value, environment);
            case BinaryOp:
                return this._evaluateBinary(cell.left, cell.op, cell.right, environment);
            case FunctionCall:
                return this._evaluateFunction(cell.functionValue, cell.args, environment);
            case Range:
                throw new RuntimeError(`Range references are allowed only as arguments of functions`);
            default:
                throw new RuntimeError(`Unknown expression type: ${typeof cell}`);
        }
    }

    _evaluateCellReference(position, environment) {
        try {
            return environment.getValue(position);
        } catch (e) {
            if (e instanceof ParsingError)
                throw new RuntimeError(`Error in referenced cell: ${position}`);
            else throw e;
        }
    }

    _evaluateReference(identifier, environment) {
        try {
            return environment.getFunction(identifier);
        } catch (e) {
            if (e instanceof ParsingError)
                throw new RuntimeError(`Error in referenced value: ${identifier}`);
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

    _evaluateFunction(functionValue, args, environment) {
        const func = this._evaluateCell(functionValue, environment);
        if (typeof func !== 'function')
            throw new RuntimeError(`'${functionValue}' is called like a function, but is not a function.`);
        const argumentValues = args.map(arg => this._evaluateExpression(arg, environment));
        try {
            return func(...argumentValues);
        } catch (ex) {
            throw new RuntimeError(`Error in function ${functionValue}: ${ex}`);
        }
    }

    _evaluateRange(from, to, environment) {
        return Helpers.positionsInRange(from.position, to.position)
            .map(pos => Helpers.makePosition(pos.col, pos.row))
            .map(pos => this._evaluateCellReference(pos, environment));
    }
}