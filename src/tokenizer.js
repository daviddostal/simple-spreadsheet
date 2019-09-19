import { ParsingError } from './errors';
import TokenStream from './tokenStream';

export const TokenType = Object.freeze({
    EOF: 'EOF',
    WHITESPACE: 'WHITESPACE',
    PLUS: 'PLUS',
    MINUS: 'MINUS',
    STAR: 'STAR',
    SLASH: 'SLASH',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    COLON: 'COLON',
    EQUALS: 'EQUALS',
    COMMA: 'COMMA',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    REFERENCE: 'REFERENCE',
    IDENTIFIER: 'IDENTIFIER',
});

export class Tokenizer {
    constructor() {
        this._rules = {
            // NUMBER, REFERENCE and IDENTIFIER are used the most so keep them at the top
            '\\d+(?:\\.\\d+)?': TokenType.NUMBER,
            '[A-Za-z]+\\d+': TokenType.REFERENCE,
            '[a-zA-Z]\\w+': TokenType.IDENTIFIER,
            '\\s+': TokenType.WHITESPACE,
            '\\+': TokenType.PLUS,
            '-': TokenType.MINUS,
            '\\*': TokenType.STAR,
            '\\/': TokenType.SLASH,
            '\\(': TokenType.LPAREN,
            '\\)': TokenType.RPAREN,
            '=': TokenType.EQUALS,
            ':': TokenType.COLON,
            ',': TokenType.COMMA,
            '\\"(?:[^"\\\\]|\\\\.)*\\"': TokenType.STRING,
            '$': TokenType.EOF,
        };
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
        for (let rule in this._rules) {
            const match = text.match(new RegExp('^' + rule));
            if (match !== null)
                return { type: this._rules[rule], value: match[0] };
        }
        throw new ParsingError(`Unknown token at '${text}'`);
    }
}
