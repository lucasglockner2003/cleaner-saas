export function Badge({ value, tone = "neutral" }) {
  return <span className={`badge tone-${tone}`}>{value}</span>;
}

