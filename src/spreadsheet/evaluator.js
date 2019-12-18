import { Value, Reference, BinaryOp, FunctionCall, Range, UnaryOp } from './expressions';
import { RuntimeError, ParsingError } from './errors';
import * as Helpers from './helpers';

class CircularReferenceError extends Error {
    constructor(message, cell) { super(message); this.cell = cell; }
}

export default class Evaluator {
    constructor() {
        this.visitedCellStack = [];
    }

    evaluateCellAt(position, cell, environment) {
        if (this.visitedCellStack.includes(position))
            throw new CircularReferenceError(`Circular reference detected (${this.visitedCellStack.join(' -> ')} -> ${position})`, cell);

        this.visitedCellStack.push(position);
        try {
            const result = this._evaluateCell(cell, environment);
            this.visitedCellStack.pop();
            return result;
        } catch (ex) {
            this.visitedCellStack.pop()
            // Normal errors propagate as usual, but CircularReferenceError is used
            // only to propagate the exception to the originating cell internally
            // (so it doesn't get reported just as an error in a referenced cell).
            // Once the CircularReferenceError reaches back to the originating cell,
            // we turn it into a normal RuntimeError.
            if (ex instanceof CircularReferenceError && ex.cell === cell) {
                throw new RuntimeError(ex.message);
            } else {
                throw ex;
            }
        }
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
            return environment.getValue(position);
        } catch (e) {
            if (e instanceof ParsingError || e instanceof RuntimeError)
                throw new RuntimeError(`Error in referenced cell ${position}`);
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
        let func = environment.getFunction(functionName);
        func = func instanceof Function ? { isMacro: false, function: func } : func;
        return (func.isMacro === true) ?
            this._evaluateMacro(functionName, func, args, environment) :
            this._evaluateSpreadsheetFunction(functionName, func, args, environment);
    }

    _evaluateSpreadsheetFunction(functionName, func, args, environment) {
        const argumentValues = this._evaluateArguments(functionName, args, environment);
        try {
            return func.function(...argumentValues);
        } catch (ex) {
            throw new RuntimeError(`Error in function ${functionName}: ${ex}`);
        }
    }

    _evaluateArguments(functionName, args, environment) {
        let evaluatedArgs = [];
        for (let i = 0; i < args.length; i++) {
            try {
                evaluatedArgs.push(this._evaluateExpression(args[i], environment));
            } catch (ex) {
                throw new RuntimeError(`Error in function argument ${i + 1} in function ${functionName}: ${ex}`);
            }
        }
        return evaluatedArgs;
    }

    _evaluateMacro(macroName, macro, args, environment) {
        const argsLazyValues = args.map(arg => () => this._evaluateExpression(arg, environment));
        try {
            return macro.function(...argsLazyValues);
        } catch (ex) {
            throw new RuntimeError(`Error in macro ${macroName}: ${ex}`);
        }
    }

    _evaluateRange(from, to, environment) {
        return Helpers.positionsInRange(from, to)
            .map(pos => Helpers.makePosition(pos.col, pos.row))
            .map(pos => this._evaluateReference(pos, environment));
    }
}
