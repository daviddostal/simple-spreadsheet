export const builtinFunctions = {
    SUM: (...values) => values.flat().reduce((a, b) => a + b, 0),
    AVERAGE: (...values) => values.flat().reduce((a, b) => a + b, 0) / values.flat().length,
};