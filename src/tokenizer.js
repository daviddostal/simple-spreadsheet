export class ParsingError extends Error { constructor(message) { super(message); } }

export const TokenType = Object.freeze({
    EOF: Symbol('EOF'),
    WHITESPACE: Symbol('WHITESPACE'),
    PLUS: Symbol('PLUS'),
    MINUS: Symbol('MINUS'),
    STAR: Symbol('STAR'),
    SLASH: Symbol('SLASH'),
    LPAREN: Symbol('LPAREN'),
    RPAREN: Symbol('RPAREN'),
    COLON: Symbol('COLON'),
    EQUALS: Symbol('EQUALS'),
    COMMA: Symbol('COMMA'),
    NUMBER: Symbol('NUMBER'),
    STRING: Symbol('STRING'),
    IDENTIFIER: Symbol('IDENTIFIER'),
});

export default class Tokenizer {
    constructor(rules = {
        '$': TokenType.EOF,
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
        '\\d+(?:\\.\\d+)?': TokenType.NUMBER,
        '\\"(?:[^"\\\\]|\\\\.)*\\"': TokenType.STRING,
        '[a-zA-Z]\\w+': TokenType.IDENTIFIER,
    }) {
        this.rules = rules;
    }

    begin(str) {
        this.remaining = str;
        return this;
    }

    next() {
        const next = this.peek();
        this.remaining = this.remaining.slice(next.value.length);
        return next;
    }

    peek() {
        for (let rule in this.rules) {
            const match = this.remaining.match(new RegExp('^' + rule));
            if (match !== null) {
                return { type: this.rules[rule], value: match[0] };
            }
        }
        throw new ParsingError(`Unknown token '${this.remaining}'`);
    }

    rest() {
        const rest = this.remaining;
        this.remaining = "";
        return rest;
    }
}