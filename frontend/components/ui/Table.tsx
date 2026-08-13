import { ReactNode } from "react";
import clsx from "clsx";

interface Column<T> {
  key:        string;
  header:     string;
  render?:    (row: T) => ReactNode;
  className?: string;
  mono?:      boolean;   // use monospace font for this column (prices, quantities, codes)
  align?:     "left" | "right" | "center";
}

interface TableProps<T> {
  columns:       Column<T>[];
  rows:          T[];
  keyField:      keyof T;
  emptyMessage?: string;
  emptyDetail?:  string;   // optional secondary line in empty state
  onRowClick?:   (row: T) => void;
  /** Show skeleton loading state instead of rows */
  loading?:      boolean;
  skeletonRows?: number;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="table-cell">
          <span className="block h-3.5 rounded bg-canvas animate-pulse" style={{ width: `${55 + (i * 23) % 35}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  keyField,
  emptyMessage = "No records found.",
  emptyDetail,
  onRowClick,
  loading = false,
  skeletonRows = 5,
}: TableProps<T>) {
  const alignClass = { left: "text-left", right: "text-right", center: "text-center" };

  return (
    <div className="overflow-x-auto rounded-lg border border-border" role="region" aria-label="Data table">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-canvas border-b border-border">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={clsx(
                  "table-header",
                  alignClass[col.align ?? "left"],
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-border bg-white">
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 px-4 text-center">
                <p className="text-sm font-medium text-ink-muted">{emptyMessage}</p>
                {emptyDetail && (
                  <p className="text-xs text-ink-faint mt-1">{emptyDetail}</p>
                )}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={String(row[keyField])}
                className={clsx(
                  "transition-colors duration-100",
                  onRowClick
                    ? "cursor-pointer hover:bg-accent-light/30 focus-within:bg-accent-light/30"
                    : "hover:bg-canvas/60",
                )}
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick
                  ? (e) => (e.key === "Enter" || e.key === " ") && onRowClick(row)
                  : undefined
                }
                role={onRowClick ? "button" : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      "table-cell",
                      col.mono && "font-mono tabular-nums",
                      alignClass[col.align ?? "left"],
                      col.className,
                    )}
                  >
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
