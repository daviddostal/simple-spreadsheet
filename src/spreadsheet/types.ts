export type CellContent = unknown;
export type CellValue = unknown;
export type CellPosition = string;

export type BasicSpreadsheetFunction = (..._args: CellValue[]) => CellValue;
export type LazySpreadsheetFunction = (..._args: (() => CellValue)[]) => CellValue;
export type BasicSpreadsheetFunctionDefinition = { isLazy: false, function: BasicSpreadsheetFunction };
export type LazySpreadsheetFunctionDefinition = { isLazy: true, function: LazySpreadsheetFunction };
export type SpreadsheetFunctionDefinition =
    BasicSpreadsheetFunction |
    BasicSpreadsheetFunctionDefinition |
    LazySpreadsheetFunctionDefinition;
