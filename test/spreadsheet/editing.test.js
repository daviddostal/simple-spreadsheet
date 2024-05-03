import { Spreadsheet } from '../../src/spreadsheet';
import { builtinFunctions } from '../../src/functions';

describe('Cell edit', () => {
  test('cells can be edited', () => {
    const spreadsheet = new Spreadsheet({ cells: { A1: '=1' } });
    expect(spreadsheet.getValue('A1')).toBe(1);
    spreadsheet.setText('A1', '=5');
    expect(spreadsheet.getValue('A1')).toBe(5);
  });

  test('propagates to referencing cells', () => {
    const spreadsheet = new Spreadsheet({
      cells: { A1: 1, A2: '=A1 * 2', A3: '=A2 * 2', A4: '= A3 * 2' }
    });

    expect(spreadsheet.getValue('A1')).toBe(1);
    expect(spreadsheet.getValue('A2')).toBe(2);
    expect(spreadsheet.getValue('A3')).toBe(4);
    expect(spreadsheet.getValue('A4')).toBe(8);

    spreadsheet.setText('A1', '=3+2');
    expect(spreadsheet.getValue('A1')).toBe(5);
    expect(spreadsheet.getValue('A2')).toBe(10);
    expect(spreadsheet.getValue('A3')).toBe(20);
    expect(spreadsheet.getValue('A4')).toBe(40);
  });

  test('works properly even without evaluating other cells first', () => {
    const spreadsheet = new Spreadsheet({
      cells: { A1: 1, A2: '=A1 * 2', A3: '=A2 * 2', A4: '= A3 * 2' }
    });

    // evaluates A3, which depends on A2, but on A1 only indirectly
    spreadsheet.getValue('A3');

    // changes A1, A3 should be invalidated even though A2 was never queried
    spreadsheet.setText('A1', '=3+2');
    expect(spreadsheet.getValue('A1')).toBe(5);
    expect(spreadsheet.getValue('A2')).toBe(10);
    expect(spreadsheet.getValue('A3')).toBe(20);
    expect(spreadsheet.getValue('A4')).toBe(40);
  });

  test('propagates with ranges', () => {
    const spreadsheet = new Spreadsheet({
      cells: { A1: 1, A2: 2, A3: 4, A4: '=SUM(A1:A3)' },
      functions: builtinFunctions
    });

    expect(spreadsheet.getValue('A1')).toBe(1);
    expect(spreadsheet.getValue('A2')).toBe(2);
    expect(spreadsheet.getValue('A3')).toBe(4);
    expect(spreadsheet.getValue('A4')).toBe(7);

    spreadsheet.setText('A1', 5);
    expect(spreadsheet.getValue('A1')).toBe(5);
    expect(spreadsheet.getValue('A2')).toBe(2);
    expect(spreadsheet.getValue('A3')).toBe(4);
    expect(spreadsheet.getValue('A4')).toBe(11);
  });

  test('propagates with ranges even if not all evaluated', () => {
    const spreadsheet = new Spreadsheet({
      cells: { A1: 1, A2: '=SUM(A1:A1)', A3: '=SUM(A2:A2)', A4: '=SUM(A3:A3)' },
      functions: builtinFunctions
    });

    spreadsheet.getValue('A3');

    spreadsheet.setText('A1', 5);
    expect(spreadsheet.getValue('A1')).toBe(5);
    expect(spreadsheet.getValue('A2')).toBe(5);
    expect(spreadsheet.getValue('A3')).toBe(5);
    expect(spreadsheet.getValue('A4')).toBe(5);
  });

  test('cell changes are reported', () => {
    const changedPositions = [];
    const spreadsheet = new Spreadsheet({
      cells: { A1: 1, A2: '=A1' }, onCellsChanged: changed => changedPositions.push(changed)
    });

    expect(spreadsheet.getValue('A1')).toBe(1);
    expect(spreadsheet.getValue('A2')).toBe(1);

    spreadsheet.setText('A1', 2);
    expect(changedPositions).toStrictEqual([['A1', 'A2']]);

    expect(spreadsheet.getValue('A1')).toBe(2);
    expect(spreadsheet.getValue('A2')).toBe(2);
  });

  test('cell changes are reported only for already evaluated cells', () => {
    const changedPositions = [];
    const spreadsheet = new Spreadsheet({
      cells: { A1: 1, A2: '=A1 * 2', A3: '=A2 * 2', A4: '= A3 * 2' },
      onCellsChanged: changed => changedPositions.push(changed)
    });

    // evaluates A3, A2 and A1
    spreadsheet.getValue('A3');

    // changes A1, A2, A3 but not A4 since A4 was never evaluated
    spreadsheet.setText('A1', '=3+2');
    expect(changedPositions).toStrictEqual([['A1', 'A2', 'A3']]);
  });

  test('cell change is not triggered if original cell text remains unchanged', () => {
    const changedPositions = [];
    const spreadsheet = new Spreadsheet({
      cells: { A1: 1, A2: '=A1 * 2', A3: '=A2 * 2', A4: '= A3 * 2' },
      onCellsChanged: changed => changedPositions.push(changed)
    });

    // evaluates A3, A2 and A1
    spreadsheet.getValue('A3');
    spreadsheet.setText('A1', '1');
    spreadsheet.setText('A2', '=A1 * 2');

    expect(changedPositions.length).toBe(0);
  });

  test('cell edits do not trigger a cell change for cells after their reference has changed', () => {
    let changedPositions = [];
    const spreadsheet = new Spreadsheet({
      cells: { A1: 1, A2: '=A1 * 2', A3: '=A2 * 2', A4: '= A3 * 2', A5: '=A2', A6: '=A3', A7: '=A4' },
      onCellsChanged: changed => changedPositions.push(changed)
    });
    // trigger evaluation of A1-A4
    spreadsheet.getValue('A4');

    spreadsheet.setText('A3', '=A1 * 2');
    expect(changedPositions).toStrictEqual([['A3', 'A4']]);

    changedPositions = [];
    // trigger evaluation of A1-A4
    spreadsheet.getValue('A4');
    spreadsheet.getValue('A2');
    spreadsheet.setText('A2', 10);
    expect(changedPositions).toStrictEqual([['A2']]);
  });
});

