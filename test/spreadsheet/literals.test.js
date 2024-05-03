import { ParsingError } from '../../src/spreadsheet/errors';
import { expectValue, expectException } from '../test-helpers';

describe('Numbers', () => {
  test('number literals are evaluated in formulas', () => {
    expectValue('=2', 2);
    expectValue('=-2.5', -2.5);
    expectValue('=+2.5', 2.5);
    expectValue('=0.908098', 0.908098);
    expectValue('=10000000.000000', 10000000);
  });
});

describe('Strings', () => {
  test('string literals are evaluated in formulas', () => {
    expectValue('="hello, world"', 'hello, world');
    expectValue('="0.908098"', '0.908098');
    expectValue('="¨úů¨dúsafžüěκόσμεたれホヘ๏ เป็นมนุ"', '¨úů¨dúsafžüěκόσμεたれホヘ๏ เป็นมนุ');
    expectValue('="🇨🇿😊❤✔░"', '🇨🇿😊❤✔░');

  });

  test('backslash escapes supported escape sequences', () => {
    expectValue('="\\""', '"');       //  \"  =>  "
    expectValue('="\\\\\\""', '\\"'); //  \\\"  =>  \"
    expectValue('="\\\\"', '\\');     //  \\  =>  \
    expectValue('="\\\\"', '\\'); // \\ => \
    expectValue('="\\""', '"'); // \"" => "
    expectValue('="\n"', '\n'); // \n => newline

    expectException('="\\j"', ParsingError); // \j => unknown escape sequence
    expectException('="\\\\\\"', ParsingError);   //  ="\\\"  =>  last quote is escaped
  });
});

describe('Booleans', () => {
  test('boolean literals are supported in formulas', () => {
    expectValue('=TRUE', true);
    expectValue('=FALSE', false);
  });

  test('boolean literals must be uppercase', () => {
    expectException('=true', ParsingError);
    expectException('=false', ParsingError);
  });
});