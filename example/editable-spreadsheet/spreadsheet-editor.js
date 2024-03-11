const { stringToColIndex, colIndexToString, stringToRowIndex, rowIndexToString, parsePosition, makePosition, } = SimpleSpreadsheet.Helpers;

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
  return indicesToPosition(nextColIndex, nextRowIndex);
}

function onlyAllowedModifiers(event, allowedKeys = []) {
  const modifierKeys = ["altKey", "shiftKey", "ctrlKey", "metaKey"];
  return modifierKeys.every(key => allowedKeys.includes(key) || !event[key]);
}

class SpreadsheetEditor {
  constructor(
    rootElement,
    { width, height, getCellText, getCellValue, onCellEdited = () => { }, formatCellValue = v => v }
  ) {
    this._rootElement = rootElement;
    this._width = width;
    this._height = height;
    this._getCellText = getCellText;
    this._getCellValue = getCellValue;
    this._onCellEdited = onCellEdited;
    this._formatCellValue = formatCellValue;

    this._initializeTable();
  }

  _createColHeaders(width) {
    const headRowElement = document.createElement("tr");
    const spacerThElement = document.createElement("th");
    spacerThElement.setAttribute("data-column-header", "");
    spacerThElement.setAttribute("data-row-header", "");
    headRowElement.appendChild(spacerThElement);
    for (let colNumber = 0; colNumber < width; colNumber++) {
      const thElement = document.createElement("th");
      thElement.setAttribute("data-column-header", "");
      thElement.textContent = colIndexToString(colNumber);
      headRowElement.appendChild(thElement);
    }
    return headRowElement;
  }

  _createCells(width, height) {
    let rowElements = [];
    let cellElements = new Map();

    for (let rowNo = 0; rowNo < height; rowNo++) {
      const rowString = rowIndexToString(rowNo);
      const rowElement = document.createElement("tr");
      const rowHeaderElement = document.createElement("th");
      rowHeaderElement.textContent = rowString;
      rowHeaderElement.setAttribute("data-row-header", "");
      rowElement.appendChild(rowHeaderElement);

      for (let colNo = 0; colNo < width; colNo++) {
        const colString = colIndexToString(colNo);
        const cellPosition = makePosition(colString, rowString);

        const cellElement = document.createElement("td");
        cellElement.setAttribute("tabindex", "0");
        this._addCellEvents(cellElement, cellPosition);
        cellElements.set(cellPosition, cellElement);

        rowElement.appendChild(cellElement);
      }

      rowElements.push(rowElement);
    }

    return { rowElements, cellElements };
  }

  _addCellEvents(cellElement, cellPosition) {
    const handleCellNavigation = function handleCellNavigation(horizontalDir, verticalDir) {
      const nextCellPos = cellAtOffset(cellPosition, horizontalDir, verticalDir);
      const nextCellElement = this._cellElements.get(nextCellPos);
      if (nextCellElement === undefined) return;
      nextCellElement.focus();
    }.bind(this);

    const arrowDirections = {
      "ArrowRight": [1, 0], "ArrowLeft": [-1, 0], "ArrowDown": [0, 1], "ArrowUp": [0, -1],
    };
    const isArrowKey = event => Object.keys(arrowDirections).some(arrow => event.key === arrow);

    // Destructuring is needed to still count multi-byte characters as 1.
    const isPrintableCharacter = event => [...event.key].length === 1;

    cellElement.addEventListener("keydown", event => {
      if (event.target !== cellElement) return;

      if ((event.key === "Enter" && onlyAllowedModifiers(event, ["shiftKey"])) ||
        (event.key === "F2" && onlyAllowedModifiers(event))) {
        event.preventDefault();
        this._editCell(cellPosition);
      } else if (event.key === "Delete" && onlyAllowedModifiers(event, ["ctrlKey"])) {
        event.preventDefault();
        this._onCellEdited(cellPosition, "");
      } else if (isArrowKey(event) && onlyAllowedModifiers(event, ["shiftKey", "ctrlKey"])) {
        event.preventDefault();
        handleCellNavigation(...arrowDirections[event.key]);
      } else if (isPrintableCharacter(event) && onlyAllowedModifiers(event, ["shiftKey"])) {
        event.preventDefault();
        this._editCell(cellPosition, event.key);
      }
    });

    cellElement.addEventListener("mousedown", event => {
      if (event.target === cellElement) {
        event.preventDefault();
        this._editCell(cellPosition)
      }
    });
  }

