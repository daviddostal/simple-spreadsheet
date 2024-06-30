import { Value, Reference, BinaryOp, FunctionCall, Range, UnaryOp, Expression } from './expressions';
import {
    RuntimeError, ParsingError, CircularReferenceError, ReferencedCellError, NotImplementedError,
    RangeReferenceNotAllowedError, FunctionEvaluationError, TypeError
} from './errors';
import { positionsInRange } from './helpers';
import { Environment } from './environment';
import { BasicSpreadsheetFunction, CellPosition, CellValue, LazySpreadsheetFunction } from './types';

class CircularRefInternal extends Error {
    position: CellPosition;
    circlePositions: CellPosition[];

    constructor(position: CellPosition, circlePositions: CellPosition[]) {
        super();
        this.position = position;
        this.circlePositions = circlePositions;
    }
}

export default class Evaluator {
    private _visitedCellStack: string[];

    constructor() {
        this._visitedCellStack = [];
    }

    evaluateCellAt(position: string, expression: Expression, environment: Environment): CellValue {
        if (this._visitedCellStack.includes(position))
            throw new CircularRefInternal(position, [...this._visitedCellStack, position]);

        this._visitedCellStack.push(position);
        try {
            const result = this._evaluateCell(expression, environment);
            this._visitedCellStack.pop();
            return result;
        } catch (ex) {
            this._visitedCellStack.pop()
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

    evaluateQuery(expression: Expression, environment: Environment): CellValue {
        return this._evaluateCell(expression, environment);
    }

    private _evaluateCell(expression: Expression, environment: Environment): CellValue {
        if (expression instanceof Value)
            return expression.value;
        else if (expression instanceof Reference)
            return this._evaluateReference(expression.position, environment);
        else if (expression instanceof UnaryOp)
            return this._evaluateUnary(expression.op, expression.value, environment);
        else if (expression instanceof BinaryOp)
            return this._evaluateBinary(expression.left, expression.op, expression.right, environment);
        else if (expression instanceof FunctionCall)
            return this._evaluateFunction(expression.functionName, expression.args, environment);
        else if (expression instanceof Range)
            throw new RangeReferenceNotAllowedError();
        else
            throw new NotImplementedError(`Unknown expression type: ${typeof expression}`);
    }

    private _evaluateReference(position: CellPosition, environment: Environment): CellValue {
        try {
            return environment.getValue(position);
        } catch (ex) {
            if (ex instanceof ParsingError || ex instanceof RuntimeError)
                throw new ReferencedCellError(position);
            else throw ex;
        }
    }

    private _evaluateExpression(value: Expression, environment: Environment): CellValue {
        if (value instanceof Range)
            return this._evaluateRange(value.from, value.to, environment);
        else
            return this._evaluateCell(value, environment);
    }

    private _evaluateUnary(op: string, expression: Expression, environment: Environment): CellValue {
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

    private _evaluateBinary(left: Expression, op: string, right: Expression, environment: Environment): CellValue {
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

    private _evaluateAddition(leftValue: CellValue, rightValue: CellValue): CellValue {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number')
            return leftValue + rightValue;
        if (typeof (leftValue) === 'string' && typeof (rightValue) === 'string')
            return leftValue + rightValue;
        throw new TypeError(['number + number', 'string + string'], `${typeof (leftValue)} + ${typeof (rightValue)}`);
    }

    private _evaluateSubtraction(leftValue: CellValue, rightValue: CellValue): CellValue {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue - rightValue;
        }
        throw new TypeError(['number - number'], `${typeof (leftValue)} - ${typeof (rightValue)}`);
    }

    private _evaluateMultiplication(leftValue: CellValue, rightValue: CellValue): CellValue {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue * rightValue;
        }
        throw new TypeError(['number * number'], `${typeof (leftValue)} * ${typeof (rightValue)}`);
    }

    private _evaluateDivision(leftValue: CellValue, rightValue: CellValue): CellValue {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue / rightValue;
        }
        throw new TypeError(['number / number'], `${typeof (leftValue)} / ${typeof (rightValue)}`);
    }

    private _evaluateEquals(leftValue: CellValue, rightValue: CellValue): CellValue {
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

    private _evaluateNotEqual(leftValue: CellValue, rightValue: CellValue): CellValue {
        return !this._evaluateEquals(leftValue, rightValue);
    }

    private _evaluateGreaterThan(leftValue: CellValue, rightValue: CellValue): CellValue {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue > rightValue;
        }
        throw new TypeError(['number > number'], `${typeof (leftValue)} > ${typeof (rightValue)}`);
    }

    private _evaluateLessThan(leftValue: CellValue, rightValue: CellValue): CellValue {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue < rightValue;
        }
        throw new TypeError(['number < number'], `${typeof (leftValue)} < ${typeof (rightValue)}`);
    }

    private _evaluateGreaterOrEqual(leftValue: CellValue, rightValue: CellValue): CellValue {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue >= rightValue;
        }
        throw new TypeError(['number >= number'], `${typeof (leftValue)} >= ${typeof (rightValue)}`);
    }

    private _evaluateLessOrEqual(leftValue: CellValue, rightValue: CellValue): CellValue {
        if (typeof (leftValue) === 'number' && typeof (rightValue) === 'number') {
            return leftValue <= rightValue;
        }
        throw new TypeError(['number <= number'], `${typeof (leftValue)} <= ${typeof (rightValue)}`);
    }

    private _evaluateFunction(functionName: string, args: Expression[], environment: Environment): CellValue {
        const func = environment.getFunction(functionName);

        if (!func.isLazy) {
            return this._evaluateSpreadsheetFunction(functionName, func.function, args, environment);
        } else {
            return this._evaluateLazySpreadsheetFunction(functionName, func.function, args, environment);
        }
    }

    private _evaluateSpreadsheetFunction(
        functionName: string, func: BasicSpreadsheetFunction, args: Expression[],
        environment: Environment
    ): CellValue {
        const argumentValues = args.map(arg => this._evaluateExpression(arg, environment));
        try {
            return func(...argumentValues);
        } catch (ex) {
            throw new FunctionEvaluationError(functionName, ex);
        }
    }

    private _evaluateLazySpreadsheetFunction(
        functionName: string, func: LazySpreadsheetFunction, args: Expression[],
        environment: Environment
    ): CellValue {
        const argsLazyValues = args.map(arg => () => this._evaluateExpression(arg, environment));
        try {
            return func(...argsLazyValues);
        } catch (ex) {
            // Error thrown while evaluating one of the lazy arguments
            if (ex instanceof RuntimeError || ex instanceof CircularRefInternal) throw ex;
            // Error thrown in the spreadsheet function
            else throw new FunctionEvaluationError(functionName, ex);
        }
    }

    private _evaluateRange(from: Reference, to: Reference, environment: Environment): CellValue {
        return positionsInRange(from.position, to.position)
            .map(pos => this._evaluateReference(pos, environment));
    }
}
