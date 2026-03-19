import { useEffect, useMemo, useState } from "react";

export function DataTable({ columns, rows, empty, windowSize = null }) {
  if (!rows.length) {
    return empty;
  }

  const normalizedWindowSize = Number(windowSize ?? 0);
  const shouldWindow = normalizedWindowSize > 0 && rows.length > normalizedWindowSize;
  const [visibleCount, setVisibleCount] = useState(shouldWindow ? normalizedWindowSize : rows.length);

  useEffect(() => {
    setVisibleCount(shouldWindow ? normalizedWindowSize : rows.length);
  }, [rows.length, normalizedWindowSize, shouldWindow]);

  const visibleRows = useMemo(() => {
    if (!shouldWindow) {
      return rows;
    }
    return rows.slice(0, visibleCount);
  }, [rows, shouldWindow, visibleCount]);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, rowIndex) => (
            <tr key={row.id ?? rowIndex}>
              {columns.map((column) => (
                <td key={`${row.id ?? rowIndex}-${column.key}`}>
                  {typeof column.render === "function" ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {shouldWindow && visibleCount < rows.length ? (
        <div className="table-foot-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setVisibleCount((current) => Math.min(rows.length, current + normalizedWindowSize))}
          >
            Load more rows ({rows.length - visibleCount} remaining)
          </button>
        </div>
      ) : null}
    </div>
  );
}
