import type { CapturedPhoto } from '../lib/photoCheckIn';
import { StampedPhoto } from './StampedPhoto';

export function PhotoCapture({
  label,
  photos,
  disabled = false,
  onAdd,
  onRemove,
}: {
  label: string;
  photos: CapturedPhoto[];
  disabled?: boolean;
  onAdd: (file: File) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="photo-capture">
      {photos.length > 0 && (
        <ul className="photo-list">
          {photos.map((photo) => (
            <li key={photo.id}>
              <StampedPhoto src={photo.previewUrl} alt={label} stamp={photo.stamp} />
              <button type="button" className="button button--link" onClick={() => onRemove(photo.id)}>
                Remove photo
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className={`button button--small${disabled ? ' is-disabled' : ''}`}>
        {photos.length === 0 ? 'Take photo' : 'Add another photo'}
        <input
          className="visually-hidden"
          type="file"
          accept="image/*"
          capture="environment"
          aria-label={label}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onAdd(file);
            event.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
