import { ParsingError } from './errors.js';
import TokenStream from './tokenStream.js';

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
    BOOLEAN: Symbol('boolean'),
    IDENTIFIER: Symbol('identifier'),
    GREATER_THAN: Symbol('>'),
    LESS_THAN: Symbol('<'),
    GREATER_OR_EQUAL: Symbol('>='),
    LESS_OR_EQUAL: Symbol('<='),
    NOT_EQUAL: Symbol('<>'),
});

export class Tokenizer {
    // Lookup table to speed up parsing of some one-character tokens.
    // This is faster, than going through tokens one-by-one and checking if they match.
    //
    // IMPORTANT: none of these tokens should be a prefix of another token type!
    // For example, '<' cannot be a simple token, because it is a prefix of '<='.
    static _simpleTokens = {
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
    };

    // Tokens, which match exactly one specific string.
    // The order of rules matters when one token can be a prefix of another,
    // such as '<=' and '<'. Longer rules should generally come first in such cases.
    static _stringTokens = [
        { string: 'TRUE', type: TokenType.BOOLEAN },
        { string: 'FALSE', type: TokenType.BOOLEAN },
        { string: '>=', type: TokenType.GREATER_OR_EQUAL },
        { string: '<=', type: TokenType.LESS_OR_EQUAL },
        { string: '<>', type: TokenType.NOT_EQUAL },
        { string: '>', type: TokenType.GREATER_THAN },
        { string: '<', type: TokenType.LESS_THAN },
    ];

    // Rules for more complex tokens, where one token type can match multiple different strings.
    // The order of rules matters in cases where one token can be a prefix of another.
    static _patternTokens = [
        // NUMBER and IDENTIFIER are used the most so keep them at the top (for performance reasons - it makes a difference, I measured it)
        // Patterns usually start with ^ so they match the start of the remaining
        // string, not anywhere in the middle.
        { pattern: /^\d+(?:\.\d+)?/, type: TokenType.NUMBER },
        { pattern: /^[a-zA-Z]\w*/, type: TokenType.IDENTIFIER },
        { pattern: /^"(?:[^"\\]|\\.)*"/, type: TokenType.STRING },
    ];

    tokenize(text) {
        const tokens = [];
        let remaining = text;
        while (remaining.length > 0) {
            const token = this._nextToken(remaining);
            if (token.type !== TokenType.WHITESPACE)
                tokens.push(token);
            remaining = remaining.slice(token.value.length);
        }
        tokens.push({ type: TokenType.EOF, value: '' });
        return new TokenStream(tokens);
    }

    _nextToken(text) {
        if (text.length === 0) return { type: TokenType.EOF, value: '' };

        const firstChar = text[0];
        const simpleToken = Tokenizer._simpleTokens[firstChar];
        if (simpleToken !== undefined) return { type: simpleToken, value: firstChar };

        for (let { string, type } of Tokenizer._stringTokens) {
            if (text.startsWith(string))
                return { type, value: string };
        }

        for (let { pattern, type } of Tokenizer._patternTokens) {
            const match = text.match(pattern);
            if (match !== null)
                return { type, value: match[0] };
        }
        throw new ParsingError(`Unknown token at '${text}'`);
    }
}
