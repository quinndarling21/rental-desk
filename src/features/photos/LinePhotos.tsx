import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { Banner } from '../../components/Banner';
import { useCounter } from '../../layout/CounterContext';
import { buildShareLink, shareUrl } from '../../lib/conditionRecords';
import { getConditionStore, useAgreementMedia } from '../../lib/conditionStore';
import { findItem } from '../../lib/inventory';
import { canShareConditionPhotos, lineAt, lineKey, photoCheckInActive } from '../../lib/photoCheckIn';
import { usePhotoCheckInPilot } from '../../lib/pilot';
import { useAgreements, useInventory } from '../../lib/store';
import { PhotoColumns } from './PhotoColumns';

function noticeFrom(state: unknown): string | null {
  if (state && typeof state === 'object' && 'notice' in state && typeof state.notice === 'string') {
    return state.notice;
  }
  return null;
}

export function LinePhotos() {
  const { raNumber = '', lineIndex: lineIndexParam = '' } = useParams();
  const notice = noticeFrom(useLocation().state);
  const agreement = useAgreements().find((item) => item.raNumber === raNumber);
  const inventory = useInventory();
  const { signedIn } = useCounter();
  const pilot = usePhotoCheckInPilot();
  const { media, error } = useAgreementMedia(raNumber);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

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
  if (!line) {
    return (
      <section className="empty-state">
        <h1>That line is not on {agreement.raNumber}</h1>
        <p>
          <Link to={`/agreements/${agreement.raNumber}`}>Back to {agreement.raNumber}</Link>
        </p>
      </section>
    );
  }

  const open = agreement;
  const currentLine = line;
  const key = lineKey(open.raNumber, currentLine.assetTag, currentLine.checkedOutOn, lineIndex);
  const itemName = findItem(inventory, currentLine.assetTag)?.name ?? 'Unknown item';
  const photosOn = photoCheckInActive(agreement.location, pilot);
  const photos = (media?.photos ?? []).filter((photo) => photo.lineKey === key);
  const records = (media?.records ?? []).filter((record) => record.lineKey === key);
  const findings = (media?.findings ?? []).filter((finding) => finding.lineKey === key);
  const canShare = canShareConditionPhotos(signedIn.role);

  async function share() {
    setShareError(null);
    try {
      const link = buildShareLink({
        raNumber: open.raNumber,
        assetTag: currentLine.assetTag,
        lineKey: key,
        itemName,
        production: open.production,
        createdAt: new Date().toISOString(),
      });
      await getConditionStore().saveShare(link);
      setShareLink(shareUrl(link.token));
      setCopied(false);
    } catch {
      setShareError('Could not create a share link in this browser.');
    }
  }

  async function copyLink() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <Link className="back-link" to={`/agreements/${agreement.raNumber}`}>
        Back to {agreement.raNumber}
      </Link>
      {notice && (
        <Banner tone="success">
          <p>{notice}</p>
        </Banner>
      )}
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow mono">{agreement.raNumber}</p>
          <h1>{itemName}</h1>
          <p className="page-header__subtitle">
            {line.assetTag}, {agreement.production}. Check-out, return, and bench photos for this line.
          </p>
        </div>
        {photosOn && line.returned && (
          <div className="page-header__actions">
            <Link className="button" to={`/agreements/${agreement.raNumber}/lines/${lineIndex}/bench`}>
              Log bench finding
            </Link>
          </div>
        )}
      </div>

      {error && <p className="field__error">{error}</p>}
      {media === null && !error ? <p className="muted">Loading photos…</p> : null}

      <section className="card">
        <PhotoColumns photos={photos} records={records} findings={findings} />
      </section>

      <section className="card">
        <h2>Share with the customer</h2>
        <p className="field__help">
          Placeholder. This is a read-only link to this line only. It does not expire, it is not emailed, and it only
          opens in this browser until photos are stored in a backend.
        </p>
        {canShare ? (
          <div className="share-row">
            <button type="button" className="button button--primary" onClick={() => void share()}>
              Create share link
            </button>
            {shareLink && (
              <>
                <input className="input" readOnly value={shareLink} aria-label="Share link" />
                <button type="button" className="button" onClick={() => void copyLink()}>
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </>
            )}
          </div>
        ) : (
          <p>A counter lead can share this view. Signed in as {signedIn.name}, {signedIn.role.toLowerCase()}.</p>
        )}
        {shareError && <p className="field__error">{shareError}</p>}
      </section>
    </>
  );
}
