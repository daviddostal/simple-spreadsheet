import { Tokenizer } from './tokenizer';
import Parser from './parser';
import Evaluator from './evaluator';
import { RuntimeError } from './errors';
import ReferencesMap from './referencesMap';

export class Environment {
    constructor(cells = {}, builtinFunctions = {}, cellsChangedListener = (() => { })) {
        this.cells = cells;
        this.functions = builtinFunctions;
        this.cellsChangedListener = cellsChangedListener;
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();

        this._expressionsCache = {}; // position => expression tree
        this._valuesCache = {}; // position => value;
        this._referencesMap = new ReferencesMap();
    }

    getText(position) {
        return this.cells.hasOwnProperty(position) ? this.cells[position].toString() : "";
    }

    setText(position, value) {
        this.cells[position] = value;

        const affectedCells = [position, ...this._referencesMap.getAffectedCells(position)];
        for (let pos of affectedCells)
            delete this._valuesCache[pos];

        delete this._expressionsCache[position];
        if (this._referencesMap.getReferencesFrom(position))
            this._referencesMap.removeReferencesFrom(position);

        this.cellsChangedListener(affectedCells);
    }

    getExpression(position) {
        if (this._expressionsCache.hasOwnProperty(position))
            return this._expressionsCache[position];

        const text = this.cells.hasOwnProperty(position) ? this.cells[position] : null;
        const { parsed, references } = this._parser.parse(text);
        this._expressionsCache[position] = parsed;

        for (let reference of references)
            this._referencesMap.addReference(position, reference);

        return parsed;
    }

    getValue(position) {
        if (this._valuesCache.hasOwnProperty(position))
            return this._valuesCache[position];

        const result = this._evaluator.evaluateCellAt(position, this.getExpression(position), this);
        this._valuesCache[position] = result;
        return result;
    }

    evaluateQuery(expression) {
        const { parsed, _ } = this._parser.parse(expression);
        return this._evaluator.evaluateQuery(parsed, this);
    }

    getFunction(name) {
        if (this.functions[name] === undefined)
            throw new RuntimeError(`Unknown function: ${name}`);
        return this.functions[name];
    }
};