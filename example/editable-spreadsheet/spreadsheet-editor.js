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

class SpreadsheetEditor {
  constructor(
    rootElement,
    { width, height, getCellText, getCellValue, onCellEdited = () => { }, formatCellValue = v => v }
  ) {
    this._getCellText = getCellText;
    this._getCellValue = getCellValue;
    this._onCellEdited = onCellEdited;
    this._formatCellValue = formatCellValue;

    this._undoStack = [];
    this._redoStack = [];

    this._initializeEditor(rootElement, width, height);
  }
  _initializeEditor(rootElement, tableWidth, tableHeight) {
    const { tableElement, cellElements } = this._createTableElements(tableWidth, tableHeight);
    this._cellElements = cellElements;
    this._tableElement = tableElement;
    rootElement.replaceChildren(tableElement);

    this._registerEditorEvents(rootElement)

    for (let position of cellElements.keys()) {
      this._registerCellEvents(cellElements.get(position), position);
      this.invalidateValue(position);
    }

    if (tableWidth > 0 && tableHeight > 0) {
      const firstCellElement = this._cellElements.get(indicesToPosition(0, 0));
      firstCellElement.focus();
    }
  }

  _createTableElements(width, height) {
    const { rowElements, cellElements } = this._createCells(width, height);
    const tableElement = el("table", { "data-spreadsheet-table": "" }, [
      el("thead", null, this._createColHeaders(width)),
      el("tbody", null, rowElements)
    ]);
    return { tableElement, cellElements };
  }

  _createColHeaders(width) {
    return el("tr", null, [
      el("th", { "data-column-header": "", "data-row-header": "" }),
      ...Array.from({ length: width }, (_, colNumber) =>
        el("th", { "data-column-header": "" }, colIndexToString(colNumber))
      )
    ]);
  }

  _createCells(width, height) {
    let rowElements = [];
    let cellElements = new Map();

    for (let rowNo = 0; rowNo < height; rowNo++) {
      const rowName = rowIndexToString(rowNo);
      const rowElement = el("tr", null, el("th", { "data-row-header": "" }, rowName));

      for (let colNo = 0; colNo < width; colNo++) {
        const colName = colIndexToString(colNo);
        const cellPosition = makePosition(colName, rowName);
        const cellElement = el("td", { "tabindex": "0" });

        cellElements.set(cellPosition, cellElement);
        rowElement.appendChild(cellElement);
      }

      rowElements.push(rowElement);
    }

    return { rowElements, cellElements };
  }

  _registerEditorEvents(rootElement) {
    rootElement.addEventListener("keydown", event => {
      if (event.key === "z" && event.ctrlKey && onlyAllowedModifiers(event, "ctrlKey")) {
        event.preventDefault();
        this._undo();
      } else if (event.key === "y" && event.ctrlKey && onlyAllowedModifiers(event, "ctrlKey")) {
        event.preventDefault();
        this._redo();
      }
    });
  }

  _registerCellEvents(cellElement, cellPosition) {
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
        this._updateCellValue(cellPosition, "");
      } else if (event.key === "Backspace" && onlyAllowedModifiers(event)) {
        event.preventDefault();
        this._editCell(cellPosition, "");
      } else if (isArrowKey(event) && onlyAllowedModifiers(event, ["shiftKey", "ctrlKey"])) {
        event.preventDefault();
        this._handleCellNavigation(cellPosition, ...arrowDirections[event.key]);
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

  _handleCellNavigation(currentPosition, horizontalDir, verticalDir) {
    const nextCellPos = cellAtOffset(currentPosition, horizontalDir, verticalDir);
    const nextCellElement = this._cellElements.get(nextCellPos);
    if (nextCellElement === undefined) return;
    nextCellElement.focus();
  }

  _updateCellValue(position, newText) {
    const previousText = this._getCellText(position);
    if (previousText !== newText) {
      this._onCellEdited(position, newText);
      this._undoStack.push({ type: "edit-cell", cell: position, text: previousText });
      this._redoStack = [];
    }
  }

  _undo() {
    if (this._undoStack.length > 0) {
      const action = this._undoStack.pop();
      switch (action.type) {
        case "edit-cell":
          const currentText = this._getCellText(action.cell);
          this._onCellEdited(action.cell, action.text);
          this._redoStack.push({ type: "edit-cell", cell: action.cell, text: currentText });
          break;
        default:
          throw new Error(`Unknown undo action type '${action.type}'.`);
      }
    }
  }

  _redo() {
    if (this._redoStack.length > 0) {
      const action = this._redoStack.pop();
      switch (action.type) {
        case "edit-cell":
          const previousText = this._getCellText(action.cell);
          this._onCellEdited(action.cell, action.text);
          this._undoStack.push({ type: "edit-cell", cell: action.cell, text: previousText });
          break;
        default:
          throw new Error(`Unknown redo action type '${action.type}'.`);
      }
    }
  }

  _editCell(position, overrideText) {
    const cellElement = this._cellElements.get(position);
    if (cellElement === undefined)
      throw new Error(`Cannot edit cell at ${position}, because the table cell element does not exist.`);

    const originalText = this._getCellText(position)
    const currentText = overrideText === undefined ? originalText : overrideText;

    const textareaElement = el(
      "textarea",
      { "data-cell-edit": "", "rows": 1, "wrap": "off", "autocapitalize": "off" },
      currentText
    );

    const self = this;

    function stopEditing(updateCell = true) {
      const newText = textareaElement.value;
      // Prevent chromium browsers from calling stopEditing twice
      textareaElement.removeEventListener("blur", handleTextareaBlur);
      textareaElement.remove();
      cellElement.setAttribute("tabindex", "0");
      if (updateCell) {
        self._updateCellValue(position, newText);
      }
    }

    function handleTextareaBlur(event) {
      stopEditing();
    }

    function handleTextareaKeyDown(event) {
      if (event.target !== textareaElement) return;

      if (event.key === "Enter" && onlyAllowedModifiers(event)) {
        event.preventDefault();
        stopEditing();
        cellElement.focus();
        return false;
      } else if (event.key === "Escape" && onlyAllowedModifiers(event)) {
        event.preventDefault();
        stopEditing(false);
        cellElement.focus();
      }
      event.stopPropagation();
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