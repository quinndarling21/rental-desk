import { Link, useNavigate, useSearchParams } from 'react-router';
import { StatusBadge } from '../../components/StatusBadge';
import { useCounter } from '../../layout/CounterContext';
import {
  AGREEMENT_STATUSES,
  agreementStatus,
  filterAgreements,
  isAgreementStatus,
  itemsOut,
  sortForCounter,
  type AgreementFilters,
} from '../../lib/agreements';
import { formatDate, todayISO } from '../../lib/dates';
import { isLocation, LOCATIONS } from '../../lib/locations';
import { useAgreements } from '../../lib/store';

type FilterParam = 'location' | 'status' | 'q';

export function AgreementsList() {
  const { location: counterLocation } = useCounter();
  const agreements = useAgreements();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = todayISO();

  // Filters live in the URL so they survive opening an agreement and coming back.
  const locationParam = params.get('location');
  const statusParam = params.get('status');
  const filters: AgreementFilters = {
    location: locationParam === 'All' || isLocation(locationParam) ? locationParam : counterLocation,
    status: isAgreementStatus(statusParam) ? statusParam : 'All',
    search: params.get('q') ?? '',
  };

  const rows = sortForCounter(filterAgreements(agreements, filters, today), today);

  function setFilter(name: FilterParam, value: string) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(name, value);
        else next.delete(name);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Agreements</h1>
          <p className="page-header__subtitle">Rental agreements with gear out to productions.</p>
        </div>
        <div className="page-header__actions">
          <Link className="button button--primary" to="/checkout">
            New check-out
          </Link>
        </div>
      </div>

      <div className="filters">
        <label className="field filters__search">
          <span className="field__label">Search RA or production</span>
          <input
            className="input"
            type="search"
            value={filters.search}
            onChange={(event) => setFilter('q', event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Location</span>
          <select
            className="select"
            value={filters.location}
            onChange={(event) => setFilter('location', event.target.value)}
          >
            <option value="All">All locations</option>
            {LOCATIONS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Status</span>
          <select className="select" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
            <option value="All">Any status</option>
            {AGREEMENT_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>

      <section className="card card--flush">
        <div className="card__header">
          <h2>Rental agreements</h2>
          <span className="muted">
            {rows.length} of {agreements.length} shown
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="empty-state">No agreements match these filters.</p>
        ) : (
          <div className="table-wrap">
            <table className="table table--clickable">
              <thead>
                <tr>
                  <th>RA number</th>
                  <th>Production</th>
                  <th>Location</th>
                  <th className="numeric">Items out</th>
                  <th>Checked out</th>
                  <th>Due back</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((agreement) => (
                  <tr key={agreement.raNumber} onClick={() => navigate(`/agreements/${agreement.raNumber}`)}>
                    <td>
                      <Link className="mono" to={`/agreements/${agreement.raNumber}`}>
                        {agreement.raNumber}
                      </Link>
                    </td>
                    <td>
                      <div className="cell-title">{agreement.production}</div>
                      <div className="muted cell-sub">{agreement.productionDetail}</div>
                    </td>
                    <td>{agreement.location}</td>
                    <td className="numeric">{itemsOut(agreement).length}</td>
                    <td>{formatDate(agreement.checkedOutOn)}</td>
                    <td>{formatDate(agreement.dueBack)}</td>
                    <td>
                      <StatusBadge status={agreementStatus(agreement, today)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
