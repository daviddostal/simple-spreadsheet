import { CellPosition } from './types';

export default class ReferencesMap {
    // Map value contains all cells referenced by the key
    private _referencesFrom: Map<CellPosition, Set<CellPosition>>;

    // Map value contains all cells referencing the key
    private _referencesTo: Map<CellPosition, Set<CellPosition>>;

    constructor() {
        this._referencesFrom = new Map();
        this._referencesTo = new Map();
    }

    addReferences(positionFrom: CellPosition, referencesTo: Iterable<CellPosition>): void {
        const referencesFromPosition = this._referencesFrom.get(positionFrom) ?? new Set();

        for (const referenceTo of referencesTo) {
            referencesFromPosition.add(referenceTo);

            const referencesToPosition = this._referencesTo.get(referenceTo) ?? new Set();
            referencesToPosition.add(positionFrom);
            this._referencesTo.set(referenceTo, referencesToPosition);
        }

        this._referencesFrom.set(positionFrom, referencesFromPosition);
    }

    removeReferencesFrom(position: CellPosition): void {
        const targetNodes = this._referencesFrom.get(position);
        if (targetNodes) {
            for (const target of targetNodes) {
                const referencesToTarget = this._referencesTo.get(target);
                if (referencesToTarget === undefined)
                    throw new Error(`Invariant violated: References tracked in ReferenecsMap should always exist for both directions.`);
                referencesToTarget.delete(position);
            }
            this._referencesFrom.delete(position);
        }
    }

    cellsDependingOn(position: CellPosition): Set<CellPosition> {
        const visited = new Set<CellPosition>();
        const toVisitStack = [position];
        while (toVisitStack.length > 0) {
            const current = toVisitStack.pop()!;
            visited.add(current);
            const neighbors = this._referencesTo.has(current) ?
                [...this._referencesTo.get(current) ?? []].filter(n => !visited.has(n)) : [];
            const newNeighbors = neighbors.filter(n => !visited.has(n));
            toVisitStack.push(...newNeighbors);
        }
        return visited;
    }
}
