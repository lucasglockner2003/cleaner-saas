import { useEffect, useMemo, useState } from "react";

export function DataTable({ columns, rows, empty, windowSize = null }) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const rowCount = normalizedRows.length;

  const normalizedWindowSize = Number(windowSize ?? 0);
  const shouldWindow = normalizedWindowSize > 0 && rowCount > normalizedWindowSize;
  const [visibleCount, setVisibleCount] = useState(shouldWindow ? normalizedWindowSize : rowCount);

  useEffect(() => {
    setVisibleCount(shouldWindow ? normalizedWindowSize : rowCount);
  }, [rowCount, normalizedWindowSize, shouldWindow]);

  const visibleRows = useMemo(() => {
    if (!shouldWindow) {
      return normalizedRows;
    }
    return normalizedRows.slice(0, visibleCount);
  }, [normalizedRows, shouldWindow, visibleCount]);

  if (!rowCount) {
    return empty;
  }

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
      {shouldWindow && visibleCount < rowCount ? (
        <div className="table-foot-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setVisibleCount((current) => Math.min(rowCount, current + normalizedWindowSize))}
          >
            Load more rows ({rowCount - visibleCount} remaining)
          </button>
        </div>
      ) : null}
    </div>
  );
}
