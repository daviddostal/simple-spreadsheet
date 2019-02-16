export class RuntimeError extends Error { constructor(message) { super(message); } }

export default class Environment {
    constructor(cells = {}, builtinFunctions = {}) {
        this.cells = cells
        this.functions = builtinFunctions;
    }

    getEntry(position) {
        return this.cells[position] === undefined ? null : this.cells[position];
    }

    setEntry(position, entry) {
        this.cells[position] = entry;
    }

    getFunction(name) {
        if (this.functions[name] === undefined)
            throw new Error(`Unknown function: ${name}`);
        return this.functions[name];
    }
}