// ================================================================
// --- FILE: public/RealtimeLogTableUI.js ---
// ================================================================
// このブロックの内容を、お手元の「RealtimeLogTableUI.js」に全てコピーしてください。

import { eventBus } from './EventBus.js';
import { timeToSeconds } from './roastUtils.js';

let tableContainerElement = null;
let tableHeadElement = null;
let tableBodyElement = null;

const DATA_ROWS_CONFIG = [
    { id: 'log-row-bean', label: '豆温度 (°C)' },
    { id: 'log-row-chamber', label: '庫内温度 (°C)' },
    { id: 'log-row-ror', label: 'ROR (°C/min)' }
];

function _createInitialTableStructure() {
    if (!tableContainerElement) return;
    tableContainerElement.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'min-w-full text-xs border-collapse border border-gray-300';
    
    tableHeadElement = table.createTHead();
    tableHeadElement.className = 'bg-gray-100 sticky top-0 z-10';
    const headRow = tableHeadElement.insertRow();
    const firstHeaderCell = document.createElement('th');
    firstHeaderCell.className = 'px-3 py-2 text-left font-semibold text-gray-600 border border-gray-300 sticky left-0 bg-gray-100 z-20';
    firstHeaderCell.textContent = '項目＼時間(分)';
    headRow.appendChild(firstHeaderCell);
    
    tableBodyElement = table.createTBody();
    tableBodyElement.className = 'bg-white';
    DATA_ROWS_CONFIG.forEach(conf => {
        const row = tableBodyElement.insertRow();
        row.id = conf.id;
        const th = document.createElement('th');
        th.scope = 'row';
        th.className = 'px-3 py-2 text-left font-semibold text-gray-700 border border-gray-300 sticky left-0 bg-white z-10 whitespace-nowrap';
        th.textContent = conf.label;
        row.appendChild(th);
    });
    
    tableContainerElement.appendChild(table);
}

function clearLogTable() {
    tableHeadElement = null;
    tableBodyElement = null;
    if (tableContainerElement) {
        tableContainerElement.innerHTML = '';
    }
}

function toggleLogTableArea(show) {
    if (tableContainerElement) {
        tableContainerElement.style.display = show ? 'block' : 'none';
        if (show && !tableBodyElement) {
            _createInitialTableStructure();
        }
    }
}

function addLogEntry(logData) {
    if (!tableBodyElement || !tableHeadElement) {
        if (tableContainerElement && tableContainerElement.style.display !== 'none') {
            _createInitialTableStructure();
        } else {
            return;
        }
    }

    const totalSeconds = timeToSeconds(logData.time);
    if (totalSeconds === null) return;
    const plotMinute = Math.floor(totalSeconds / 60);

    const headRow = tableHeadElement.rows[0];
    let columnIndex = -1;
    
    for (let i = 1; i < headRow.cells.length; i++) {
        if (parseInt(headRow.cells[i].textContent, 10) === plotMinute) {
            columnIndex = i;
            break;
        }
    }
    
    const formatCellValue = (value) => (value !== null && value !== undefined && !isNaN(parseFloat(value))) ? parseFloat(value).toFixed(1) : '-';
    
    const beanRow = document.getElementById(DATA_ROWS_CONFIG[0].id);
    const chamberRow = document.getElementById(DATA_ROWS_CONFIG[1].id);
    const rorRow = document.getElementById(DATA_ROWS_CONFIG[2].id);

    if (columnIndex !== -1) {
        if (beanRow) beanRow.cells[columnIndex].textContent = formatCellValue(logData.beanTemp);
        if (chamberRow) chamberRow.cells[columnIndex].textContent = formatCellValue(logData.chamberTemp);
        if (rorRow) rorRow.cells[columnIndex].textContent = formatCellValue(logData.ror);
    } else {
        let insertIndex = headRow.cells.length;
        for (let i = 1; i < headRow.cells.length; i++) {
            if (plotMinute < parseInt(headRow.cells[i].textContent, 10)) {
                insertIndex = i;
                break;
            }
        }
        
        const timeHeaderCell = headRow.insertCell(insertIndex);
        timeHeaderCell.scope = 'col';
        timeHeaderCell.className = 'px-3 py-2 text-center font-medium text-gray-500 border border-gray-300';
        timeHeaderCell.textContent = plotMinute;

        if (beanRow) beanRow.insertCell(insertIndex).textContent = formatCellValue(logData.beanTemp);
        if (chamberRow) chamberRow.insertCell(insertIndex).textContent = formatCellValue(logData.chamberTemp);
        if (rorRow) rorRow.insertCell(insertIndex).textContent = formatCellValue(logData.ror);
    }
    
    if (tableContainerElement) {
        tableContainerElement.scrollLeft = tableContainerElement.scrollWidth;
    }
}

function removeLastLogEntry() {
    if (!tableBodyElement || !tableHeadElement || tableHeadElement.rows[0].cells.length <= 1) {
        return;
    }
    const lastColumnIndex = tableHeadElement.rows[0].cells.length - 1;
    tableHeadElement.rows[0].deleteCell(lastColumnIndex);
    if (tableBodyElement) {
        for (let i = 0; i < tableBodyElement.rows.length; i++) {
            tableBodyElement.rows[i].deleteCell(lastColumnIndex);
        }
    }
}

export function initializeRealtimeLogTableUI() {
    tableContainerElement = document.getElementById('realtimeLogTableContainer');
    if (!tableContainerElement) {
        console.error("RealtimeLogTableUI: Container 'realtimeLogTableContainer' not found!");
        return;
    }

    eventBus.on('log-table:add-entry', addLogEntry);
    eventBus.on('log-table:clear', clearLogTable);
    eventBus.on('ui:toggle-log-table', toggleLogTableArea);
    eventBus.on('log-table:remove-last-entry', removeLastLogEntry);
}
