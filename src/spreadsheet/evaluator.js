import { Value, Reference, BinaryOp, FunctionCall, Range, UnaryOp } from './expressions.js';
import { RuntimeError, ParsingError, CircularReferenceError, ReferencedCellError, NotImplementedError, RangeReferenceNotAllowedError, FunctionEvaluationError, TypeError } from './errors.js';
import * as Helpers from './helpers.js';

class CircularRefInternal extends Error {
    constructor(position, circlePositions) { super(); this.position = position; this.circlePositions = circlePositions; }
}

export default class Evaluator {
    constructor() {
        this.visitedCellStack = [];
    }

    evaluateCellAt(position, expression, environment) {
        if (this.visitedCellStack.includes(position))
            throw new CircularRefInternal(position, [...this.visitedCellStack, position]);

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
                throw new CircularReferenceError(ex.circlePositions);
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
                return this._evaluateReference(expression.position, environment);
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
            case '+':
                if (typeof (value) === 'number') return +value;
                throw new TypeError(['number'], typeof (value));
            case '-':
                if (typeof (value) === 'number') return -value;
                throw new TypeError(['number'], typeof (value));
            default: throw new NotImplementedError(`Unknown unary operator: '${op}'`);
        }
    }

    _evaluateBinary(left, op, right, environment) {
        const leftValue = this._evaluateCell(left, environment);
        const rightValue = this._evaluateCell(right, environment);
        switch (op) {
            case '+': return this._evaluateAddition(leftValue, rightValue);
            case '-': return this._evaluateSubtraction(leftValue, rightValue);
            case '*': return this._evaluateMultiplication(leftValue, rightValue);
            case '/': return this._evaluateDivision(leftValue, rightValue);
            case '=': return this._evaluateEquals(leftValue, rightValue);
            case '<>': return this._evaluateNotEqual(leftValue, rightValue);
            case '>': return this._evaluateGreaterThan(leftValue, rightValue);
            case '<': return this._evaluateLessThan(leftValue, rightValue);
            case '>=': return this._evaluateGreaterOrEqual(leftValue, rightValue);
            case '<=': return this._evaluateLessOrEqual(leftValue, rightValue);
            default: throw new NotImplementedError(`Unknown binary operator: '${op}'`);
        }
    }

    _evaluateAddition(leftValue, rightValue) {
        if ((typeof (leftValue) === 'number' && typeof (rightValue) === 'number') ||
            (typeof (leftValue) === 'string') && typeof (rightValue) === 'string') {
            return leftValue + rightValue;
        }
        throw new TypeError(['number + number', 'string + string'], `${typeof (leftValue)} + ${typeof (rightValue)}`);
    }

    _evaluateSubtraction(leftValue, rightValue) {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue - rightValue;
        }
        throw new TypeError(['number - number'], `${typeof (leftValue)} - ${typeof (rightValue)}`);
    }

    _evaluateMultiplication(leftValue, rightValue) {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue * rightValue;
        }
        throw new TypeError(['number * number'], `${typeof (leftValue)} * ${typeof (rightValue)}`);
    }

    _evaluateDivision(leftValue, rightValue) {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue / rightValue;
        }
        throw new TypeError(['number / number'], `${typeof (leftValue)} / ${typeof (rightValue)}`);
    }

    _evaluateEquals(leftValue, rightValue) {
        if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
            if (!(Array.isArray(leftValue) && Array.isArray(rightValue)))
                return false;
            if (leftValue.length !== rightValue.length)
                return false;
            for (let i = 0; i < leftValue.length; i++) {
                if (leftValue[i] !== rightValue[i])
                    return false;
            }
            return true;
        }
        return leftValue === rightValue;
    }

    _evaluateNotEqual(leftValue, rightValue) {
        return !this._evaluateEquals(leftValue, rightValue);
    }

    _evaluateGreaterThan(leftValue, rightValue) {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue > rightValue;
        }
        throw new TypeError(['number > number'], `${typeof (leftValue)} > ${typeof (rightValue)}`);
    }

    _evaluateLessThan(leftValue, rightValue) {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue < rightValue;
        }
        throw new TypeError(['number < number'], `${typeof (leftValue)} < ${typeof (rightValue)}`);
    }

    _evaluateGreaterOrEqual(leftValue, rightValue) {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue >= rightValue;
        }
        throw new TypeError(['number >= number'], `${typeof (leftValue)} >= ${typeof (rightValue)}`);
    }

    _evaluateLessOrEqual(leftValue, rightValue) {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue <= rightValue;
        }
        throw new TypeError(['number <= number'], `${typeof (leftValue)} <= ${typeof (rightValue)}`);
    }

    _evaluateFunction(functionName, args, environment) {
        let func = environment.getFunction(functionName);
        func = func instanceof Function ? { isLazy: false, function: func } : func;
        return (func.isLazy === true) ?
            this._evaluateLazySpreadsheetFunction(functionName, func, args, environment) :
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

    _evaluateLazySpreadsheetFunction(functionName, func, args, environment) {
        const argsLazyValues = args.map(arg => () => this._evaluateExpression(arg, environment));
        try {
            return func.function(...argsLazyValues);
        } catch (ex) {
            // Error thrown while evaluating one of the lazy arguments
            if (ex instanceof RuntimeError || ex instanceof CircularRefInternal) throw ex;
            // Error thrown in the spreadsheet function
            else throw new FunctionEvaluationError(functionName, ex);
        }
    }

    _evaluateRange(from, to, environment) {
        return Helpers.positionsInRange(from.position, to.position)
            .map(pos => this._evaluateReference(pos, environment));
    }
}
