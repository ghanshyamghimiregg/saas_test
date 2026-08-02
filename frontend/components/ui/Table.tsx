import { ReactNode } from "react";
import clsx from "clsx";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyField: keyof T;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T extends Record<string, unknown>>({
  columns, rows, keyField, emptyMessage = "No records found.", onRowClick,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-border">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={clsx("table-header", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-cell text-center text-slate-400 py-10">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={String(row[keyField])}
                className={clsx(
                  "hover:bg-slate-50 transition-colors",
                  onRowClick && "cursor-pointer",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={clsx("table-cell", col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
