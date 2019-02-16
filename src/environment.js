import { Tokenizer, ParsingError } from './tokenizer';
import Parser from './parser';
import Evaluator from './evaluator';

export class RuntimeError extends Error {
    constructor(message) { super(message); }
    toString() { return `RuntimeError: ${this.message}`; }
}

export class Environment {
    constructor(cells = {}, builtinFunctions = {}) {
        this.cells = cells;
        this.functions = builtinFunctions;
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();
    }

    getText(position) {
        return this.cells[position] === undefined ? "" : this.cells[position];
    }

    getExpression(position) {
        const value = this.cells[position] === undefined ? null : this.cells[position];
        return this._parser.parse(value);
    }

    getValue(position) {
        return this._evaluator.evaluateCell(this.getExpression(position), this);
    }

    getFunction(name) {
        if (this.functions[name] === undefined)
            throw new Error(`Unknown function: ${name}`);
        return this.functions[name];
    }
};