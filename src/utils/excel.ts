import * as XLSX from "xlsx";
import type { AppRecord } from "../services/records";

export type ExportColumn = {
  key: string;
  label: string;
};

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    if ("seconds" in value && typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleString("ar");
    }

    return JSON.stringify(value);
  }

  return String(value);
}

export function exportRecordsToWorkbook(
  fileName: string,
  records: AppRecord[],
  columns: ExportColumn[],
) {
  const rows = records.map((record) => {
    return columns.reduce<Record<string, string>>((row, column) => {
      row[column.label] = normalizeValue(record[column.key]);
      return row;
    }, {});
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "LCMS");
  XLSX.writeFile(workbook, `${fileName}.xlsx`, { compression: true });
}

export async function readWorkbookRows(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
}
