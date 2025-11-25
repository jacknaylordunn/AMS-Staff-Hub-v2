
export enum Role {
  Pending = 'Pending',
  FirstAider = 'First Aider',
  FREC3 = 'FREC3',
  FREC4 = 'FREC4',
  EMT = 'EMT',
  Paramedic = 'Paramedic',
  Nurse = 'Nurse',
  Doctor = 'Doctor',
  Manager = 'Manager',
  Admin = 'Admin'
}

export interface RoleChangeRequest {
  newRole: Role;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestDate: string;
}

export interface User {
  uid: string;
  email: string;
  name: string;
  role: Role;
  status: 'Active' | 'Pending' | 'Suspended' | 'Rejected';
  employeeId?: string; // Auto-generated ID (e.g. AMS-2024-001)
  regNumber?: string; // HCPC/NMC
  pin?: string; // Auto-generated 4-digit PIN for witnessing
  phone?: string;
  address?: string;
  compliance: ComplianceDoc[];
  roleChangeRequest?: RoleChangeRequest;
}

export interface ComplianceDoc {
  id: string;
  name: string;
  expiryDate: string;
  status: 'Valid' | 'Expiring' | 'Expired' | 'Pending';
  fileUrl?: string;
  uploadedAt: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  nhsNumber?: string;
  address?: string;
}

export interface VitalsEntry {
  time: string;
  hr: number;
  rr: number;
  bpSystolic: number;
  bpDiastolic: number;
  spo2: number;
  oxygen: boolean; // True if on O2
  temp: number;
  gcs: number;
  bloodGlucose?: number;
  news2Score: number;
  avpu: 'A' | 'V' | 'P' | 'U';
  painScore?: number;
}

export interface DrugAdministration {
  id: string;
  time: string;
  drugName: string;
  dose: string;
  route: string;
  batchNumber?: string;
  administeredBy: string;
  witnessedBy?: string; // Name of witness
  witnessUid?: string; // ID of witness for audit
}

export interface InjuryMark {
  id: string;
  x: number;
  y: number;
  view: 'Anterior' | 'Posterior';
  type: 'Wound' | 'Fracture' | 'Burn' | 'Bruise' | 'Pain' | 'Intervention';
  notes?: string;
}

export interface NeuroAssessment {
  gcs: {
    eyes: number;
    verbal: number;
    motor: number;
    total: number;
  };
  pupils: {
    leftSize: number;
    leftReaction: 'Brisk' | 'Sluggish' | 'Fixed' | 'None';
    rightSize: number;
    rightReaction: 'Brisk' | 'Sluggish' | 'Fixed' | 'None';
  };
  fast: {
    face: 'Normal' | 'Droop';
    arms: 'Normal' | 'Weakness';
    speech: 'Normal' | 'Slurred';
    testPositive: boolean;
    time: string;
  };
  limbs: {
    leftArm: { power: string; sensation: string; };
    rightArm: { power: string; sensation: string; };
    leftLeg: { power: string; sensation: string; };
    rightLeg: { power: string; sensation: string; };
  };
}

export interface TraumaTriageResult {
    physiology: boolean;
    anatomy: boolean;
    mechanism: boolean;
    special: boolean;
    isMajorTrauma: boolean;
    criteria: string[];
}

export interface Consumable {
    id: string;
    name: string;
    quantity: number;
}

export interface MediaAttachment {
    id: string;
    type: 'Photo' | 'ECG' | 'Other';
    url: string; // Base64
    timestamp: string;
    notes?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'Info' | 'Comms' | 'Scene' | 'Clinical';
  message: string;
  author: string;
}

export interface ReviewNote {
  id: string;
  timestamp: string;
  managerName: string;
  note: string;
  action: 'Approved' | 'Returned';
}

