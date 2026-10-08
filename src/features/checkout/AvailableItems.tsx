import { formatDailyRate } from '../../lib/inventory';
import type { InventoryItem, Location } from '../../types';

interface AvailableItemsProps {
  items: InventoryItem[];
  location: Location;
  onAdd: (item: InventoryItem) => void;
}

export function AvailableItems({ items, location, onAdd }: AvailableItemsProps) {
  return (
    <div className="available">
      <h3 className="available__title">Available at {location}</h3>
      {items.length === 0 ? (
        <p className="muted">Nothing else is available at {location} right now.</p>
      ) : (
        <table className="table table--compact">
          <tbody>
            {items.map((item) => (
              <tr key={item.assetTag}>
                <td className="mono">{item.assetTag}</td>
                <td>{item.name}</td>
                <td className="muted">{item.category}</td>
                <td className="numeric muted">{formatDailyRate(item.dailyRate)}</td>
                <td className="numeric">
                  <button
                    type="button"
                    className="button button--small"
                    aria-label={`Add ${item.assetTag} ${item.name}`}
                    onClick={() => onAdd(item)}
                  >
                    Add
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
