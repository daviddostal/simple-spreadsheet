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
    }

    getText(position) {
        return this.cells.hasOwnProperty(position) ? this.cells[position].toString() : "";
    }

    getExpression(position) {
        const value = this.cells.hasOwnProperty(position) ? this.cells[position] : null;
        return this._parser.parse(value);
    }

    getValue(position) {
        return this._evaluator.evaluateCell(this.getExpression(position), this);
    }

    getFunction(name) {
        if (this.functions[name] === undefined)
            throw new RuntimeError(`Unknown function: ${name} is not a function`);
        return this.functions[name];
    }
};