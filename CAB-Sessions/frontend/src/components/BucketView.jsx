/**
 * A side-menu bucket view: a filtered ticket table + the selected ticket's
 * Review and Approval panels stacked below. "To present" allows creating
 * tickets and is the working view; Approved / Declined are review/read views
 * (the panels still enforce per-role capability).
 */
import { TicketTable } from './TicketTable.jsx';
import { ReviewPanel } from './ReviewPanel.jsx';
import { ApprovalPanel } from './ApprovalPanel.jsx';
import { BUCKET_TITLE } from './buckets.js';

export function BucketView({ bucket, tickets, selectedId, onSelect, detail, onChanged, onToast, aiEnabled }) {
  const isPresent = bucket === 'present';
  return (
    <div className="stack">
      <TicketTable
        title={BUCKET_TITLE[bucket]}
        tickets={tickets}
        selectedId={selectedId}
        onSelect={onSelect}
        onCreated={onChanged}
        allowCreate={isPresent}
      />

      {detail && (
        <div className="grid-2" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
          <ReviewPanel ticket={detail} onSaved={onChanged} aiEnabled={aiEnabled} />
          <ApprovalPanel ticket={detail} onDecided={onChanged} onToast={onToast} />
        </div>
      )}
    </div>
  );
}