  _createTableElements(width, height) {
    const tableElement = document.createElement("table");
    tableElement.setAttribute("data-spreadsheet-table", "");

    const tableHeadElement = tableElement.createTHead();
    tableHeadElement.appendChild(this._createColHeaders(width));

    const tableBodyElement = tableElement.createTBody();
    const { rowElements, cellElements } = this._createCells(width, height);
    for (let rowElement of rowElements)
      tableBodyElement.appendChild(rowElement);

    return { tableElement, cellElements };
  }

  _initializeTable() {
    const { tableElement, cellElements } = this._createTableElements(this._width, this._height);
    this._cellElements = cellElements;
    this._tableElement = tableElement;
    this._rootElement.replaceChildren(tableElement);

    for (let position of cellElements.keys()) {
      this.invalidateValue(position);
    }

    if (this._width > 0 && this._height > 0) {
      const firstCellElement = this._cellElements.get(indicesToPosition(0, 0));
      firstCellElement.focus();
    }
  }

  _editCell(position, overrideText) {
    const cellElement = this._cellElements.get(position);
    if (cellElement === undefined)
      throw new Error(`Cannot edit cell at ${position}, because the table cell element does not exist.`);

    const originalText = this._getCellText(position)
    const textareaElement = document.createElement("textarea");
    textareaElement.setAttribute("data-cell-edit", "");
    textareaElement.setAttribute("rows", 1);
    textareaElement.setAttribute("wrap", "off");
    textareaElement.setAttribute("autocapitalize", "off");
    const currentText = overrideText === undefined ? originalText : overrideText;
    textareaElement.textContent = currentText;
    const self = this;

    function stopEditing(updateCell = true) {
      const newText = textareaElement.value;
      // Prevent chromium browsers from calling stopEditing twice
      textareaElement.removeEventListener("blur", handleTextareaBlur);
      textareaElement.remove();
      cellElement.setAttribute("tabindex", "0");
      if (updateCell && newText !== originalText) {
        self._onCellEdited(position, newText);
      }
    }

    function handleTextareaBlur(event) {
      stopEditing();
    }

    function handleTextareaKeyDown(event) {
      if (event.target !== textareaElement) return;

      if (event.key === "Enter" && onlyAllowedModifiers(event)) {
        event.preventDefault();
        event.stopPropagation();
        stopEditing();
        cellElement.focus();
        return false;
      } else if (event.key === "Escape" && onlyAllowedModifiers(event)) {
        event.preventDefault();
        event.stopPropagation();
        stopEditing(false);
        cellElement.focus();
      }
    }

    textareaElement.addEventListener("keydown", handleTextareaKeyDown);
    textareaElement.addEventListener("blur", handleTextareaBlur);

    cellElement.removeAttribute("tabindex");
    cellElement.appendChild(textareaElement);
    textareaElement.focus();
    textareaElement.setSelectionRange(currentText.length, currentText.length);
  }

  invalidateValue(position, { animate = false } = {}) {
    const cellElement = this._cellElements.get(position);
    if (cellElement === undefined)
      throw new Error(`Cannot update cell value at ${position}, because the table cell element does not exist.`);

    const text = this._getCellText(position);
    const { isError, error, value } = this._getCellValue(position);

    if (isError) {
      cellElement.textContent = error.shortName;
      cellElement.setAttribute("data-has-error", "");
      cellElement.setAttribute("title", error.toString());
    } else {
      cellElement.textContent = this._formatCellValue(value);
      cellElement.removeAttribute("data-has-error");
      cellElement.setAttribute("title", text);
    }

    if (text.startsWith("="))
      cellElement.setAttribute("data-is-formula", "");
    else
      cellElement.removeAttribute("data-is-formula");

    if (animate)
      cellElement.animate([{ color: "transparent" }, {}], { duration: 400, iterations: 1, });
  }
}