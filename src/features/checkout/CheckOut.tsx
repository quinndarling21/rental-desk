import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Banner } from '../../components/Banner';
import { ConditionSelect } from '../../components/ConditionSelect';
import { useCounter } from '../../layout/CounterContext';
import {
  addCheckOutLines,
  agreementStatus,
  countItems,
  itemsOut,
  nextRaNumber,
  openAgreement,
  type CheckOutItem,
} from '../../lib/agreements';
import { formatDate, todayISO } from '../../lib/dates';
import { availableAt, checkOutProblem, findItem, formatDailyRate } from '../../lib/inventory';
import { isLocation, LOCATIONS } from '../../lib/locations';
import { initialsProblem, staff } from '../../lib/staff';
import { saveCheckOut, useAgreements, useInventory } from '../../lib/store';
import type { InventoryItem, Location } from '../../types';
import { AvailableItems } from './AvailableItems';

type AgreementMode = 'existing' | 'new';

interface NewAgreementForm {
  production: string;
  productionDetail: string;
  contactName: string;
  contactPhone: string;
  location: Location;
  dueBack: string;
}

type FormErrors = Partial<Record<'agreement' | 'production' | 'dueBack' | 'items' | 'initials', string>>;

export function CheckOut() {
  const { location: counterLocation } = useCounter();
  const agreements = useAgreements();
  const inventory = useInventory();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const today = todayISO();

  const openAgreements = agreements.filter((agreement) => agreementStatus(agreement, today) !== 'Returned');
  const requestedRa = params.get('ra') ?? '';

  const [mode, setMode] = useState<AgreementMode>(requestedRa ? 'existing' : 'new');
  const [raNumber, setRaNumber] = useState(requestedRa);
  const [draft, setDraft] = useState<NewAgreementForm>({
    production: '',
    productionDetail: '',
    contactName: '',
    contactPhone: '',
    location: counterLocation,
    dueBack: '',
  });
  const [items, setItems] = useState<CheckOutItem[]>([]);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [initials, setInitials] = useState('');
  const [attempted, setAttempted] = useState(false);

  const selected = openAgreements.find((agreement) => agreement.raNumber === raNumber);
  const location = locationOf(mode, raNumber, draft);
  const available = location
    ? availableAt(inventory, location).filter((item) => !items.some((added) => added.assetTag === item.assetTag))
    : [];
  const dailyTotal = items.reduce((sum, added) => sum + (findItem(inventory, added.assetTag)?.dailyRate ?? 0), 0);

  function locationOf(nextMode: AgreementMode, nextRa: string, nextDraft: NewAgreementForm): Location | undefined {
    if (nextMode === 'new') return nextDraft.location;
    return openAgreements.find((agreement) => agreement.raNumber === nextRa)?.location;
  }

  // Gear goes out from one location, so moving the check-out elsewhere starts the item list over.
  function chooseAgreement(nextMode: AgreementMode, nextRa: string, nextDraft: NewAgreementForm) {
    if (locationOf(nextMode, nextRa, nextDraft) !== location) {
      setItems([]);
      setCodeError(null);
    }
    setMode(nextMode);
    setRaNumber(nextRa);
    setDraft(nextDraft);
  }

  function itemProblem(item: InventoryItem): string | null {
    if (!location) return 'Choose an agreement before adding items.';
    if (items.some((added) => added.assetTag === item.assetTag)) return `${item.assetTag} is already on this check-out.`;
    return checkOutProblem(item, location);
  }

  function addItem(item: InventoryItem) {
    const problem = itemProblem(item);
    setCodeError(problem);
    if (problem) return;
    setItems([...items, { assetTag: item.assetTag, condition: 'OK' }]);
    setCode('');
  }

  function addByCode() {
    const item = findItem(inventory, code);
    if (item) addItem(item);
    else setCodeError(code.trim() ? `No item found for ${code.trim()}.` : 'Enter an asset tag or scan a barcode.');
  }

  function handleCodeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Barcode scanners send Enter after the code; add the item instead of submitting the form.
    if (event.key === 'Enter') {
      event.preventDefault();
      addByCode();
    }
  }

  function validate(): FormErrors {
    const found: FormErrors = {};
    if (mode === 'existing' && !selected) found.agreement = 'Choose an agreement.';
    if (mode === 'new' && !draft.production.trim()) found.production = 'Enter the production name.';
    if (mode === 'new' && !draft.dueBack) found.dueBack = 'Choose a due back date.';
    else if (mode === 'new' && draft.dueBack < today) found.dueBack = 'Due back date cannot be in the past.';
    if (items.length === 0) found.items = 'Add at least one item.';
    const initialsError = initialsProblem(staff, initials);
    if (initialsError) found.initials = initialsError;
    return found;
  }

  const errors = attempted ? validate() : {};
  const errorMessages = Object.values(errors);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (Object.keys(validate()).length > 0) return;

    const staffInitials = initials.trim().toUpperCase();
    const agreement =
      mode === 'existing'
        ? selected
        : openAgreement(
            {
              production: draft.production.trim(),
              productionDetail: draft.productionDetail.trim(),
              contact: { name: draft.contactName.trim(), phone: draft.contactPhone.trim() },
              location: draft.location,
              dueBack: draft.dueBack,
            },
            nextRaNumber(agreements),
            staffInitials,
            today,
          );
    if (!agreement) return;

    const updated = addCheckOutLines(agreement, items, staffInitials, today);
    saveCheckOut(updated, items.map((added) => added.assetTag));

    navigate(`/agreements/${updated.raNumber}`, {
      state: { notice: `Checked out ${countItems(items.length)} to ${updated.production} on ${updated.raNumber}.` },
    });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Check out</h1>
          <p className="page-header__subtitle">Put gear out on a rental agreement.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <section className="card">
          <div className="card__header">
            <h2>Agreement</h2>
          </div>

          <div className="segmented" role="radiogroup" aria-label="Agreement">
            <label className={mode === 'existing' ? 'is-selected' : undefined}>
              <input
                type="radio"
                name="agreement-mode"
                checked={mode === 'existing'}
                onChange={() => chooseAgreement('existing', raNumber, draft)}
              />
              Existing agreement
            </label>
            <label className={mode === 'new' ? 'is-selected' : undefined}>
              <input
                type="radio"
                name="agreement-mode"
                checked={mode === 'new'}
                onChange={() => chooseAgreement('new', raNumber, draft)}
              />
              New agreement
            </label>
          </div>

          {mode === 'existing' ? (
            <div className="field field--narrow">
              <label className="field__label" htmlFor="checkout-ra">
                Rental agreement
              </label>
              <select
                id="checkout-ra"
                className="select"
                value={raNumber}
                aria-invalid={Boolean(errors.agreement)}
                onChange={(event) => chooseAgreement('existing', event.target.value, draft)}
              >
                <option value="">Choose an open agreement</option>
                {openAgreements.map((agreement) => (
                  <option key={agreement.raNumber} value={agreement.raNumber}>
                    {agreement.raNumber}, {agreement.production} ({agreement.location})
                  </option>
                ))}
              </select>
              {selected && (
                <p className="field__help">
                  {selected.location}, due back {formatDate(selected.dueBack)}, {itemsOut(selected).length} items out
                  now.
                </p>
              )}
            </div>
          ) : (
            <div className="form-row">
              <div className="field">
                <label className="field__label" htmlFor="checkout-production">
                  Production
                </label>
                <input
                  id="checkout-production"
                  className="input"
                  value={draft.production}
                  aria-invalid={Boolean(errors.production)}
                  onChange={(event) => setDraft({ ...draft, production: event.target.value })}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="checkout-detail">
                  Production detail
                </label>
                <input
                  id="checkout-detail"
                  className="input"
                  value={draft.productionDetail}
                  aria-describedby="checkout-detail-help"
                  onChange={(event) => setDraft({ ...draft, productionDetail: event.target.value })}
                />
                <p id="checkout-detail-help" className="field__help">
                  Season, pilot, feature or commercial client.
                </p>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="checkout-location">
                  Location
                </label>
                <select
                  id="checkout-location"
                  className="select"
                  value={draft.location}
                  onChange={(event) => {
                    if (isLocation(event.target.value)) {
                      chooseAgreement('new', raNumber, { ...draft, location: event.target.value });
                    }
                  }}
                >
                  {LOCATIONS.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="checkout-due">
                  Due back
                </label>
                <input
                  id="checkout-due"
                  className="input"
                  type="date"
                  min={today}
                  value={draft.dueBack}
                  aria-invalid={Boolean(errors.dueBack)}
                  onChange={(event) => setDraft({ ...draft, dueBack: event.target.value })}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="checkout-contact">
                  Production coordinator
                </label>
                <input
                  id="checkout-contact"
                  className="input"
                  value={draft.contactName}
                  onChange={(event) => setDraft({ ...draft, contactName: event.target.value })}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="checkout-phone">
                  Coordinator phone
                </label>
                <input
                  id="checkout-phone"
                  className="input"
                  type="tel"
                  value={draft.contactPhone}
                  onChange={(event) => setDraft({ ...draft, contactPhone: event.target.value })}
                />
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card__header">
            <h2>Items</h2>
            {items.length > 0 && (
              <span className="muted">
                {countItems(items.length)}, {formatDailyRate(dailyTotal)}
              </span>
            )}
          </div>

          <div className="field field--narrow">
            <label className="field__label" htmlFor="checkout-code">
              Asset tag or barcode
            </label>
            <div className="scan-row">
              <input
                id="checkout-code"
                className="input mono"
                value={code}
                autoComplete="off"
                aria-invalid={Boolean(codeError)}
                aria-describedby="checkout-code-message"
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={handleCodeKeyDown}
              />
              <button type="button" className="button" onClick={addByCode}>
                Add item
              </button>
            </div>
            <p id="checkout-code-message" className={codeError ? 'field__error' : 'field__help'}>
              {codeError ?? 'Scan the label barcode or type a tag such as BUR-LT-0142, then press Enter.'}
            </p>
          </div>

          {items.length === 0 ? (
            <p className="muted items-empty">No items on this check-out yet.</p>
          ) : (
            <div className="table-wrap items-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset tag</th>
                    <th>Item</th>
                    <th className="numeric">Daily rate</th>
                    <th>Condition at check-out</th>
                    <th>
                      <span className="visually-hidden">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((added) => {
                    const item = findItem(inventory, added.assetTag);
                    return (
                      <tr key={added.assetTag}>
                        <td className="mono">{added.assetTag}</td>
                        <td>{item?.name}</td>
                        <td className="numeric">{item && formatDailyRate(item.dailyRate)}</td>
                        <td>
                          <ConditionSelect
                            label={`Condition at check-out for ${added.assetTag}`}
                            value={added.condition}
                            onChange={(condition) =>
                              setItems(items.map((i) => (i.assetTag === added.assetTag ? { ...i, condition } : i)))
                            }
                          />
                        </td>
                        <td className="numeric">
                          <button
                            type="button"
                            className="button button--link"
                            aria-label={`Remove ${added.assetTag}`}
                            onClick={() => setItems(items.filter((i) => i.assetTag !== added.assetTag))}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {location && <AvailableItems items={available} location={location} onAdd={addItem} />}
        </section>

        <section className="card">
          <div className="sign-off">
            <div className="field">
              <label className="field__label" htmlFor="checkout-initials">
                Counter staff initials
              </label>
              <input
                id="checkout-initials"
                className="input input--initials"
                value={initials}
                maxLength={3}
                autoComplete="off"
                aria-invalid={Boolean(errors.initials)}
                onChange={(event) => setInitials(event.target.value)}
              />
            </div>
            <button type="submit" className="button button--primary">
              Complete check-out
            </button>
          </div>

          {errorMessages.length > 0 && (
            <Banner tone="error">
              <p>Check-out not completed:</p>
              <ul>
                {errorMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </Banner>
          )}
        </section>
      </form>
    </>
  );
}
