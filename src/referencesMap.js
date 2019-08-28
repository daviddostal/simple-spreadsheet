export default class ReferencesMap {
    constructor() {
        this._referencesIn = {};
        this._referencesTo = {};
    }

    getReferencesIn(position) { return this._referencesIn[position]; }
    getReferencesTo(position) { return this._referencesTo[position]; }

    addReference(positionFrom, referenceTo) {
        if (!this._referencesIn[positionFrom])
            this._referencesIn[positionFrom] = [];
        this._referencesIn[positionFrom].push(referenceTo);

        if (!this._referencesTo[referenceTo])
            this._referencesTo[referenceTo] = [];
        this._referencesTo[referenceTo].push(positionFrom);
    }

    removeReferencesFrom(position) {
        const targetNodes = this._referencesIn[position];
        for (let target of targetNodes) {
            const valueIndex = this._referencesTo[target].indexOf(position);
            if (valueIndex > -1) this._referencesTo[target].splice(valueIndex, 1);
        }
        delete this._referencesIn[position];
    }

    traverseReferencesTo(position, callback) {
        callback(position);
        const referencesTo = this.getReferencesTo(position);
        if (referencesTo) {
            for (let reference of referencesTo) {
                this.traverseReferencesTo(reference, callback);
            };
        }
    }
}