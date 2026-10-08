import type { AgreementLine, Condition, PhotoStamp, StaffMember } from '../types';
import { formatDateTime } from './dates';

export const PHOTO_CHECKIN_PILOT_LOCATION = 'Burbank' as const;

/** The pilot switch only applies at Burbank. Other counters keep the current check-in. */
export function photoCheckInActive(location: string, pilotEnabled: boolean): boolean {
  return pilotEnabled && location === PHOTO_CHECKIN_PILOT_LOCATION;
}

/**
 * One checkout on an agreement. `checkedOutOn` is only a calendar day, so a later
 * checkout of the same asset — including later the same day — needs the line index.
 */
export function lineKey(raNumber: string, assetTag: string, checkedOutOn: string, lineIndex: number): string {
  return `${raNumber}:${assetTag}:${checkedOutOn}:${lineIndex}`;
}

/** The line a photo or bench route names. The same asset can be out again after it comes back. */
export function lineAt(lines: AgreementLine[], lineIndex: number): AgreementLine | undefined {
  if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= lines.length) return undefined;
  return lines[lineIndex];
}

/**
 * Photo check-in leaves the condition blank until someone sets it. Turning the pilot
 * off keeps that blank in the form; the other counters default it to OK.
 */
export function legacyReturnCondition(condition: Condition | '', photoCheckIn: boolean): Condition | '' {
  if (!photoCheckIn && condition === '') return 'OK';
  return condition;
}

export function checkOutNoteLabel(note: string | undefined): string {
  if (note === undefined) return 'No check-out note on file.';
  if (!note.trim()) return 'No wear noted at check-out.';
  return note;
}

export interface CapturedPhoto {
  id: string;
  blob: Blob;
  previewUrl: string;
  stamp: PhotoStamp;
}

export function captureStamp(staff: StaffMember, takenAt: string): PhotoStamp {
  return {
    takenAt,
    staffId: staff.id,
    staffName: staff.name,
    staffInitials: staff.initials,
  };
}

export function formatStamp(stamp: PhotoStamp): string {
  return `${formatDateTime(stamp.takenAt)} · ${stamp.staffName}`;
}

export function createCapturedPhoto(file: Blob, staff: StaffMember, takenAt: string): CapturedPhoto {
  return {
    id: crypto.randomUUID(),
    blob: file,
    previewUrl: URL.createObjectURL(file),
    stamp: captureStamp(staff, takenAt),
  };
}

/** The only stamp write is capture. A second write is rejected. */
export function editPhotoStamp(photoId: string): never {
  throw new Error(`Photo stamp for ${photoId} cannot be edited.`);
}

export function releaseCapturedPhoto(photo: CapturedPhoto) {
  URL.revokeObjectURL(photo.previewUrl);
}

export interface CheckOutPhotoLine {
  assetTag: string;
  photoCount: number;
}

export function checkOutPhotoProblems(items: CheckOutPhotoLine[], photoCheckIn: boolean): string[] {
  if (!photoCheckIn) return [];
  return items
    .filter((item) => item.photoCount < 1)
    .map((item) => `Add a check-out photo for ${item.assetTag}.`);
}

export interface ReturnPhotoLine {
  assetTag: string;
  returned: boolean;
  condition: Condition | '';
  notes: string;
  photoCount: number;
}

export function returnPhotoProblems(
  lines: ReturnPhotoLine[],
  initialsError: string | null,
  photoCheckIn: boolean,
): string[] {
  const marked = lines.filter((line) => line.returned);
  const problems: string[] = [];
  if (marked.length === 0) problems.push('Mark at least one item as returned.');
  for (const line of marked) {
    if (photoCheckIn && line.condition === '') {
      problems.push(`Set a return condition for ${line.assetTag}.`);
    }
    if (line.condition !== '' && line.condition !== 'OK' && !line.notes.trim()) {
      problems.push(`Add a note for ${line.assetTag}: Damaged and Needs service returns need a description.`);
    }
    if (photoCheckIn && line.photoCount < 1) {
      problems.push(`Add a return photo for ${line.assetTag}.`);
    }
  }
  if (initialsError) problems.push(initialsError);
  return problems;
}

/** Marks every line returned. Condition, notes, and photos stay as the counter left them. */
export function markReturned<T extends { returned: boolean }>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row, returned: true }));
}

export function acknowledgmentProblem(customerName: string, acknowledged: boolean, photoCheckIn: boolean): string | null {
  if (!photoCheckIn) return null;
  if (!acknowledged || !customerName.trim()) {
    return 'Customer acknowledgment is required. The customer types their name and confirms the condition record (placeholder).';
  }
  return null;
}

export function benchFindingProblems(note: string, photoCount: number): string[] {
  const problems: string[] = [];
  if (!note.trim()) problems.push('Add a note describing what the bench found.');
  if (photoCount < 1) problems.push('Add at least one bench photo.');
  return problems;
}

export function canShareConditionPhotos(role: StaffMember['role']): boolean {
  return role === 'Counter lead';
}
