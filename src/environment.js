import { Tokenizer } from './tokenizer';
import Parser from './parser';
import Evaluator from './evaluator';
import { RuntimeError } from './errors';

export class Environment {
    constructor(cells = {}, builtinFunctions = {}) {
        this.cells = cells;
        this.functions = builtinFunctions;
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();
        this._expressionsCache = {};
        // caching values assumes the spreadsheet cells don't change
        this._valuesCache = {};
    }

    getText(position) {
        return this.cells.hasOwnProperty(position) ? this.cells[position].toString() : "";
    }

    getExpression(position) {
        if (this._expressionsCache.hasOwnProperty(position))
            return this._expressionsCache[position];
        const text = this.cells.hasOwnProperty(position) ? this.cells[position] : null;
        const parsed = this._parser.parse(text);
        this._expressionsCache[position] = parsed;
        return parsed;
    }

    getValue(position) {
        if (this._valuesCache.hasOwnProperty(position))
            return this._valuesCache[position];
        const value = this._evaluator.evaluateCell(this.getExpression(position), this);
        this._valuesCache[position] = value;
        return value;
    }

    evaluateExpression(expression) {
        const parsed = this._parser.parse(expression);
        const evaluated = this._evaluator.evaluateCell(parsed, this);
        return evaluated;
    }

    getFunction(name) {
        if (this.functions[name] === undefined)
            throw new RuntimeError(`Unknown function: ${name} is not a function`);
        return this.functions[name];
    }
};