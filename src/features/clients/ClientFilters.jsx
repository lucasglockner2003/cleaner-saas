export function ClientFilters({
  suburbs,
  suburbFilter,
  statusFilter,
  searchFilter,
  onSuburbChange,
  onStatusChange,
  onSearchChange
}) {
  return (
    <div className="toolbar">
      <label>
        Suburb
        <select value={suburbFilter} onChange={(event) => onSuburbChange(event.target.value)}>
          <option value="all">All suburbs</option>
          {suburbs.map((suburb) => (
            <option key={suburb} value={suburb}>
              {suburb}
            </option>
          ))}
        </select>
      </label>

      <label>
        Status
        <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>

      <label className="grow">
        Search
        <input
          type="text"
          placeholder="Search name, phone, or address"
          value={searchFilter}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
    </div>
  );
}

