import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Banner } from '../../components/Banner';
import { PhotoCapture } from '../../components/PhotoCapture';
import { useCounter } from '../../layout/CounterContext';
import { buildBenchFinding } from '../../lib/conditionRecords';
import { getConditionStore } from '../../lib/conditionStore';
import { findItem } from '../../lib/inventory';
import {
  benchFindingProblems,
  createCapturedPhoto,
  lineAt,
  lineKey,
  photoCheckInActive,
  releaseCapturedPhoto,
  type CapturedPhoto,
} from '../../lib/photoCheckIn';
import { usePhotoCheckInPilot } from '../../lib/pilot';
import { useAgreements, useInventory } from '../../lib/store';

export function BenchFindingForm() {
  const { raNumber = '', lineIndex: lineIndexParam = '' } = useParams();
  const agreement = useAgreements().find((item) => item.raNumber === raNumber);
  const inventory = useInventory();
  const { signedIn } = useCounter();
  const pilot = usePhotoCheckInPilot();
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const lineIndex = Number(lineIndexParam);
  const line = lineAt(agreement.lines, lineIndex);
  const itemName = line ? (findItem(inventory, line.assetTag)?.name ?? 'Unknown item') : 'Unknown item';
  const photosOn = photoCheckInActive(agreement.location, pilot);
  const problems = benchFindingProblems(note, photos.length);
  const shown = attempted ? problems : [];

  function addPhoto(file: File) {
    setPhotos((current) => [...current, createCapturedPhoto(file, signedIn, new Date().toISOString())]);
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      if (photo) releaseCapturedPhoto(photo);
      return current.filter((item) => item.id !== id);
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!agreement || !line || problems.length > 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    const loggedAt = new Date().toISOString();
    const finding = buildBenchFinding({
      raNumber: agreement.raNumber,
      assetTag: line.assetTag,
      lineKey: lineKey(agreement.raNumber, line.assetTag, line.checkedOutOn, lineIndex),
      note,
      photoIds: photos.map((photo) => photo.id),
      loggedAt,
      loggedBy: signedIn.initials,
    });
    try {
      const store = getConditionStore();
      for (const photo of photos) {
        await store.savePhoto({
          id: photo.id,
          raNumber: agreement.raNumber,
          assetTag: line.assetTag,
          lineKey: finding.lineKey,
          stage: 'bench',
          stamp: photo.stamp,
          blob: photo.blob,
          findingId: finding.id,
        });
      }
      await store.saveBenchFinding(finding);
      navigate(`/agreements/${agreement.raNumber}/lines/${lineIndex}`, {
        state: { notice: `Bench finding saved on ${line.assetTag}.` },
      });
    } catch {
      setSaveError('Could not save the bench finding in this browser.');
      setSaving(false);
    }
  }

  return (
    <>
      <Link className="back-link" to={`/agreements/${agreement.raNumber}/lines/${lineIndex}`}>
        Back to photos
      </Link>
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow mono">{agreement.raNumber}</p>
          <h1>Bench finding</h1>
          <p className="page-header__subtitle">
            {line ? `${itemName}, ${line.assetTag}. ` : ''}
            Log damage found after return. This is not a damage charge.
          </p>
        </div>
      </div>

      {!line ? (
        <section className="card empty-state">
          <p>That line is not on this agreement.</p>
        </section>
      ) : !photosOn ? (
        <section className="card empty-state">
          <p>Photo check-in is off for {agreement.location}. Bench photos are part of the Burbank pilot.</p>
        </section>
      ) : !line.returned ? (
        <section className="card empty-state">
          <p>The bench logs a finding after the item is returned. {line.assetTag} is still out.</p>
        </section>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          <section className="card">
            <p className="field__help">
              Photos are stamped for {signedIn.name} with the date and time they are taken. Staff cannot edit the stamp.
            </p>
            <div className="field">
              <label className="field__label" htmlFor="bench-note">
                What the bench found
              </label>
              <textarea
                id="bench-note"
                className="textarea"
                rows={3}
                value={note}
                aria-invalid={attempted && !note.trim()}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <div className="field">
              <span className="field__label">Bench photo</span>
              <PhotoCapture
                label={`Bench photo for ${line.assetTag}`}
                photos={photos}
                onAdd={addPhoto}
                onRemove={removePhoto}
              />
              {attempted && photos.length === 0 && <p className="field__error">Add at least one bench photo.</p>}
            </div>
          </section>
          <section className="card">
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? 'Saving finding…' : 'Save bench finding'}
            </button>
            {(shown.length > 0 || saveError) && (
              <Banner tone="error">
                <p>Bench finding not saved:</p>
                <ul>
                  {shown.map((problem) => (
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
