export default class TwoWayMap {
    constructor() {
        this._nodesFrom = {};
        this._nodesTo = {};
    }

    getFrom(from) { return this._nodesFrom[from]; }
    getTo(to) { return this._nodesTo[to]; }

    addNode(from, to) {
        this._addToNode(this._nodesFrom, from, to);
        this._addToNode(this._nodesTo, to, from);
    }

    removeNode(from, to) {
        this._removeFromNode(this._nodesFrom, from, to);
        this._removeFromNode(this._nodesTo, to, from);
    }

    removeNodesFrom(node) {
        this._removeNodes(this._nodesFrom, this._nodesTo, node);
    }

    removeNodesTo(node) {
        this._removeNodes(this._nodesTo, this._nodesFrom, node);
    }

    traverseIncoming(node, callback) {
        callback(node);
        const sourceNodes = this.getTo(node);
        if (sourceNodes) {
            for (let sourceNode of sourceNodes) {
                this.traverseIncoming(sourceNode, callback);
            };
        }
    }

    _addToNode(map, node, value) {
        if (!map[node]) map[node] = [];
        map[node].push(value);
    }

    _removeFromNode(map, node, value) {
        const valueIndex = map[node].indexOf(value);
        if (valueIndex > -1) map[node].splice(valueIndex, 1);
    }

    _removeNodes(targetMap, sourceMap, node) {
        const targetNodes = targetMap[node];
        for (let target of targetNodes) {
            this._removeFromNode(sourceMap, target, node);
        }
        delete targetMap[node];
    }

    toString() {
        if (Object.entries(this._nodesFrom).length === 0 && Object.entries(this._nodesTo).length === 0)
            return "{ }";
        let result = "{\n    ";
        for (let nodeFrom in this._nodesFrom)
            result += `${nodeFrom} => [${this._nodesFrom[nodeFrom].join(', ')}]; `;

        result += "\n    ";
        for (let nodeTo in this._nodesTo)
            result += `${nodeTo} <= [${this._nodesTo[nodeTo].join(', ')}]; `;
        result += "\n}";
        return result;
    }
}