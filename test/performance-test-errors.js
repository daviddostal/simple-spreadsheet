/* eslint-disable no-undef */
import { Spreadsheet } from '../src/spreadsheet/index.js';

function generateTestData(cellCount, generateCell, initialCells) {
  const cells = new Map(Object.entries(initialCells));
  for (let i = cells.size; i < cellCount; i++) {
    const { position, text } = generateCell(i);
    cells.set(position, text);
  }
  return cells;
}

function profile(callback) {
  const startTime = new Date();
  const result = callback();
  const endTime = new Date();
  return { timeMs: endTime - startTime, result };
}

function profileSpreadsheetEvaluation(label, testData) {
  const spreadsheet = new Spreadsheet({ cells: testData });
  const cellCount = testData.size;
  console.log(`[${label}]:`);
  console.log(`Profiling evaluation of ${cellCount} cells...`);
  const { timeMs, result } = profile(() => {
    let valueSum = 0;
    [...spreadsheet.cells()].forEach(([position, _]) => {
      try {
        // Just to make sure the value is actually used and calculating it
        // can under no circumstances be optimized away;
        valueSum += spreadsheet.getValue(position);
      } catch {
        // we don't really care about the error here
      }
    });
    return valueSum;
  });
  console.log(`Took ${timeMs}ms (${(1000 * cellCount / timeMs).toFixed(0)} cells/s) and returned ${result}.`);
}

const SAMPLE_COUNT = 100_000;

profileSpreadsheetEvaluation(
  'Without errors',
  generateTestData(
    SAMPLE_COUNT,
    i => ({ position: `A${i}`, text: `=A${i - 1} - A${i - 2}` }),
    { A0: 0, A1: 1 },
  ),
);

console.log('');

profileSpreadsheetEvaluation(
  'With errors',
  generateTestData(
    SAMPLE_COUNT,
    i => ({ position: `A${i}`, text: `=A${i - 1} - A${i - 2}` }),
    { A0: '=)', A1: '=(' },
  ),
);