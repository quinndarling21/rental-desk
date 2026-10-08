import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Banner } from '../../components/Banner';
import { ConditionSelect } from '../../components/ConditionSelect';
import { CustomerAcknowledgment } from '../../components/CustomerAcknowledgment';
import { StatusBadge } from '../../components/StatusBadge';
import { useCounter } from '../../layout/CounterContext';
import { agreementStatus, applyReturn, countItems, itemsOut } from '../../lib/agreements';
import { buildConditionRecord } from '../../lib/conditionRecords';
import { getConditionStore, useAgreementMedia } from '../../lib/conditionStore';
import { createDamageReports } from '../../lib/damageReports';
import { formatDate, todayISO } from '../../lib/dates';
import { findItem } from '../../lib/inventory';
import {
  acknowledgmentProblem,
  checkOutNoteLabel,
  createCapturedPhoto,
  lineKey,
  photoCheckInActive,
  releaseCapturedPhoto,
  returnPhotoProblems,
} from '../../lib/photoCheckIn';
import { usePhotoCheckInPilot } from '../../lib/pilot';
import { initialsProblem, staff } from '../../lib/staff';
import { saveReturn, useAgreements, useInventory } from '../../lib/store';
import type { Condition, ReturnRecord } from '../../types';
import { ReturnLineCards, untouchedRow, type ReturnRow } from './ReturnLineCards';

