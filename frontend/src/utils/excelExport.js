import * as XLSX from 'xlsx-js-style';

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
        } catch {
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
        .replace(/\b\w/g, (l) => l.toUpperCase());
};

const inferColumnsFromRows = (rows) => {
    const firstObjectRow = rows.find((r) => r && typeof r === 'object' && !Array.isArray(r));
    if (!firstObjectRow) return [];

    return Object.keys(firstObjectRow).map((key) => ({
        key,
        header: toHeaderLabel(key),
    }));
};

const computeColumnWidths = (rows, columnCount, minWidth = 10, maxWidth = 48) => {
    const widths = [];

    for (let i = 0; i < columnCount; i++) {
        let maxLength = minWidth;

        rows.forEach((row) => {
            const val = row?.[i];
            const len = String(val ?? '').length;
            if (len > maxLength) maxLength = len;
        });

        widths.push({
            wch: Math.max(minWidth, Math.min(maxLength + 2, maxWidth)),
        });
    }

    return widths;
};

const applyStyles = (sheet, { headerRow, tableTitleRow, metadataCount }) => {
    const range = XLSX.utils.decode_range(sheet['!ref']);

    for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
            const ref = XLSX.utils.encode_cell({ r: R, c: C });
            if (!sheet[ref]) continue;

            // Base style
            sheet[ref].s = {
                font: { name: 'Arial', sz: 11 },
                alignment: { vertical: 'center' },
                border: {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' },
                },
            };

            // ===== TITLE =====
            if (R === 0) {
                sheet[ref].s = {
                    font: { name: 'Arial', sz: 20, bold: true },
                    alignment: { horizontal: 'center', vertical: 'center' },
                };
            }

            // ===== METADATA LABEL =====
            if (R > 0 && R <= metadataCount + 1 && C === 0) {
                sheet[ref].s.font = { bold: true };
            }

            // ===== TABLE TITLE =====
            if (R === tableTitleRow) {
                sheet[ref].s = {
                    font: { sz: 14, bold: true },
                    alignment: { horizontal: 'left' },
                };
            }

            // ===== HEADER =====
            if (R === headerRow) {
                sheet[ref].s = {
                    font: { bold: true, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: '0F172A' } },
                    alignment: { horizontal: 'center' },
                    border: {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' },
                    },
                };
            }

            // ===== ZEBRA STRIPES =====
            if (R > headerRow && (R - headerRow) % 2 === 0) {
                sheet[ref].s.fill = {
                    fgColor: { rgb: 'F8FAFC' },
                };
            }
        }
    }
};

const buildSheet = ({ reportTitle, tableTitle, metadata, columns, rows }) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const safeColumns =
        Array.isArray(columns) && columns.length > 0
            ? columns
            : inferColumnsFromRows(safeRows);

    const headerValues = safeColumns.map((c) => c.header);

    const dataRows = safeRows.map((row) =>
        safeColumns.map((c) => toDisplayValue(row?.[c.key]))
    );

    const metadataRows = (Array.isArray(metadata) ? metadata : [])
        .filter((m) => m && m.label)
        .map((m) => [String(m.label), toDisplayValue(m.value)]);

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
        output.push(['No records available']);
    }

    const sheet = XLSX.utils.aoa_to_sheet(output);

    const columnCount = Math.max(headerValues.length, 2);
    const tableTitleRow = 3 + metadataRows.length;
    const headerRow = tableTitleRow + 1;

    // ===== MERGES =====
    sheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
        { s: { r: tableTitleRow, c: 0 }, e: { r: tableTitleRow, c: columnCount - 1 } },
    ];

    // ===== FILTER =====
    if (headerValues.length > 0) {
        sheet['!autofilter'] = {
            ref: XLSX.utils.encode_range({
                s: { r: headerRow, c: 0 },
                e: { r: headerRow, c: headerValues.length - 1 },
            }),
        };
    }

    // ===== WIDTHS =====
    sheet['!cols'] = computeColumnWidths(
        [...metadataRows, headerValues, ...dataRows],
        columnCount
    );

    // ===== STYLES =====
    applyStyles(sheet, {
        headerRow,
        tableTitleRow,
        metadataCount: metadataRows.length,
    });

    // ===== CURRENCY =====
    safeColumns.forEach((col, colIndex) => {
        if (
            col.key.includes('amount') ||
            col.key.includes('payment') ||
            col.key.includes('price')
        ) {
            for (let r = headerRow + 1; r < headerRow + 1 + dataRows.length; r++) {
                const ref = XLSX.utils.encode_cell({ r, c: colIndex });
                if (sheet[ref]) {
                    sheet[ref].z = '"₱"#,##0.00';
                }
            }
        }
    });

    return sheet;
};

export const exportStyledWorkbook = ({
    fileName,
    reportTitle,
    metadata = [],
    sheets = [],
}) => {
    if (!Array.isArray(sheets) || sheets.length === 0) {
        throw new Error('At least one sheet is required.');
    }

    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheet, index) => {
        const ws = buildSheet({
            reportTitle,
            tableTitle: sheet?.tableTitle || sheet?.name || `Table ${index + 1}`,
            metadata: [...metadata, ...(sheet?.metadata || [])],
            columns: sheet?.columns || [],
            rows: sheet?.rows || [],
        });

        XLSX.utils.book_append_sheet(
            workbook,
            ws,
            sanitizeSheetName(sheet?.name, `Sheet ${index + 1}`)
        );
    });

    const safeFileName = String(fileName || 'report-export').endsWith('.xlsx')
        ? fileName
        : `${fileName}.xlsx`;

    XLSX.writeFile(workbook, safeFileName);
};