export interface EPRF {
  id: string; // Unique Draft ID
  incidentNumber: string;
  status: 'Draft' | 'Submitted' | 'Review' | 'Approved';
  mode: 'Clinical' | 'Welfare';
  callSign: string;
  location: string;
  lastUpdated: string;
  times: {
    callReceived: string;
    mobile: string;
    onScene: string;
    patientContact: string;
    departScene: string;
    atHospital: string;
  };
  patient: {
    firstName: string;
    lastName: string;
    dob: string;
    nhsNumber: string;
    address: string;
    gender: string;
  };
  history: {
    presentingComplaint: string;
    historyOfPresentingComplaint: string;
    pastMedicalHistory: string;
    allergies: string;
    medications: string;
  };
  assessment: {
    airway: string;
    breathing: string;
    circulation: string;
    disability: string;
    exposure: string;
    neuro: NeuroAssessment;
    traumaTriage?: TraumaTriageResult;
  };
  vitals: VitalsEntry[];
  injuries: InjuryMark[];
  treatments: {
    drugs: DrugAdministration[];
    interventions: string[];
    consumables: Consumable[];
  };
  governance: {
    safeguarding: {
        concerns: boolean;
        type: string;
        details: string;
    };
    capacity: {
        status: 'Capacity Present' | 'Capacity Lacking';
        stage1Impairment: boolean; // Is there an impairment of mind/brain?
        stage2Functional: {
          understand: boolean;
          retain: boolean;
          weigh: boolean;
          communicate: boolean;
        };
        bestInterestsRationale?: string;
    };
    discharge: 'Conveyed to Hospital' | 'Discharged on Scene' | 'Refusal of Care';
    refusal: {
        risksExplained: boolean;
        alternativesOffered: boolean;
        capacityConfirmed: boolean;
        worseningAdviceGiven: boolean;
        signature?: string;
    };
  };
  handover: {
      sbar: string;
      clinicianSignature: string;
      patientSignature: string;
      media: MediaAttachment[];
  };
  logs: LogEntry[];
  reviewNotes?: ReviewNote[];
}

export interface ShiftBid {
  userId: string;
  userName: string;
  userRole: Role;
  timestamp: string;
}

export interface TimeRecord {
  userId: string;
  clockInTime: string;
  clockOutTime?: string;
  clockInLocation: string; // GPS string
  clockOutLocation?: string;
  durationMinutes?: number;
}

export interface Shift {
  id: string;
  start: Date;
  end: Date;
  location: string;
  requiredRole: Role[];
  assignedUserIds: string[];
  bids: ShiftBid[];
  status: 'Open' | 'Filled' | 'Cancelled' | 'Completed';
  vehicleId?: string; // Resource assignment
  notes?: string;
  createdBy: string;
  timeRecords?: Record<string, TimeRecord>; // Keyed by userId
  color?: string; // UI Color override
  tags?: string[];
}

export interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  location: string;
  role: Role;
  slots: number;
  notes: string;
}

// --- Asset & Inventory System ---

export interface Vehicle {
  id: string; // e.g., AE23XYZ
  registration: string;
  callSign: string;
  type: 'Ambulance' | 'RRV' | '4x4' | 'PTS';
  status: 'Operational' | 'Maintenance' | 'Off Road';
  lastCheck?: string; // ISO Date
  mileage: number;
  notes?: string;
}

export interface KitItem {
  id: string;
  name: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface MedicalKit {
  id: string;
  name: string;
  type: 'Response Bag' | 'Trauma Bag' | 'Drug Pack' | 'O2 Bag';
  status: 'Ready' | 'Restock Needed' | 'Quarantined';
  assignedToUser?: string; // User ID if checked out
  lastCheck?: string;
  contents: KitItem[];
}

export interface AssetCheck {
  id: string;
  assetId: string;
  assetType: 'Vehicle' | 'Kit';
  userId: string;
  userName: string;
  timestamp: string;
  status: 'Pass' | 'Fail';
  faults: string[];
  checklistData: Record<string, boolean>;
}

export interface Asset { // Helper Union for Generic Components
  id: string;
  type: 'Vehicle' | 'Kit';
  status: string;
  lastCheck: string;
}

export interface MajorIncidentReport {
  id: string;
  declaredBy: string;
  timeDeclared: string;
  methane: {
    majorIncidentDeclared: boolean;
    exactLocation: string;
    typeOfIncident: string;
    hazards: string;
    access: string;
    numberOfCasualties: string;
    emergencyServices: string;
  };
}

export interface CPDEntry {
  id: string;
  date: string;
  title: string;
  type: 'Formal' | 'Work-based' | 'Self-directed';
  hours: number;
  reflection: string;
  evidenceUrl?: string;
}

export interface Kudos {
  id: string;
  fromUser: string;
  toUser: string;
  message: string;
  timestamp: string;
  tags?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'Normal' | 'Urgent';
  date: string;
  author: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'Info' | 'Alert' | 'Success';
}
