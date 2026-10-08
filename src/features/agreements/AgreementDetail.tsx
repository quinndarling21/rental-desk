import { Link, useParams } from 'react-router';
import { StaffInitials } from '../../components/StaffInitials';
import { StatusBadge } from '../../components/StatusBadge';
import { agreementStatus, itemsOut } from '../../lib/agreements';
import { formatDate, todayISO } from '../../lib/dates';
import { findItem } from '../../lib/inventory';
import { useAgreements, useInventory } from '../../lib/store';

export function AgreementDetail() {
  const { raNumber } = useParams();
  const agreement = useAgreements().find((a) => a.raNumber === raNumber);
  const inventory = useInventory();

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

  return (
    <>
      <Link className="back-link" to="/agreements">
        Back to agreements
      </Link>

      <div className="page-header">
        <div>
          <p className="page-header__eyebrow mono">{agreement.raNumber}</p>
          <div className="page-header__title">
            <h1>{agreement.production}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="page-header__subtitle">{agreement.productionDetail}</p>
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
                <th>Returned</th>
                <th>Return condition</th>
                <th>Return notes</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
