export function formatCellValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "نعم" : "لا";
  }

  if (typeof value === "object") {
    if ("seconds" in value && typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleDateString("ar");
    }

    if (Array.isArray(value)) {
      return value.join("، ");
    }

    return "بيانات";
  }

  return String(value);
}

export function createSearchText(record: Record<string, unknown>) {
  return Object.values(record)
    .map((value) => formatCellValue(value).toLowerCase())
    .join(" ");
}
