export function CustomerAcknowledgment({
  name,
  acknowledged,
  onName,
  onAcknowledged,
}: {
  name: string;
  acknowledged: boolean;
  onName: (name: string) => void;
  onAcknowledged: (acknowledged: boolean) => void;
}) {
  return (
    <fieldset className="ack">
      <legend>Customer acknowledgment</legend>
      <p className="field__help">
        Placeholder. Signature, tap, or email is not decided yet. The customer types their name and confirms this
        condition record. This replaces the paper slip for the Burbank pilot.
      </p>
      <div className="field field--narrow">
        <label className="field__label" htmlFor="ack-name">
          Customer name
        </label>
        <input
          id="ack-name"
          className="input"
          value={name}
          autoComplete="off"
          onChange={(event) => onName(event.target.value)}
        />
      </div>
      <label className="ack__confirm">
        <input
          type="checkbox"
          className="checkbox"
          checked={acknowledged}
          onChange={(event) => onAcknowledged(event.target.checked)}
        />
        Customer acknowledges this condition record
      </label>
    </fieldset>
  );
}
