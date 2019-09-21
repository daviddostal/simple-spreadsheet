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
        this._rules = [
            // NUMBER, REFERENCE and IDENTIFIER are used the most so keep them at the top
            { pattern: /^\d+(?:\.\d+)?/, type: TokenType.NUMBER },
            { pattern: /^[A-Za-z]+\d+/, type: TokenType.REFERENCE },
            { pattern: /^[a-zA-Z]\w+/, type: TokenType.IDENTIFIER },
            { pattern: /^\s+/, type: TokenType.WHITESPACE },
            { pattern: /^\+/, type: TokenType.PLUS },
            { pattern: /^\-/, type: TokenType.MINUS },
            { pattern: /^\*/, type: TokenType.STAR },
            { pattern: /^\//, type: TokenType.SLASH },
            { pattern: /^\(/, type: TokenType.LPAREN },
            { pattern: /^\)/, type: TokenType.RPAREN },
            { pattern: /^=/, type: TokenType.EQUALS },
            { pattern: /^:/, type: TokenType.COLON },
            { pattern: /^,/, type: TokenType.COMMA },
            { pattern: /^\"(?:[^"\\]|\\.)*\"/, type: TokenType.STRING },
            { pattern: /^$/, type: TokenType.EOF },
        ];
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
        for (let rule of this._rules) {
            const match = text.match(rule.pattern);
            if (match !== null)
                return { type: rule.type, value: match[0] };
        }
        throw new ParsingError(`Unknown token at '${text}'`);
    }
}
