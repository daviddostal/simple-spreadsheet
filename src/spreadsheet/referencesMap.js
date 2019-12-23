export default class ReferencesMap {
    constructor() {
        // TODO: maybe use a Map? (but profile performance - addReference is run a lot)
        this._referencesFrom = {};
        this._referencesTo = {};
    }

    getReferencesFrom(position) { return this._referencesFrom[position]; }
    getReferencesTo(position) { return this._referencesTo[position]; }

    addReference(positionFrom, referenceTo) {
        if (!this._referencesFrom[positionFrom])
            this._referencesFrom[positionFrom] = [];
        this._referencesFrom[positionFrom].push(referenceTo);

        if (!this._referencesTo[referenceTo])
            this._referencesTo[referenceTo] = [];
        this._referencesTo[referenceTo].push(positionFrom);
    }

    removeReferencesFrom(position) {
        const targetNodes = this._referencesFrom[position];
        for (let target of targetNodes) {
            const valueIndex = this._referencesTo[target].indexOf(position);
            if (valueIndex > -1) this._referencesTo[target].splice(valueIndex, 1);
        }
        delete this._referencesFrom[position];
    }

    getAffectedCells(position) {
        // TODO: maybe optimize using stack and for loop
        const referencesTo = this.getReferencesTo(position);
        if (!referencesTo) return [];

        const recursiveReferences = referencesTo.flatMap(this.getAffectedCells.bind(this));
        return [...referencesTo, ...recursiveReferences];
    }
}