// Dropdown for saree colour labels. Options come from GET /api/colorways
// (mirrors the storefront's STANDARD_COLORWAYS), so anything picked here
// is guaranteed to render as the correct hex on the PDP swatch row.
//
// The tiny square on the left previews the hex the storefront will use.
// Legacy values stored on existing products that don't match any known
// colour are surfaced as a disabled "Legacy: X" option so the field
// isn't silently cleared when an old record is opened for edit.
export default function ColorSelect({
  value = '',
  options = [],
  onChange,
  placeholder = 'Select colour',
  className = '',
}) {
  const norm = value.trim().toLowerCase()
  const match = options.find(
    (c) => c.id.toLowerCase() === norm || c.name.toLowerCase() === norm,
  )
  const swatch = match ? match.hex : 'transparent'
  const isLegacy = !match && !!value.trim()

  return (
    <div className={`color-select ${className}`}>
      <span
        className="color-select-swatch"
        style={{ background: swatch }}
        aria-hidden="true"
      />
      <select
        className="color-select-input"
        value={match ? match.name : value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
        {isLegacy && (
          <option value={value} disabled>Legacy: {value}</option>
        )}
      </select>
    </div>
  )
}
