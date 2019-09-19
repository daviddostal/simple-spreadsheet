import { ParsingError } from "./errors";

export default class TokenStream {
    constructor(tokens) {
        this._tokens = tokens;
        this._currentPos = 0;
    }

    peek() {
        return this._tokens[this._currentPos] || null;
    }

    expect(...types) {
        const token = this.peek();
        if (token !== null && types.includes(token.type)) {
            this._currentPos++;
            return token;
        }
        return null;
    }

    require(...types) {
        const token = this.expect(...types);
        if (token === null)
            throw new ParsingError(`Expected ${types.join(' or ')}, got ${this.peek().type} instead.`);
        return token;
    }
}