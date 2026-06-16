/**
 * Left side menu (Section 5). Four layers:
 *   1. Overview  — counts + lists of 2/3/4
 *   2. To present — the working board (table + review + approval)
 *   3. Approved   — tickets approved in step 2
 *   4. Declined / To review — tickets rejected or sent back in step 2
 */
const ITEMS = [
  { id: 'overview', label: 'Overview', icon: '▦' },
  { id: 'present', label: 'To present', icon: '▤', countKey: 'to_present' },
  { id: 'approved', label: 'Approved', icon: '✓', countKey: 'approved' },
  { id: 'declined', label: 'Declined / Review', icon: '✗', countKey: 'declined' },
];

export function Sidebar({ active, onSelect, counts, adoEnabled, snowEnabled }) {
  // External-source views appear only when their backend connection is set up.
  const items = [
    ...ITEMS,
    ...(adoEnabled ? [{ id: 'ado', label: 'Azure Boards', icon: '⟴' }] : []),
    ...(snowEnabled ? [{ id: 'snow', label: 'ServiceNow', icon: '❖' }] : []),
  ];
  return (
    <nav className="sidebar">
      {items.map((it) => (
        <button
          key={it.id}
          className={`side-item ${active === it.id ? 'active' : ''}`}
          onClick={() => onSelect(it.id)}
        >
          <span className="side-icon">{it.icon}</span>
          <span className="side-label">{it.label}</span>
          {it.countKey && counts && (
            <span className="side-count">{counts[it.countKey] ?? 0}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
