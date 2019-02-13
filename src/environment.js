export class RuntimeError extends Error { constructor(message) { super(message); } }

export default class Environment {
    constructor(cells = {}, builtinFunctions = {}) {
        this.cells = cells
        this.functions = builtinFunctions;
    }

    getEntry(col, row) {
        return this.cells[`${col}${row}`] === undefined ? null : this.cells[`${col}${row}`];
    }

    setEntry(col, row, entry) {
        this.cells[`${col}${row}`] = entry;
    }

    getFunction(name) {
        if (this.functions[name] === undefined)
            throw new Error(`Unknown function: ${name}`);
        return this.functions[name];
    }
}