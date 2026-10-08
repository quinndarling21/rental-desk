export type Location = 'Burbank' | 'Atlanta' | 'Albuquerque';

export type Category = 'Lighting' | 'Grip' | 'Power' | 'Carts & cases';

export type ItemStatus = 'Available' | 'Out' | 'Service bench';

export type Condition = 'OK' | 'Needs service' | 'Damaged';

export type AgreementStatus = 'Out' | 'Due today' | 'Overdue' | 'Returned';

export interface InventoryItem {
  /** Printed on the asset label, e.g. BUR-LT-0142: location, category, number. */
  assetTag: string;
  /** Digits encoded in the label barcode; scanners type this into the tag field. */
  barcode: string;
  name: string;
  category: Category;
  location: Location;
  dailyRate: number;
  status: ItemStatus;
}

export interface StaffMember {
  id: string;
  name: string;
  initials: string;
  location: Location;
  role: 'Counter lead' | 'Counter staff';
}

export interface Contact {
  name: string;
  phone: string;
}

export interface AgreementLine {
  assetTag: string;
  checkedOutOn: string;
  checkedOutBy: string;
  conditionOut: Condition;
  returned: boolean;
  returnedOn?: string;
  returnedBy?: string;
  returnCondition?: Condition;
  returnNotes?: string;
}

export interface Agreement {
  raNumber: string;
  production: string;
  /** Season, pilot, feature, commercial client and so on. */
  productionDetail: string;
  contact: Contact;
  location: Location;
  checkedOutBy: string;
  checkedOutOn: string;
  dueBack: string;
  lines: AgreementLine[];
}

export interface ReturnedLine {
  assetTag: string;
  condition: Condition;
  notes: string;
}

export interface ReturnRecord {
  raNumber: string;
  returnedOn: string;
  receivedBy: string;
  lines: ReturnedLine[];
}

export interface DamageReport {
  id: string;
  raNumber: string;
  assetTag: string;
  condition: Exclude<Condition, 'OK'>;
  notes: string;
  location: Location;
  reportedBy: string;
  reportedOn: string;
  /** Name of the counter lead the report was routed to. */
  routedTo: string;
}
