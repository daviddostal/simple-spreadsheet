export default class ReferencesMap {
    constructor() {
        this._referencesFrom = new Map();
        this._referencesTo = new Map();
    }

    getReferencesFrom(position) { return this._referencesFrom.get(position); }
    getReferencesTo(position) { return this._referencesTo.get(position); }

    addReference(positionFrom, referenceTo) {
        if (!this._referencesFrom.has(positionFrom))
            this._referencesFrom.set(positionFrom, []);
        this._referencesFrom.get(positionFrom).push(referenceTo);

        if (!this._referencesTo.has(referenceTo))
            this._referencesTo.set(referenceTo, []);
        this._referencesTo.get(referenceTo).push(positionFrom);
    }

    removeReferencesFrom(position) {
        const targetNodes = this._referencesFrom.get(position);
        for (let target of targetNodes) {
            const valueIndex = this._referencesTo.get(target).indexOf(position);
            if (valueIndex > -1) this._referencesTo.get(target).splice(valueIndex, 1);
        }
        this._referencesFrom.delete(position);
    }

    getAffectedCells(position) {
        // TODO: maybe optimize using stack and for loop?
        const referencesTo = this.getReferencesTo(position);
        if (!referencesTo) return [];

        const recursiveReferences = referencesTo.flatMap(this.getAffectedCells.bind(this));
        return [...referencesTo, ...recursiveReferences];
    }
}
