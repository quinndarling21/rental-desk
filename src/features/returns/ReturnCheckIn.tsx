import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Banner } from '../../components/Banner';
import { ConditionSelect } from '../../components/ConditionSelect';
import { StatusBadge } from '../../components/StatusBadge';
import { agreementStatus, applyReturn, countItems, itemsOut } from '../../lib/agreements';
import { createDamageReports } from '../../lib/damageReports';
import { formatDate, todayISO } from '../../lib/dates';
import { findItem } from '../../lib/inventory';
import { initialsProblem, staff } from '../../lib/staff';
import { saveReturn, useAgreements, useInventory } from '../../lib/store';
import type { Condition, ReturnRecord } from '../../types';

interface ReturnRow {
  returned: boolean;
  condition: Condition;
  notes: string;
}

const UNTOUCHED: ReturnRow = { returned: false, condition: 'OK', notes: '' };

export function ReturnCheckIn() {
  const { raNumber } = useParams();
  const agreement = useAgreements().find((a) => a.raNumber === raNumber);
  const inventory = useInventory();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Record<string, ReturnRow>>({});
  const [initials, setInitials] = useState('');
  const [attempted, setAttempted] = useState(false);

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
  const rowFor = (assetTag: string) => rows[assetTag] ?? UNTOUCHED;
  const marked = openLines.filter((line) => rowFor(line.assetTag).returned);
  const needsNote = marked
    .filter((line) => rowFor(line.assetTag).condition !== 'OK' && !rowFor(line.assetTag).notes.trim())
    .map((line) => line.assetTag);
  const initialsError = initialsProblem(staff, initials);

  const problems = [
    ...(marked.length === 0 ? ['Mark at least one item as returned.'] : []),
    ...needsNote.map((tag) => `Add a note for ${tag}: Damaged and Needs service returns need a description.`),
    ...(initialsError ? [initialsError] : []),
  ];
  const shownProblems = attempted ? problems : [];

  function updateRow(assetTag: string, change: Partial<ReturnRow>) {
    setRows({ ...rows, [assetTag]: { ...rowFor(assetTag), ...change } });
  }

  function markAllReturned() {
    setRows(Object.fromEntries(openLines.map((line) => [line.assetTag, { ...rowFor(line.assetTag), returned: true }])));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!agreement || problems.length > 0) return;

    const record: ReturnRecord = {
      raNumber: agreement.raNumber,
      returnedOn: todayISO(),
      receivedBy: initials.trim().toUpperCase(),
      lines: marked.map((line) => {
        const row = rowFor(line.assetTag);
        return { assetTag: line.assetTag, condition: row.condition, notes: row.notes.trim() };
      }),
    };
    const updated = applyReturn(agreement, record);
    const reports = createDamageReports(updated, record, staff);
    saveReturn(updated, record, reports);

    const notice = [`Return completed: ${countItems(record.lines.length)} checked in on ${updated.raNumber}.`];
    if (reports.length > 0) notice.push(`${countItems(reports.length)} flagged to ${reports[0].routedTo}.`);
    if (itemsOut(updated).length === 0) notice.push('All gear is back and the agreement is marked Returned.');
    navigate(`/agreements/${updated.raNumber}`, { state: { notice: notice.join(' ') } });
  }

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
          </p>
        </div>
      </div>

      {openLines.length === 0 ? (
        <section className="card empty-state">
          <p>Every item on this agreement has been returned.</p>
        </section>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
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
                    const noteMissing = attempted && needsNote.includes(line.assetTag);
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
          </section>

          <section className="card">
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
              <button type="submit" className="button button--primary">
                Complete return
              </button>
            </div>

            {shownProblems.length > 0 && (
              <Banner tone="error">
                <p>Return not completed:</p>
                <ul>
                  {shownProblems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </Banner>
            )}
          </section>
        </form>
      )}
    </>
  );
}
