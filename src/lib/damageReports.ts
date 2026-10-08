import type { Agreement, DamageReport, Location, ReturnRecord, StaffMember } from '../types';

/** Damage and service flags go to the counter lead at the agreement's location. */
export function counterLeadFor(members: StaffMember[], location: Location): StaffMember {
  const lead = members.find((member) => member.location === location && member.role === 'Counter lead');
  if (!lead) throw new Error(`No counter lead on file for ${location}`);
  return lead;
}

/** One report per item returned Damaged or Needs service, routed to the location's counter lead. */
export function createDamageReports(
  agreement: Agreement,
  record: ReturnRecord,
  members: StaffMember[],
): DamageReport[] {
  return record.lines.flatMap((line) =>
    line.condition === 'OK'
      ? []
      : [
          {
            id: `${record.raNumber}-${line.assetTag}-${record.returnedOn}`,
            raNumber: record.raNumber,
            assetTag: line.assetTag,
            condition: line.condition,
            notes: line.notes,
            location: agreement.location,
            reportedBy: record.receivedBy,
            reportedOn: record.returnedOn,
            routedTo: counterLeadFor(members, agreement.location).name,
          },
        ],
  );
}