export function ReturnCheckIn() {
  const { raNumber = '' } = useParams();
  const agreement = useAgreements().find((a) => a.raNumber === raNumber);
  const inventory = useInventory();
  const { signedIn } = useCounter();
  const pilotEnabled = usePhotoCheckInPilot();
  const { media, error: photoError } = useAgreementMedia(raNumber);
  const navigate = useNavigate();
  const [rows, setRows] = useState<Record<string, ReturnRow>>({});
  const [initials, setInitials] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const photoCheckIn = agreement ? photoCheckInActive(agreement.location, pilotEnabled) : false;

  if (!agreement) {
    return (
      <section className="empty-state">
        <h1>Agreement {raNumber} was not found</h1>
        <p>
          <Link to="/agreements">Back to agreements</Link>
        </p>
      </section>
    );
  }

  const openLines = itemsOut(agreement);
  const alreadyBack = agreement.lines.length - openLines.length;
  const rowFor = (assetTag: string) => rows[assetTag] ?? untouchedRow(photoCheckIn);
  const marked = openLines.filter((line) => rowFor(line.assetTag).returned);
  const initialsError = initialsProblem(staff, initials);
  const problems = returnPhotoProblems(
    openLines.map((line) => {
      const row = rowFor(line.assetTag);
      return {
        assetTag: line.assetTag,
        returned: row.returned,
        condition: row.condition,
        notes: row.notes,
        photoCount: row.photos.length,
      };
    }),
    initialsError,
    photoCheckIn,
  );
  const ackError = acknowledgmentProblem(customerName, acknowledged, photoCheckIn);
  const shownProblems = attempted ? [...problems, ...(ackError ? [ackError] : [])] : [];

  function updateRow(assetTag: string, change: Partial<ReturnRow>) {
    setRows((current) => {
      const base = current[assetTag] ?? untouchedRow(photoCheckIn);
      return { ...current, [assetTag]: { ...base, ...change } };
    });
  }

  function markAllReturned() {
    setRows((current) =>
      Object.fromEntries(
        openLines.map((line) => {
          const base = current[line.assetTag] ?? untouchedRow(photoCheckIn);
          return [line.assetTag, { ...base, returned: true }];
        }),
      ),
    );
  }

  function addPhoto(assetTag: string, file: File) {
    const photo = createCapturedPhoto(file, signedIn, new Date().toISOString());
    setRows((current) => {
      const base = current[assetTag] ?? untouchedRow(photoCheckIn);
      return { ...current, [assetTag]: { ...base, photos: [...base.photos, photo] } };
    });
  }

  function removePhoto(assetTag: string, photoId: string) {
    setRows((current) => {
      const base = current[assetTag] ?? untouchedRow(photoCheckIn);
      const photo = base.photos.find((item) => item.id === photoId);
      if (photo) releaseCapturedPhoto(photo);
      return { ...current, [assetTag]: { ...base, photos: base.photos.filter((item) => item.id !== photoId) } };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!agreement || problems.length > 0 || ackError || saving) return;
    setSaving(true);
    setSaveError(null);

    const receivedBy = initials.trim().toUpperCase();
    const record: ReturnRecord = {
      raNumber: agreement.raNumber,
      returnedOn: todayISO(),
      receivedBy,
      lines: marked.map((line) => {
        const row = rowFor(line.assetTag);
        return { assetTag: line.assetTag, condition: row.condition as Condition, notes: row.notes.trim() };
      }),
    };

    try {
      if (photoCheckIn) {
        const store = getConditionStore();
        const recordedAt = new Date().toISOString();
        const acknowledgment = {
          customerName: customerName.trim(),
          acknowledgedAt: recordedAt,
          method: 'tap-name-placeholder' as const,
        };
        for (const line of marked) {
          const row = rowFor(line.assetTag);
          const key = lineKey(agreement.raNumber, line.assetTag, line.checkedOutOn);
          for (const photo of row.photos) {
            await store.savePhoto({
              id: photo.id,
              raNumber: agreement.raNumber,
              assetTag: line.assetTag,
              lineKey: key,
              stage: 'return',
              stamp: photo.stamp,
              blob: photo.blob,
            });
          }
          if (row.condition === '') continue;
          await store.saveConditionRecord(
            buildConditionRecord({
              raNumber: agreement.raNumber,
              assetTag: line.assetTag,
              lineKey: key,
              stage: 'return',
              condition: row.condition,
              note: row.notes,
              photoIds: row.photos.map((photo) => photo.id),
              recordedAt,
              recordedBy: receivedBy,
              acknowledgment,
            }),
          );
        }
      }

      const updated = applyReturn(agreement, record);
      const reports = createDamageReports(updated, record, staff);
      saveReturn(updated, record, reports);

      const notice = [`Return completed: ${countItems(record.lines.length)} checked in on ${updated.raNumber}.`];
      if (reports.length > 0) notice.push(`${countItems(reports.length)} flagged to ${reports[0].routedTo}.`);
      if (itemsOut(updated).length === 0) notice.push('All gear is back and the agreement is marked Returned.');
      navigate(`/agreements/${updated.raNumber}`, { state: { notice: notice.join(' ') } });
    } catch {
      setSaveError('Could not save return photos in this browser. The return was not completed.');
      setSaving(false);
    }
  }

  const photosStatus = photoError ? 'error' : media ? 'ready' : 'loading';

  return (
    <>
      <Link className="back-link" to={`/agreements/${agreement.raNumber}`}>
        Back to {agreement.raNumber}
      </Link>

      <div className="page-header">
        <div>
          <p className="page-header__eyebrow mono">{agreement.raNumber}</p>
          <div className="page-header__title">
            <h1>Return check-in</h1>
            <StatusBadge status={agreementStatus(agreement, todayISO())} />
          </div>
          <p className="page-header__subtitle">
            {agreement.production}, {agreement.productionDetail}. {agreement.location}, due back{' '}
            {formatDate(agreement.dueBack)}.
            {photoCheckIn && ' Photo check-in is on: each returned item needs a condition and a counter photo.'}
          </p>
        </div>
      </div>

      {openLines.length === 0 ? (
        <section className="card empty-state">
          <p>Every item on this agreement has been returned.</p>
        </section>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          <section className="card card--flush">
            <div className="card__header">
              <h2>Items out ({openLines.length})</h2>
              <div className="card__header-actions">
                {alreadyBack > 0 && <span className="muted">{countItems(alreadyBack)} already returned</span>}
                <button type="button" className="button button--small" onClick={markAllReturned}>
                  Mark all returned
                </button>
              </div>
            </div>
            {photoCheckIn ? (
              <>
                <p className="photo-checkin-note">
                  Photos are stamped for {signedIn.name} with the date and time they are taken. Staff cannot edit the
                  stamp. Mark all returned does not set the condition or take photos.
                </p>
                <ReturnLineCards
                  lines={openLines}
                  itemName={(assetTag) => findItem(inventory, assetTag)?.name ?? 'Unknown item'}
                  rowFor={rowFor}
                  onRow={updateRow}
                  onAddPhoto={addPhoto}
                  onRemovePhoto={removePhoto}
                  checkoutPhotos={(line) => {
                    const key = lineKey(agreement.raNumber, line.assetTag, line.checkedOutOn);
                    return (media?.photos ?? []).filter((photo) => photo.lineKey === key && photo.stage === 'check-out');
                  }}
                  photosStatus={photosStatus}
                  attempted={attempted}
                />
              </>
            ) : (
              <div className="table-wrap">
                <table className="table return-table">
                  <thead>
                    <tr>
                      <th>Returned</th>
                      <th>Asset tag</th>
                      <th>Item</th>
                      <th>Condition out</th>
                      <th>Return condition</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openLines.map((line) => {
                      const row = rowFor(line.assetTag);
                      const noteMissing =
                        attempted && row.returned && row.condition !== '' && row.condition !== 'OK' && !row.notes.trim();
                      return (
                        <tr key={line.assetTag} className={row.returned ? 'is-returned' : undefined}>
                          <td>
                            <input
                              type="checkbox"
                              className="checkbox"
                              aria-label={`Returned ${line.assetTag}`}
                              checked={row.returned}
                              onChange={(event) => updateRow(line.assetTag, { returned: event.target.checked })}
                            />
                          </td>
                          <td className="mono">{line.assetTag}</td>
                          <td>{findItem(inventory, line.assetTag)?.name ?? 'Unknown item'}</td>
                          <td>
                            <StatusBadge status={line.conditionOut} />
                            {line.conditionOutNote !== undefined && (
                              <div className="cell-sub">{checkOutNoteLabel(line.conditionOutNote)}</div>
                            )}
                          </td>
                          <td>
                            <ConditionSelect
                              label={`Return condition for ${line.assetTag}`}
                              value={row.condition}
                              disabled={!row.returned}
                              onChange={(condition) => updateRow(line.assetTag, { condition })}
                            />
                          </td>
                          <td className="return-table__notes">
                            <input
                              className="input"
                              aria-label={`Return notes for ${line.assetTag}`}
                              value={row.notes}
                              disabled={!row.returned}
                              aria-invalid={noteMissing}
                              onChange={(event) => updateRow(line.assetTag, { notes: event.target.value })}
                            />
                            {noteMissing && <p className="field__error">Describe the damage or service needed.</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            {photoCheckIn && (
              <CustomerAcknowledgment
                name={customerName}
                acknowledged={acknowledged}
                onName={setCustomerName}
                onAcknowledged={setAcknowledged}
              />
            )}
            <div className="sign-off">
              <div className="field">
                <label className="field__label" htmlFor="return-initials">
                  Counter staff initials
                </label>
                <input
                  id="return-initials"
                  className="input input--initials"
                  value={initials}
                  maxLength={3}
                  autoComplete="off"
                  aria-invalid={attempted && Boolean(initialsError)}
                  onChange={(event) => setInitials(event.target.value)}
                />
              </div>
              <button type="submit" className="button button--primary" disabled={saving}>
                {saving ? 'Saving return…' : 'Complete return'}
              </button>
            </div>

            {(shownProblems.length > 0 || saveError) && (
              <Banner tone="error">
                <p>Return not completed:</p>
                <ul>
                  {shownProblems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                  {saveError && <li>{saveError}</li>}
                </ul>
              </Banner>
            )}
          </section>
        </form>
      )}
    </>
  );
}
