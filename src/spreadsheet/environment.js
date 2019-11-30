import { Tokenizer } from './tokenizer';
import Parser from './parser';
import Evaluator from './evaluator';
import { RuntimeError } from './errors';
import ReferencesMap from './referencesMap';

export class Environment {
    constructor(cells = new Map(), builtinFunctions = {}, cellsChangedListener = (() => { })) {
        this.cells = cells;
        this.functions = builtinFunctions;
        this.onCellsChanged = cellsChangedListener;
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();

        this._expressionsCache = new Map(); // position => expression tree
        this._valuesCache = new Map(); // position => value;
        this._referencesMap = new ReferencesMap();
    }

    getText(position) {
        return this.cells.has(position) ? this.cells.get(position).toString() : "";
    }

    setText(position, value) {
        this.cells.set(position, value);

        const affectedCells = [position, ...this._referencesMap.getAffectedCells(position)];
        for (let pos of affectedCells)
            this._valuesCache.delete(pos);

        this._expressionsCache.delete(position);
        if (this._referencesMap.getReferencesFrom(position))
            this._referencesMap.removeReferencesFrom(position);

        this.onCellsChanged(affectedCells);
    }

    getExpression(position) {
        if (this._expressionsCache.has(position))
            return this._expressionsCache.get(position);

        const text = this.cells.has(position) ? this.cells.get(position) : null;
        const { parsed, references } = this._parser.parse(text);
        this._expressionsCache.set(position, parsed);

        for (let reference of references)
            this._referencesMap.addReference(position, reference);

        return parsed;
    }

    getValue(position) {
        if (this._valuesCache.has(position))
            return this._valuesCache.get(position);

        const result = this._evaluator.evaluateCellAt(position, this.getExpression(position), this);
        this._valuesCache.set(position, result);
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
}