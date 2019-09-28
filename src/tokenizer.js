import { ParsingError } from './errors';
import TokenStream from './tokenStream';

export const TokenType = Object.freeze({
    // Note: strings must be unique, because they are used for comparison
    EOF: 'end of formula',
    WHITESPACE: 'whitespace',
    PLUS: '+',
    MINUS: '-',
    STAR: '*',
    SLASH: '/',
    LPAREN: 'opening parenthesis',
    RPAREN: 'closing parenthesis',
    COLON: ':',
    EQUALS: '=',
    COMMA: 'comma',
    NUMBER: 'number',
    STRING: 'string',
    REFERENCE: 'reference',
    IDENTIFIER: 'identifier',
});

export class Tokenizer {
    constructor() {
        this._rules = [
            // NUMBER, REFERENCE and IDENTIFIER are used the most so keep them at the top (for performance reasons - it makes a difference, I measured it)
            // Patterns usually start with ^ so they match the start of the remaining
            // string, not anywhere in the middle.
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
