import type { PhotoStamp } from '../types';
import { formatStamp } from '../lib/photoCheckIn';

/** Read-only stamp. There is no control here that can change the date, time, or staff. */
export function StampedPhoto({ src, alt, stamp }: { src: string; alt: string; stamp: PhotoStamp }) {
  return (
    <figure className="stamped-photo">
      <img src={src} alt={alt} />
      <figcaption>{formatStamp(stamp)}</figcaption>
    </figure>
  );
}
