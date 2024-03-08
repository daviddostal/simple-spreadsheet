export default class ReferencesMap {
    constructor() {
        this._referencesFrom = new Map(); // { position => Set(referencesFrom) }
        this._referencesTo = new Map(); // { position => Set(referencedBy) }
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
                this._referencesTo.get(target).delete(position);
            this._referencesFrom.delete(position);
        }
    }

    cellsDependingOn(position) {
        const visited = new Set();
        const toVisitStack = [position];
        while (toVisitStack.length > 0) {
            const current = toVisitStack.pop();
            visited.add(current);
            const neighbors = this._referencesTo.has(current) ?
                [...this._referencesTo.get(current)].filter(n => !visited.has(n)) : [];
            const newNeighbors = neighbors.filter(n => !visited.has(n));
            toVisitStack.push(...newNeighbors);
        }
        return visited;
    }
}
