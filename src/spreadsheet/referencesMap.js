export default class ReferencesMap {
    constructor() {
        this._referencesFrom = new Map();
        this._referencesTo = new Map();
    }

    addReferences(positionFrom, referencesTo) {
        if (!this._referencesFrom.has(positionFrom))
            this._referencesFrom.set(positionFrom, new Set(referencesTo));

        for (let referenceTo of referencesTo) {
            this._referencesFrom.get(positionFrom).add(referenceTo);

            if (!this._referencesTo.has(referenceTo))
                this._referencesTo.set(referenceTo, new Set());
            this._referencesTo.get(referenceTo).add(positionFrom);
        }
    }

    removeReferencesFrom(position) {
        const targetNodes = this._referencesFrom.get(position);
        if (targetNodes) {
            for (let target of targetNodes)
                target.delete(position);
            this._referencesFrom.delete(position);
        }
    }

    cellsDependingOn(position) {
        // TODO: maybe optimize using stack and for loop?
        const referencesTo = this._referencesTo.get(position); // TODO: write test for same reference not appearing multiple times
        if (!referencesTo) return [position];

        const recursiveReferences = [...referencesTo].flatMap(this.cellsDependingOn.bind(this));
        return [position, ...recursiveReferences];
    }
}
