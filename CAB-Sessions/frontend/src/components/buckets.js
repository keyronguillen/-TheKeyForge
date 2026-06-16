/**
 * Maps a ticket to one of the side-menu buckets (Section 5), based on its
 * current decision. Kept in one place so the sidebar, lists and counts agree.
 */
export function bucketOf(t) {
  if (t.decision === 'approved') return 'approved';
  if (t.decision === 'rejected' || t.decision === 'to_be_reviewed') return 'declined';
  return 'present'; // new / in_review / pending
}

export const BUCKET_TITLE = {
  present: 'To present',
  approved: 'Approved',
  declined: 'Declined / To review',
};
