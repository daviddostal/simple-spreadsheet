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
        this._expressionsCache = {}; // position => expression tree
        this._valuesCache = {}; // position => value;
        this._referencesTo = {}; // position => [referenced by]
    }

    getText(position) {
        return this.cells.hasOwnProperty(position) ? this.cells[position].toString() : "";
    }

    setText(position, value) {
        this.cells[position] = value;
        delete this._expressionsCache[position];
        this._resetReferences(position);
    }

    _resetReferences(position) {
        delete this._valuesCache[position];
        const references = this._referencesTo[position];
        if (references) {
            for (let reference of references) {
                this._resetReferences(reference);
            };
        }
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
        const { result, references } = this._evaluator.evaluateCellAt(position, this.getExpression(position), this);
        this._addReferences(references, position);
        this._valuesCache[position] = result;
        return result;
    }

    _addReferences(references, position) {
        // TODO: check for circular references, probably somewhere here?
        // Maybe on evaluation we can just track already visited cells,
        // because else detecting cycles in a DAG can be O(E) when there is NO cycle.

        references.forEach(reference => {
            if (!this._referencesTo[reference])
                this._referencesTo[reference] = [];
            this._referencesTo[reference].push(position);
        });
    }

    evaluateQuery(expression) {
        const parsed = this._parser.parse(expression);
        const evaluated = this._evaluator.evaluateQuery(parsed, this);
        return evaluated;
    }

    getFunction(name) {
        if (this.functions[name] === undefined)
            throw new RuntimeError(`Unknown function: ${name} is not a function`);
        return this.functions[name];
    }
};