function positionToIndices(position) {
  const { col, row } = parsePosition(position);
  return [stringToColIndex(col), stringToRowIndex(row)];
}

function indicesToPosition(colIndex, rowIndex) {
  return makePosition(colIndexToString(colIndex), rowIndexToString(rowIndex));
}

function cellAtOffset(position, horizontalOffset, verticalOffset) {
  const [colIndex, rowIndex] = positionToIndices(position);
  const [nextColIndex, nextRowIndex] = [colIndex + horizontalOffset, rowIndex + verticalOffset];
  return indicesToPosition(Math.max(nextColIndex, 0), Math.max(nextRowIndex, 0));
}

function onlyAllowedModifiers(event, allowedKeys = []) {
  const modifierKeys = ["altKey", "shiftKey", "ctrlKey", "metaKey"];
  return modifierKeys.every(key => allowedKeys.includes(key) || !event[key]);
}

function el(type, attributes = {}, children = []) {
  const element = document.createElement(type);
  for (let attributeName in attributes) {
    element.setAttribute(attributeName, attributes[attributeName]);
  }
  const childrenArray = Array.isArray(children) ? children : [children]
  element.replaceChildren(...childrenArray);
  return element;
}