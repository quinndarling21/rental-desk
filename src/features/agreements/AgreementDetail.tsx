import { Link, useLocation, useParams } from 'react-router';
import { Banner } from '../../components/Banner';
import { StaffInitials } from '../../components/StaffInitials';
import { StatusBadge } from '../../components/StatusBadge';
import { agreementStatus, itemsOut } from '../../lib/agreements';
import { formatDate, todayISO } from '../../lib/dates';
import { findItem } from '../../lib/inventory';
import { checkOutNoteLabel, photoCheckInActive } from '../../lib/photoCheckIn';
import { usePhotoCheckInPilot } from '../../lib/pilot';
import { useAgreements, useDamageReports, useInventory } from '../../lib/store';

/** Check-out and return pass a confirmation message along in the navigation state. */
function noticeFrom(state: unknown): string | null {
  if (state && typeof state === 'object' && 'notice' in state && typeof state.notice === 'string') {
    return state.notice;
  }
  return null;
}

export function AgreementDetail() {
  const { raNumber } = useParams();
  const notice = noticeFrom(useLocation().state);
  const pilotEnabled = usePhotoCheckInPilot();
  const agreement = useAgreements().find((a) => a.raNumber === raNumber);
  const inventory = useInventory();
  const damageReports = useDamageReports(raNumber ?? '');

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

  const status = agreementStatus(agreement, todayISO());
  const outCount = itemsOut(agreement).length;
  const photosOn = photoCheckInActive(agreement.location, pilotEnabled);

  return (
    <>
      <Link className="back-link" to="/agreements">
        Back to agreements
      </Link>

      {notice && (
        <Banner tone="success">
          <p>{notice}</p>
        </Banner>
      )}

      <div className="page-header">
        <div>
          <p className="page-header__eyebrow mono">{agreement.raNumber}</p>
          <div className="page-header__title">
            <h1>{agreement.production}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="page-header__subtitle">{agreement.productionDetail}</p>
        </div>
        <div className="page-header__actions">
          <Link className="button" to={`/checkout?ra=${agreement.raNumber}`}>
            Check out more items
          </Link>
          {outCount > 0 && (
            <Link className="button button--primary" to={`/agreements/${agreement.raNumber}/return`}>
              Return check-in
            </Link>
          )}
        </div>
      </div>

      <section className="card">
        <dl className="summary">
          <div>
            <dt>Production coordinator</dt>
            <dd>
              {agreement.contact.name || 'Not on file'}
              {agreement.contact.phone && (
                <>
                  <br />
                  <a href={`tel:${agreement.contact.phone}`}>{agreement.contact.phone}</a>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{agreement.location}</dd>
          </div>
          <div>
            <dt>Checked out by</dt>
            <dd>
              <StaffInitials initials={agreement.checkedOutBy} withName />
            </dd>
          </div>
          <div>
            <dt>Checked out</dt>
            <dd>{formatDate(agreement.checkedOutOn)}</dd>
          </div>
          <div>
            <dt>Due back</dt>
            <dd>{formatDate(agreement.dueBack)}</dd>
          </div>
          <div>
            <dt>Items out</dt>
            <dd>
              {outCount} of {agreement.lines.length}
            </dd>
          </div>
        </dl>
      </section>

      {damageReports.length > 0 && (
        <section className="card card--flush card--flagged">
          <div className="card__header">
            <h2>Damage flags</h2>
            <span className="muted">
              {photosOn
                ? 'Counter lead reviews the condition record. A damage charge is still opened outside Rental Desk.'
                : 'Counter lead reviews the return slip and opens any damage charge.'}
            </span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset tag</th>
                  <th>Item</th>
                  <th>Condition</th>
                  <th>Notes</th>
                  <th>Returned</th>
                  <th>Routing</th>
                </tr>
              </thead>
              <tbody>
                {damageReports.map((report) => (
                  <tr key={report.id}>
                    <td className="mono">{report.assetTag}</td>
                    <td>{findItem(inventory, report.assetTag)?.name ?? 'Unknown item'}</td>
                    <td>
                      <StatusBadge status={report.condition} />
                    </td>
                    <td className="notes">{report.notes}</td>
                    <td>
                      <div>{formatDate(report.reportedOn)}</div>
                      <div className="cell-sub">
                        <StaffInitials initials={report.reportedBy} />
                      </div>
                    </td>
                    <td className="flagged-to">Flagged to {report.routedTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card card--flush">
        <div className="card__header">
          <h2>Items</h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Asset tag</th>
                <th>Item</th>
                <th>Out</th>
                <th>Condition out</th>
                <th>Check-out note</th>
                <th>Returned</th>
                <th>Return condition</th>
                <th>Return notes</th>
                {photosOn && <th>Photos</th>}
              </tr>
            </thead>
            <tbody>
              {agreement.lines.map((line, index) => (
                <tr key={`${line.assetTag}-${index}`}>
                  <td className="mono">{line.assetTag}</td>
                  <td>{findItem(inventory, line.assetTag)?.name ?? 'Unknown item'}</td>
                  <td>
                    <div>{formatDate(line.checkedOutOn)}</div>
                    <div className="cell-sub">
                      <StaffInitials initials={line.checkedOutBy} />
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={line.conditionOut} />
                  </td>
                  <td className="notes">{line.conditionOutNote !== undefined ? checkOutNoteLabel(line.conditionOutNote) : null}</td>
                  <td>
                    {line.returned ? (
                      <>
                        <div>Yes{line.returnedOn && `, ${formatDate(line.returnedOn)}`}</div>
                        {line.returnedBy && (
                          <div className="cell-sub">
                            <StaffInitials initials={line.returnedBy} />
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="muted">No</span>
                    )}
                  </td>
                  <td>{line.returnCondition ? <StatusBadge status={line.returnCondition} /> : null}</td>
                  <td className="notes">{line.returnNotes}</td>
                  {photosOn && (
                    <td>
                      <Link to={`/agreements/${agreement.raNumber}/lines/${index}`}>Photos</Link>
                      {line.returned && (
                        <>
                          {' · '}
                          <Link to={`/agreements/${agreement.raNumber}/lines/${index}/bench`}>Bench finding</Link>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
