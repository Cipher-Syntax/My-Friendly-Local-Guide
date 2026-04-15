import * as XLSX from 'xlsx';

const MAX_SHEET_NAME_LENGTH = 31;
const INVALID_SHEET_NAME_CHARS_REGEX = /[:\\/?*\[\]]/g;

const sanitizeSheetName = (value, fallback = 'Sheet') => {
    const base = String(value || fallback)
        .replace(INVALID_SHEET_NAME_CHARS_REGEX, ' ')
        .trim();

    if (!base) return fallback;
    return base.slice(0, MAX_SHEET_NAME_LENGTH);
};

const toDisplayValue = (value) => {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        try {
            return JSON.stringify(value);
        } catch (error) {
            return String(value);
        }
    }

    return String(value);
};

const toHeaderLabel = (key) => {
    return String(key)
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const inferColumnsFromRows = (rows) => {
    const firstObjectRow = rows.find((row) => row && typeof row === 'object' && !Array.isArray(row));
    if (!firstObjectRow) return [];

    return Object.keys(firstObjectRow).map((key) => ({
        key,
        header: toHeaderLabel(key),
    }));
};

const computeColumnWidths = (rows, columnCount, minWidth = 10, maxWidth = 48) => {
    const widths = [];

    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        let maxLength = minWidth;

        rows.forEach((row) => {
            const cell = row?.[columnIndex];
            const length = String(cell ?? '').length;
            if (length > maxLength) {
                maxLength = length;
            }
        });

        widths.push({ wch: Math.max(minWidth, Math.min(maxLength + 2, maxWidth)) });
    }

    return widths;
};

const buildSheet = ({ reportTitle, tableTitle, metadata, columns, rows }) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeColumns = Array.isArray(columns) && columns.length > 0
        ? columns
        : inferColumnsFromRows(safeRows);

    const headerValues = safeColumns.map((column) => column.header);
    const dataRows = safeRows.map((row) => (
        safeColumns.map((column) => toDisplayValue(row?.[column.key]))
    ));

    const metadataRows = (Array.isArray(metadata) ? metadata : [])
        .filter((item) => item && item.label)
        .map((item) => [String(item.label), toDisplayValue(item.value)]);

    const output = [
        [reportTitle || 'Analytics Export'],
        ['Generated At', new Date().toLocaleString()],
        ...metadataRows,
        [],
        [tableTitle || 'Data Table'],
        headerValues,
    ];

    if (dataRows.length > 0) {
        output.push(...dataRows);
    } else {
        output.push(['No records available for this section.']);
    }

    const sheet = XLSX.utils.aoa_to_sheet(output);
    const columnCount = Math.max(headerValues.length, 2);
    const tableTitleRow = 3 + metadataRows.length;
    const headerRow = tableTitleRow + 1;

    sheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
        { s: { r: tableTitleRow, c: 0 }, e: { r: tableTitleRow, c: columnCount - 1 } },
    ];

    if (headerValues.length > 0) {
        sheet['!autofilter'] = {
            ref: XLSX.utils.encode_range({
                s: { r: headerRow, c: 0 },
                e: { r: headerRow, c: headerValues.length - 1 },
            }),
        };
    }

    const widthSourceRows = [
        ...metadataRows,
        headerValues,
        ...dataRows,
    ];

    sheet['!cols'] = computeColumnWidths(widthSourceRows, columnCount);

    return sheet;
};

export const exportStyledWorkbook = ({ fileName, reportTitle, metadata = [], sheets = [] }) => {
    if (!Array.isArray(sheets) || sheets.length === 0) {
        throw new Error('At least one sheet is required for export.');
    }

    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheet, index) => {
        const worksheet = buildSheet({
            reportTitle,
            tableTitle: sheet?.tableTitle || sheet?.name || `Table ${index + 1}`,
            metadata: [...metadata, ...(sheet?.metadata || [])],
            columns: sheet?.columns || [],
            rows: sheet?.rows || [],
        });

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            sanitizeSheetName(sheet?.name, `Sheet ${index + 1}`)
        );
    });

    const safeFileName = String(fileName || 'report-export').endsWith('.xlsx')
        ? String(fileName)
        : `${String(fileName || 'report-export')}.xlsx`;

    XLSX.writeFile(workbook, safeFileName);
};
