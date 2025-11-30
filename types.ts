
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
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'success';
  read: boolean;
  timestamp: string;
  link?: string;
}

export interface User {
  uid: string;
  email: string;
  name: string;
  role: Role;
  status: 'Active' | 'Pending' | 'Suspended' | 'Rejected';
  employeeId?: string;
  regNumber?: string;
  pin?: string;
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
  oxygen: boolean;
  oxygenFlow?: string;
  oxygenDevice?: string;
  temp: number;
  gcs: number;
  bloodGlucose?: number;
  news2Score: number;
  popsScore?: number;
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
  authorisation: string;
  administeredBy: string;
  witnessedBy?: string;
  witnessUid?: string;
  authClinician?: string;
}

export interface Procedure {
  id: string;
  time: string;
  type: string;
  size?: string;
  details?: string;
  site?: string;
  attempts?: number;
  success: boolean;
  performedBy: string;
  notes?: string;
}

export interface InjuryMark {
  id: string;
  x: number;
  y: number;
  view: 'Anterior' | 'Posterior';
  type: 'Injury' | 'IV' | 'Pain' | 'Other'; 
  subtype?: string;
  description?: string;
  notes?: string;
  success?: boolean;
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
        status: string;
        notes: string;
        intervention?: string;
    };
    breathing: {
        rate: string;
        rhythm: string;
        depth: string;
        effort: string;
        airEntryL: string;
        airEntryR: string;
        soundsL: string;
        soundsR: string;
        oxygenSats: string;
    };
    circulation: {
        radialPulse: string;
        character: string;
        capRefill: string;
        skin: string;
        temp: string;
    };
    disability: {
        avpu: string;
        pupils: string;
        bloodGlucose: string;
    };
    exposure: {
        injuriesFound: boolean;
        rash: boolean;
        temp: string;
    };
}

export interface CardiacAssessment {
    chestPainPresent: boolean;
    socrates: {
        site: string;
        onset: string;
        character: string;
        radiation: string;
        associations: string;
        timeCourse: string;
        exacerbatingRelieving: string;
        severity: string;
    };
    ecg: {
        rhythm: string;
        rate: string;
        stElevation: boolean;
        twelveLeadNotes: string;
    };
}

export interface RespiratoryAssessment {
    cough: string;
    sputumColor: string;
    peakFlowPre: string;
    peakFlowPost: string;
    nebulisersGiven: boolean;
    history: string;
}

export interface AbdominalAssessment {
    abdominalPain: boolean;
    painLocation: string;
    palpation: string;
    distension: boolean;
    bowelSounds: string;
    lastMeal: string;
    lastBowelMovement: string;
    urineOutput: string;
    nauseaVomiting: boolean;
}

export interface ObsGynaeAssessment {
    pregnant: boolean;
    gestationWeeks?: string;
    gravida?: string;
    para?: string;
    contractions?: string;
    membranesRuptured?: boolean;
    bleeding?: boolean;
    notes?: string;
}

export interface MentalHealthAssessment {
    appearance: string;
    behaviour: string;
    speech: string;
    mood: string;
    riskToSelf: boolean;
    riskToOthers: boolean;
    capacityStatus: string;
}

export interface BurnsAssessment {
    estimatedPercentage: string;
    depth: string;
    site: string;
}

export interface Assessment {
    primary: PrimarySurvey;
    neuro: NeuroAssessment;
    traumaTriage?: TraumaTriageResult;
    minorInjuryAssessment?: string;
    cardiac?: CardiacAssessment;
    respiratory?: RespiratoryAssessment;
    gastrointestinal?: AbdominalAssessment;
    obsGynae?: ObsGynaeAssessment;
    mentalHealth?: MentalHealthAssessment;
    burns?: BurnsAssessment;
}

export interface Consumable {
    id: string;
    name: string;
    quantity: number;
}

export interface MediaAttachment {
    id: string;
    type: 'Photo' | 'ECG' | 'Other';
    url: string;
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
  id: string;
  incidentNumber: string;
  shiftId?: string;
  status: 'Draft' | 'Submitted' | 'Review' | 'Approved';
  mode: 'Clinical' | 'Welfare' | 'Minor';
  callSign: string;
  location: string;
  lastUpdated: string;
  accessUids: string[];
  assistingClinicians: AssistingClinician[];
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
    chronicHypoxia: boolean;
  };
  history: {
    presentingComplaint: string;
    historyOfPresentingComplaint: string;
    pastMedicalHistory: string;
    allergies: string;
    medications: string;
  };
  assessment: Assessment;
  vitals: VitalsEntry[];
  injuries: InjuryMark[];
  treatments: {
    drugs: DrugAdministration[];
    procedures: Procedure[];
    minorTreatment?: string;
  };
  governance: {
    safeguarding: {
        concerns: boolean;
        type: string;
        details: string;
    };
    capacity: {
        status: 'Capacity Present' | 'Capacity Lacking';
        stage1Impairment: boolean;
        stage2Functional: {
          understand: boolean;
          retain: boolean;
          weigh: boolean;
          communicate: boolean;
        };
        bestInterestsRationale?: string;
    };
    discharge: string;
    destinationLocation?: string;
    handoverClinician?: string;
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
      receivingClinicianName: string;
      receivingClinicianPin: string;
      receivingClinicianSignature: string;
      patientSignature: string;
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
  id: string;
  role: Role;
  userId?: string;
  userName?: string;
  bids: ShiftBid[];
}

export interface ShiftResource {
  id: string;
  type: 'Vehicle' | 'Kit';
  name: string;
}

export interface TimeRecord {
  userId: string;
  clockInTime: string;
  clockOutTime?: string;
  clockInLocation: string;
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
  resources?: ShiftResource[];
  vehicleId?: string;
  kitBagId?: string;
  notes?: string;
  createdBy: string;
  timeRecords?: Record<string, TimeRecord>;
  color?: string;
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

export interface ChecklistItem {
    id: string;
    label: string;
    category?: string;
}

export interface Vehicle {
  id: string;
  registration: string;
  callSign: string;
  type: 'Ambulance' | 'RRV' | '4x4' | 'PTS';
  status: 'Operational' | 'Maintenance' | 'Off Road';
  lastCheck?: string;
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
  assignedToUser?: string;
  lastCheck?: string;
  contents: KitItem[];
  checklist?: ChecklistItem[];
  notes?: string;
  earliestExpiry?: string;
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
  toUid?: string;
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
