import { useParams } from 'react-router';
import { useSharedLine } from '../../lib/conditionStore';
import { PhotoColumns } from './PhotoColumns';

/** Standalone read-only page. It is not inside the counter chrome. */
export function ShareView() {
  const { token = '' } = useParams();
  const { link, media, error, missing } = useSharedLine(token);

  return (
    <div className="share-page">
      <header className="share-page__header">
        <span className="wordmark">Northstar</span>
        <span>Condition photos</span>
      </header>

      <p className="share-disclaimer">
        Shared read-only view of one agreement line. Placeholder link: it does not expire, and it only works in the
        browser where the photos were saved. This page does not open the rest of Rental Desk.
      </p>

      {error && <p className="field__error">{error}</p>}
      {missing && (
        <section className="empty-state">
          <h1>This share link was not found in this browser</h1>
          <p>Photos are stored on the counter browser until a backend is in place. This page does not open the rest of Rental Desk.</p>
        </section>
      )}
      {!link && !missing && !error && <p className="muted">Loading photos…</p>}

      {link && media && (
        <>
          <div className="page-header">
            <div>
              <p className="page-header__eyebrow mono">
                {link.raNumber} · {link.assetTag}
              </p>
              <h1>{link.itemName}</h1>
              <p className="page-header__subtitle">{link.production}</p>
            </div>
          </div>
          <section className="card">
            <PhotoColumns photos={media.photos} records={media.records} findings={media.findings} />
          </section>
        </>
      )}
    </div>
  );
}
