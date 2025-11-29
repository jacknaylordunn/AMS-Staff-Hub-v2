
export enum Role {
  Pending = 'Pending',
  FirstAider = 'First Aider',
  Welfare = 'Welfare',
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

export interface AppNotification {
  id: string;
  userId: string; // Recipient
  title: string;
  message: string;
  type: 'info' | 'alert' | 'success';
  read: boolean;
  timestamp: string;
  link?: string; // e.g., '/rota'
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
  expiryDate?: string;
  authorisation: string; // JRCALC, PGD, Patient's Own, Out of Scope
  administeredBy: string;
  witnessedBy?: string; // Name of witness
  witnessUid?: string; // ID of witness for audit
  authClinician?: string; // For out of scope sign off
}

export interface InjuryMark {
  id: string;
  x: number;
  y: number;
  view: 'Anterior' | 'Posterior';
  type: 'Injury' | 'IV' | 'Pain' | 'Other'; 
  subtype?: string; // e.g., "Laceration", "18G Green"
  description?: string;
  notes?: string;
  success?: boolean; // For IVs
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

export interface PrimarySurvey {
    airway: {
        status: string; // Patent, Obstructed, Swollen, Vomit/Blood etc.
        notes: string;
    };
    breathing: {
        rate: string;
        rhythm: string; // Regular, Irregular
        depth: string; // Normal, Shallow, Deep
        effort: string; // Normal, Laboured, Accessory
        airEntry: string; // Equal, Reduced L/R, Silent
        addedSounds: string; // Wheeze, Crackles
    };
    circulation: {
        radialPulse: string; // Present, Absent
        character: string; // Regular, Irregular, Bounding, Thready
        capRefill: string; // <2s, >2s
        skin: string; // Normal, Pale, Flushed, Cyanosed, Mottled, Jaundiced
        temp: string; // Warm, Cool, Hot, Clammy
    };
    disability: {
        avpu: string;
        pupils: string; // PERRLA, Unequal
        bloodGlucose: string;
    };
    exposure: {
        injuriesFound: boolean;
        rash: boolean;
    };
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

export interface AssistingClinician {
    uid: string;
    name: string;
    role: string;
    badgeNumber: string;
}

export interface EPRF {
  id: string; // Unique Draft ID
  incidentNumber: string;
  shiftId?: string; // Linked to Shift
  status: 'Draft' | 'Submitted' | 'Review' | 'Approved';
  mode: 'Clinical' | 'Welfare' | 'Minor';
  callSign: string;
  location: string;
  lastUpdated: string;
  accessUids: string[]; // List of UIDs allowed to edit this record
  assistingClinicians: AssistingClinician[]; // Display data for PDF/UI
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
    primary: PrimarySurvey;
    neuro: NeuroAssessment;
    traumaTriage?: TraumaTriageResult;
    minorInjuryAssessment?: string; // For Minor Mode
  };
  vitals: VitalsEntry[];
  injuries: InjuryMark[];
  treatments: {
    drugs: DrugAdministration[];
    minorTreatment?: string; // OTC/Plaster etc.
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
    discharge: string; // Expanded Disposition options
    destinationLocation?: string; // Hospital Name or MIU Name
    handoverClinician?: string; // PIN or Crew ID
    worseningAdviceDetails?: string;
    refusal: {
        isRefusal: boolean;
        witnessName?: string;
        witnessSignature?: string;
        risksExplained: boolean;
        alternativesOffered: boolean;
        capacityConfirmed: boolean;
        worseningAdviceGiven: boolean;
        patientSignature?: string;
        signatureType?: 'Signed' | 'Unable' | 'Refused';
    };
  };
  handover: {
      sbar: string;
      clinicianSignature: string;
      patientSignature: string; // For See & Treat / Discharge
      patientSignatureType?: 'Signed' | 'Unable' | 'Refused';
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

export interface ShiftSlot {
  id: string; // Unique slot ID (e.g. "slot_1")
  role: Role; // Requirement
  userId?: string; // Assigned User
  userName?: string; // Denormalized name for display
  bids: ShiftBid[];
}

export interface ShiftResource {
  id: string;
  type: 'Vehicle' | 'Kit';
  name: string; // Denormalized for display
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
  slots: ShiftSlot[]; 
  status: 'Open' | 'Filled' | 'Cancelled' | 'Completed';
  
  // Replaces single vehicleId/kitBagId with array
  resources?: ShiftResource[];
  
  vehicleId?: string; // Deprecated
  kitBagId?: string; // Deprecated
  
  notes?: string;
  createdBy: string;
  timeRecords?: Record<string, TimeRecord>; // Keyed by userId
  color?: string; // UI Color override
  tags?: string[];
}

export interface LeaveRequest {
    id: string;
    userId: string;
    userName: string;
    startDate: string;
    endDate: string;
    type: 'Annual Leave' | 'Sick' | 'Study' | 'Other';
    reason?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
}

// --- Asset & Inventory System ---

export interface ChecklistItem {
    id: string;
    label: string;
    category?: string; // e.g. "External", "Internal", "Consumables"
}

export interface Vehicle {
  id: string; // e.g., AE23XYZ
  registration: string;
  callSign: string;
  type: 'Ambulance' | 'RRV' | '4x4' | 'PTS';
  status: 'Operational' | 'Maintenance' | 'Off Road';
  lastCheck?: string; // ISO Date
  mileage: number;
  checklist?: ChecklistItem[];
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
  type: 'Paramedic Bag' | 'Response Bag' | 'Trauma Bag' | 'Drug Pack' | 'O2 Bag' | 'Welfare Bag';
  status: 'Ready' | 'Restock Needed' | 'Quarantined';
  assignedToUser?: string; // User ID if checked out
  lastCheck?: string;
  contents: KitItem[];
  checklist?: ChecklistItem[];
  notes?: string;
  earliestExpiry?: string; // Calculated field
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

export interface MajorIncidentReport {
  id: string;
  declaredBy: string;
  declaredByRole?: string;
  timeDeclared: string;
  active: boolean;
  type: 'METHANE_REPORT' | 'DECLARATION';
  linkedShiftId?: string;
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
  fromUid: string;
  toUser: string;
  toUid?: string; // Direct linking
  message: string;
  timestamp: string;
  tags?: string[];
  isPublic: boolean;
}

export interface OhReferral {
    id: string;
    userId: string;
    userName: string;
    date: string;
    reason: string;
    urgency: 'Routine' | 'Urgent';
    contactPreference: 'Phone' | 'Email';
    status: 'Submitted' | 'In Review' | 'Actioned';
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'Normal' | 'Urgent';
  date: string;
  author: string;
}
