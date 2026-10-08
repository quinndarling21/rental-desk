import { ConditionSelect } from '../../components/ConditionSelect';
import { PhotoCapture } from '../../components/PhotoCapture';
import { StampedPhoto } from '../../components/StampedPhoto';
import { StatusBadge } from '../../components/StatusBadge';
import type { PhotoView } from '../../lib/conditionStore';
import { checkOutNoteLabel, type CapturedPhoto } from '../../lib/photoCheckIn';
import type { AgreementLine, Condition } from '../../types';

export interface ReturnRow {
  returned: boolean;
  condition: Condition | '';
  notes: string;
  photos: CapturedPhoto[];
}

export function untouchedRow(photoCheckIn: boolean): ReturnRow {
  return { returned: false, condition: photoCheckIn ? '' : 'OK', notes: '', photos: [] };
}

export function ReturnLineCards({
  lines,
  itemName,
  rowFor,
  onRow,
  onAddPhoto,
  onRemovePhoto,
  checkoutPhotos,
  photosStatus,
  attempted,
}: {
  lines: AgreementLine[];
  itemName: (assetTag: string) => string;
  rowFor: (assetTag: string) => ReturnRow;
  onRow: (assetTag: string, change: Partial<ReturnRow>) => void;
  onAddPhoto: (assetTag: string, file: File) => void;
  onRemovePhoto: (assetTag: string, photoId: string) => void;
  checkoutPhotos: (line: AgreementLine) => PhotoView[];
  photosStatus: 'loading' | 'ready' | 'error';
  attempted: boolean;
}) {
  return (
    <ul className="return-lines">
      {lines.map((line) => {
        const row = rowFor(line.assetTag);
        const noteMissing = attempted && row.returned && row.condition !== '' && row.condition !== 'OK' && !row.notes.trim();
        const conditionMissing = attempted && row.returned && row.condition === '';
        const photoMissing = attempted && row.returned && row.photos.length === 0;
        const prior = checkoutPhotos(line);
        return (
          <li key={line.assetTag} className={row.returned ? 'return-line is-returned' : 'return-line'}>
            <div className="return-line__identity">
              <input
                type="checkbox"
                className="checkbox"
                aria-label={`Returned ${line.assetTag}`}
                checked={row.returned}
                onChange={(event) => onRow(line.assetTag, { returned: event.target.checked })}
              />
              <span className="mono">{line.assetTag}</span>
              <span>{itemName(line.assetTag)}</span>
              <StatusBadge status={line.conditionOut} />
            </div>
            <p className="return-line__note">
              <span className="muted">Check-out note: </span>
              {checkOutNoteLabel(line.conditionOutNote)}
            </p>
            <div className="return-line__condition">
              <ConditionSelect
                label={`Return condition for ${line.assetTag}`}
                value={row.condition}
                emptyLabel="Set condition"
                disabled={!row.returned}
                onChange={(condition) => onRow(line.assetTag, { condition })}
              />
              <div className="return-table__notes">
                <input
                  className="input"
                  aria-label={`Return notes for ${line.assetTag}`}
                  value={row.notes}
                  disabled={!row.returned}
                  aria-invalid={noteMissing}
                  onChange={(event) => onRow(line.assetTag, { notes: event.target.value })}
                />
                {noteMissing && <p className="field__error">Describe the damage or service needed.</p>}
                {conditionMissing && <p className="field__error">Set a return condition.</p>}
              </div>
            </div>
            <div className="photo-pair">
              <div>
                <h3>Check-out</h3>
                {photosStatus === 'loading' && <p className="muted">Loading check-out photos…</p>}
                {photosStatus === 'error' && <p className="field__error">Check-out photos saved in this browser could not be read.</p>}
                {photosStatus === 'ready' && prior.length === 0 && <p className="muted">No check-out photo on file.</p>}
                {photosStatus === 'ready' && prior.length > 0 && (
                  <ul className="photo-list">
                    {prior.map((photo) => (
                      <li key={photo.id}>
                        <StampedPhoto
                          src={photo.url}
                          alt={`Check-out photo of ${line.assetTag}`}
                          stamp={photo.stamp}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3>Return</h3>
                <PhotoCapture
                  label={`Return photo for ${line.assetTag}`}
                  photos={row.photos}
                  disabled={!row.returned}
                  onAdd={(file) => onAddPhoto(line.assetTag, file)}
                  onRemove={(id) => onRemovePhoto(line.assetTag, id)}
                />
                {photoMissing && <p className="field__error">Add a return photo.</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
