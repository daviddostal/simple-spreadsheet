import { ParsingError } from './errors';
import TokenStream from './tokenStream';

export const TokenType = Object.freeze({
    // Note: strings must be unique, because they are used for comparison
    EOF: Symbol('end of formula'),
    WHITESPACE: Symbol('whitespace'),
    PLUS: Symbol('+'),
    MINUS: Symbol('-'),
    STAR: Symbol('*'),
    SLASH: Symbol('/'),
    LPAREN: Symbol('opening parenthesis'),
    RPAREN: Symbol('closing parenthesis'),
    COLON: Symbol(':'),
    EQUALS: Symbol('='),
    COMMA: Symbol('comma'),
    NUMBER: Symbol('number'),
    STRING: Symbol('string'),
    IDENTIFIER: Symbol('identifier'),
});

export class Tokenizer {
    constructor() {
        this._rules = [
            // NUMBER and IDENTIFIER are used the most so keep them at the top (for performance reasons - it makes a difference, I measured it)
            // Patterns usually start with ^ so they match the start of the remaining
            // string, not anywhere in the middle.
            { pattern: /^\d+(?:\.\d+)?/, type: TokenType.NUMBER },
            { pattern: /^[a-zA-Z]\w+/, type: TokenType.IDENTIFIER },
            { pattern: /^"(?:[^"\\]|\\.)*"/, type: TokenType.STRING },
            { pattern: /^$/, type: TokenType.EOF },
        ];

        this._operators = {
            ' ': TokenType.WHITESPACE,
            '\t': TokenType.WHITESPACE,
            '\r': TokenType.WHITESPACE,
            '\n': TokenType.WHITESPACE,
            '+': TokenType.PLUS,
            '-': TokenType.MINUS,
            '*': TokenType.STAR,
            '/': TokenType.SLASH,
            '(': TokenType.LPAREN,
            ')': TokenType.RPAREN,
            '=': TokenType.EQUALS,
            ':': TokenType.COLON,
            ',': TokenType.COMMA,
        }
    }

    tokenize(text) {
        const tokens = [];
        let remaining = text;
        while (remaining.length > 0) {
            const token = this._nextToken(remaining);
            tokens.push(token);
            remaining = remaining.slice(token.value.length);
        }
        tokens.push({ type: TokenType.EOF, value: '' });
        return new TokenStream(tokens.filter(token => token.type !== TokenType.WHITESPACE));
    }

    _nextToken(text) {
        const firstChar = text[0];
        const operator = this._operators[firstChar];
        if (operator !== undefined) return { type: operator, value: firstChar };

        for (let rule of this._rules) {
            const match = text.match(rule.pattern);
            if (match !== null)
                return { type: rule.type, value: match[0] };
        }
        throw new ParsingError(`Unknown token at '${text}'`);
    }
}
