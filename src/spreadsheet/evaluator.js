import { Value, Reference, BinaryOp, FunctionCall, Range, UnaryOp } from './expressions';
import { RuntimeError, ParsingError, CircularReferenceError, ReferencedCellError, NotImplementedError, RangeReferenceNotAllowedError, FunctionEvaluationError } from './errors';
import * as Helpers from './helpers';

class CircularRefInternal extends Error {
    constructor(message, position) { super(message); this.position = position; }
}

export default class Evaluator {
    constructor() {
        this.visitedCellStack = [];
    }

    evaluateCellAt(position, expression, environment) {
        if (this.visitedCellStack.includes(position))
            throw new CircularRefInternal(`Circular reference detected (${this.visitedCellStack.join(' -> ')} -> ${position})`, position);

        this.visitedCellStack.push(position);
        try {
            const result = this._evaluateCell(expression, environment);
            this.visitedCellStack.pop();
            return result;
        } catch (ex) {
            this.visitedCellStack.pop()
            // Normal errors propagate as usual, but CircularRefInternal is used
            // only to propagate the exception to the originating cell internally
            // (so it doesn't get reported just as an error in a referenced cell).
            // Once the CircularRefInternal reaches back to the originating cell,
            // we turn it into a normal CircularReferenceError.
            if (ex instanceof CircularRefInternal && ex.position === position) {
                throw new CircularReferenceError([...this.visitedCellStack, position]);
            } else {
                throw ex;
            }
        }
    }

    evaluateQuery(expression, environment) {
        return this._evaluateCell(expression, environment);
    }

    _evaluateCell(expression, environment) {
        switch (expression.constructor) {
            case Value:
                return expression.value;
            case Reference:
                return this._evaluateReference(Helpers.makePosition(expression.col, expression.row), environment);
            case UnaryOp:
                return this._evaluateUnary(expression.op, expression.value, environment);
            case BinaryOp:
                return this._evaluateBinary(expression.left, expression.op, expression.right, environment);
            case FunctionCall:
                return this._evaluateFunction(expression.functionName, expression.args, environment);
            case Range:
                throw new RangeReferenceNotAllowedError();
            default:
                throw new NotImplementedError(`Unknown expression type: ${typeof expression}`);
        }
    }

    _evaluateReference(position, environment) {
        try {
            return environment.getValue(position);
        } catch (ex) {
            if (ex instanceof ParsingError || ex instanceof RuntimeError)
                throw new ReferencedCellError(position);
            else throw ex;
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
            default: throw new NotImplementedError(`Unknown unary operator: '${op}'`);
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
            default: throw new NotImplementedError(`Unknown binary operator: '${op}'`);
        }
    }

    _evaluateFunction(functionName, args, environment) {
        let func = environment.getFunction(functionName);
        func = func instanceof Function ? { isMacro: false, function: func } : func;
        return (func.isMacro === true) ?
            this._evaluateMacro(functionName, func, args, environment) :
            this._evaluateSpreadsheetFunction(functionName, func, args, environment);
    }

    _evaluateSpreadsheetFunction(functionName, func, args, environment) {
        const argumentValues = args.map(arg => this._evaluateExpression(arg, environment));
        try {
            return func.function(...argumentValues);
        } catch (ex) {
            throw new FunctionEvaluationError(functionName, ex);
        }
    }

    _evaluateMacro(macroName, macro, args, environment) {
        const argsLazyValues = args.map(arg => () => this._evaluateExpression(arg, environment));
        try {
            return macro.function(...argsLazyValues);
        } catch (ex) {
            throw new FunctionEvaluationError(macroName, ex);
        }
    }

    _evaluateRange(from, to, environment) {
        return Helpers.positionsInRange(from, to)
            .map(pos => Helpers.makePosition(pos.col, pos.row))
            .map(pos => this._evaluateReference(pos, environment));
    }
}