describe('Spreadsheet event listeners', () => {
  test('unsupported event types throw an error', () => {
    const spreadsheet = new Spreadsheet();
    expect(() => spreadsheet.addListener('aiosudfaslkd', () => { })).toThrow();
    expect(() => spreadsheet.removeListener('aiosudfaslkd', () => { })).toThrow();
  });

  test('cellsChanged event listener is called on cell change', () => {
    const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
    const eventHistory = [];
    spreadsheet.addListener('cellsChanged', (cells, { originatingCell }) => eventHistory.push(cells, originatingCell));
    // Make sure the value is used (else cellsChanged will not be called)
    spreadsheet.getValue('A1');
    spreadsheet.setText('A1', '2');
    expect(eventHistory).toEqual([['A1'], 'A1']);
  });

  test('event listeners are called in the order they were added', () => {
    const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
    const eventHistory = [];
    const listener1 = () => eventHistory.push(1);
    const listener2 = () => eventHistory.push(2);
    const listener3 = () => eventHistory.push(3);

    spreadsheet.addListener('cellsChanged', listener1);
    spreadsheet.addListener('cellsChanged', listener2);
    spreadsheet.addListener('cellsChanged', listener3);

    expect(eventHistory).toEqual([]);

    // Make sure the value is used (else cellsChanged will not be called)
    spreadsheet.getValue('A1');
    spreadsheet.setText('A1', '2');
    expect(eventHistory).toEqual([1, 2, 3]);

    spreadsheet.setText('A1', '3');
    expect(eventHistory).toEqual([1, 2, 3, 1, 2, 3]);
  });

  test('the same event listener can be added multiple times', () => {
    const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
    const eventHistory = [];
    let value1 = 0;
    const listener1 = () => eventHistory.push(value1++);
    let value2 = 100;
    const listener2 = () => eventHistory.push(value2++);

    spreadsheet.addListener('cellsChanged', listener1);
    spreadsheet.addListener('cellsChanged', listener2);
    spreadsheet.addListener('cellsChanged', listener1);
    spreadsheet.addListener('cellsChanged', listener1);

    // Make sure the value is used (else cellsChanged will not be called)
    spreadsheet.getValue('A1');

    spreadsheet.setText('A1', '2');
    expect(eventHistory).toEqual([0, 100, 1, 2]);
  });

  test('event listener is not called after being unregistered', () => {
    const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
    const eventHistory = [];
    const eventListener = () => eventHistory.push('called');
    spreadsheet.addListener('cellsChanged', eventListener);

    // Make sure the value is used (else cellsChanged will not be called)
    spreadsheet.getValue('A1');

    spreadsheet.removeListener('cellsChanged', eventListener);
    spreadsheet.setText('A1', '2');
    expect(eventHistory.length).toBe(0);
  });

  test('removeEventListener removes only listener with same type and callback', () => {
    const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
    const eventHistory = [];
    const eventListener = () => eventHistory.push('changed');
    spreadsheet.addListener('cellsChanged', eventListener);

    spreadsheet.removeListener('cellsChanged', () => { });

    // Make sure the value is used (else cellsChanged will not be called)
    spreadsheet.getValue('A1');

    spreadsheet.setText('A1', '2');
    expect(eventHistory).toEqual(['changed']);
    spreadsheet.setText('A1', '3');
    expect(eventHistory).toEqual(['changed', 'changed']);

    spreadsheet.removeListener('cellsChanged', eventListener);
    spreadsheet.setText('A1', '4');
    expect(eventHistory).toEqual(['changed', 'changed']);
  });

  test('when an event listener is registered mulitple times, removeEventListener removes only the last one', () => {
    const spreadsheet = new Spreadsheet({ cells: { A1: 1 } });
    const eventHistory = [];
    let value1 = 0;
    const listener1 = () => eventHistory.push(value1++);
    let value2 = 100;
    const listener2 = () => eventHistory.push(value2++);

    spreadsheet.addListener('cellsChanged', listener1);
    spreadsheet.addListener('cellsChanged', listener2);
    spreadsheet.addListener('cellsChanged', listener1);
    spreadsheet.addListener('cellsChanged', listener1);

    // Make sure the value is used (else cellsChanged will not be called)
    spreadsheet.getValue('A1');

    spreadsheet.removeListener('cellsChanged', listener1);
    spreadsheet.setText('A1', '2');
    expect(eventHistory).toEqual([0, 100, 1]);

    spreadsheet.removeListener('cellsChanged', listener1);
    spreadsheet.setText('A1', '3');
    expect(eventHistory).toEqual([0, 100, 1, 2, 101]);
  });

  test('removing an unregistered event listener does not throw', () => {
    const spreadsheet = new Spreadsheet();
    const listener = () => { };
    spreadsheet.removeListener('cellsChanged', listener);

    spreadsheet.addListener('cellsChanged', listener);
    spreadsheet.removeListener('cellsChanged', () => { });
    spreadsheet.removeListener('cellsChanged', listener);
    spreadsheet.removeListener('cellsChanged', listener);
  });
});