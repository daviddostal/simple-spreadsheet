import { ParsingError } from './errors';
import { Token, TokenType } from './tokenizer';

export default class TokenStream {
    private _tokens: Token[];
    private _currentPos: number;

    constructor(tokens: Token[]) {
        this._tokens = tokens;
        this._currentPos = 0;
    }

    peek() {
        return this._tokens[this._currentPos] || null;
    }

    expect(...types: TokenType[]): Token | null {
        const token = this.peek();
        if (token !== null && types.includes(token.type)) {
            this._currentPos++;
            return token;
        }
        return null;
    }

    require(...types: TokenType[]): Token {
        const token = this.expect(...types);
        if (token === null)
            throw new ParsingError(`Unexpected ${this.peek().type}, expected ${types.join(' or ')}`);
        return token;
    }
}