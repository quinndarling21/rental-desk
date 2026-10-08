import { StatusBadge } from '../../components/StatusBadge';
import { StampedPhoto } from '../../components/StampedPhoto';
import type { PhotoView } from '../../lib/conditionStore';
import { formatDateTime } from '../../lib/dates';
import { checkOutNoteLabel } from '../../lib/photoCheckIn';
import type { BenchFinding, ConditionRecord } from '../../types';

function PhotoList({ photos, empty }: { photos: PhotoView[]; empty: string }) {
  if (photos.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="photo-list">
      {photos.map((photo) => (
        <li key={photo.id}>
          <StampedPhoto src={photo.url} alt={`${photo.stage} photo of ${photo.assetTag}`} stamp={photo.stamp} />
        </li>
      ))}
    </ul>
  );
}

function RecordSummary({ record, empty }: { record: ConditionRecord | undefined; empty: string }) {
  if (!record) return <p className="muted">{empty}</p>;
  return (
    <div className="record-summary">
      <StatusBadge status={record.condition} />
      <p>{record.stage === 'check-out' ? checkOutNoteLabel(record.note) : record.note || 'No return note.'}</p>
      <p className="muted">Acknowledged by {record.acknowledgment.customerName} (placeholder tap).</p>
    </div>
  );
}

export function PhotoColumns({
  photos,
  records,
  findings,
}: {
  photos: PhotoView[];
  records: ConditionRecord[];
  findings: BenchFinding[];
}) {
  const checkout = photos.filter((photo) => photo.stage === 'check-out');
  const returned = photos.filter((photo) => photo.stage === 'return');
  const checkoutRecord = records.find((record) => record.stage === 'check-out');
  const returnRecord = records.find((record) => record.stage === 'return');

  return (
    <div className="photo-columns">
      <section className="photo-column">
        <h2>Check-out</h2>
        <RecordSummary record={checkoutRecord} empty="No check-out condition record." />
        <PhotoList photos={checkout} empty="No check-out photo." />
      </section>
      <section className="photo-column">
        <h2>Return</h2>
        <RecordSummary record={returnRecord} empty="No return condition record." />
        <PhotoList photos={returned} empty="No return photo." />
      </section>
      <section className="photo-column">
        <h2>Bench</h2>
        {findings.length === 0 ? (
          <p className="muted">No bench finding.</p>
        ) : (
          findings.map((finding) => (
            <div key={finding.id} className="bench-finding">
              <p>{finding.note}</p>
              <p className="muted">
                {finding.loggedBy}, {formatDateTime(finding.loggedAt)}
              </p>
              <PhotoList
                photos={photos.filter(
                  (photo) => photo.findingId === finding.id || finding.photoIds.includes(photo.id),
                )}
                empty="No bench photo."
              />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
