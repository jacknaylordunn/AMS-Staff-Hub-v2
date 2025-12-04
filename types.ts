

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
  approvedAt?: string;
  approvedBy?: string;
}

export interface ComplianceDoc {
  id: string;
  name: string;
  expiryDate: string;
  status: 'Valid' | 'Expiring' | 'Expired' | 'Pending';
  fileUrl?: string;
  uploadedAt: string;
}

export interface CompanyDocument {
  id: string;
  title: string;
  category: 'Clinical' | 'Operational' | 'HR' | 'Policy' | 'Memo';
  version: string;
  lastUpdated: string;
  url: string;
  uploadedBy: string;
  description?: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  nhsNumber?: string;
  address: string;
  postcode?: string;
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

export interface ResusEvent {
    id: string;
    timestamp: string;
    action: string;
    type: 'Shock' | 'Drug' | 'Airway' | 'Mechanical' | 'Procedure' | 'Status' | 'Other';
    user: string;
}

export interface InjuryMark {
  id: string;
  x: number;
  y: number;
  view: 'Anterior' | 'Posterior';
  type: 'Injury' | 'IV' | 'Pain' | 'Other'; 
  subtype?: string;
  location?: string;
  description?: string;
  notes?: string;
  success?: boolean;
}

export interface CranialNerveStatus {
    nerve: string; 
    test: string; 
    status: 'Normal' | 'Abnormal' | 'Not Tested';
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
  cranialNerves?: CranialNerveStatus[];
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
    catastrophicHaemorrhage?: boolean;
    airway: {
        status: string;
        patency?: 'Patent' | 'Partial' | 'Complete' | 'Managed';
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
        chestExpansion?: 'Equal' | 'Unequal';
    };
    circulation: {
        radialPulse: string;
        character: string;
        capRefill: string;
        skin: string;
        temp: string;
        systolicBP?: string;
        diastolicBP?: string;
    };
    disability: {
        avpu: string;
        gcs?: string;
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
    fastScan?: 'Positive' | 'Negative' | 'Indeterminate' | 'Not Performed';
}

export interface ObsGynaeAssessment {
    pregnant: boolean;
    gestationWeeks?: string;
    gravida?: string;
    para?: string;
    contractions?: string;
    membranesRuptured?: boolean;
    bleeding?: boolean;
    foetalMovements?: boolean;
    notes?: string;
}

export interface MentalHealthAssessment {
    appearance: string;
    behaviour: string;
    speech: string;
    mood: string;
    perception?: string;
    riskToSelf: boolean;
    riskToOthers: boolean;
    capacityStatus: string;
}

export interface BurnsAssessment {
    estimatedPercentage: string;
    depth: string;
    site: string;
}

export interface WoundAssessment {
    id: string;
    site: string;
    classification: string;
    length?: string;
    width?: string;
    dimensions?: string;
    contamination: string;
    tetanusStatus: string;
    closure?: string;
}

export interface FallsAssessment {
    historyOfFalls: boolean;
    unsteadyWalk: boolean;
    visualImpairment: boolean;
    alteredMentalState: boolean;
    medications: boolean;
    anticoagulants?: boolean;
}

export interface MobilityAssessment {
    preMorbidMobility: string;
    currentMobility: string;
    transferAbility: string;
    aidsUsed: string;
}

export interface SepsisAssessment {
    screeningTrigger: boolean;
    suspectedSource: string[];
    redFlags: string[];
    riskFactors: string[];
    outcome: string;
}

export interface Assessment {
    clinicalNarrative: string;
    primary: PrimarySurvey;
    neuro: NeuroAssessment;
    traumaTriage?: TraumaTriageResult;
    falls?: FallsAssessment;
    mobility?: MobilityAssessment;
    cfsScore?: number;
    minorInjuryAssessment?: string;
    cardiac?: CardiacAssessment;
    respiratory?: RespiratoryAssessment;
    gastrointestinal?: AbdominalAssessment;
    obsGynae?: ObsGynaeAssessment;
    mentalHealth?: MentalHealthAssessment;
    burns?: BurnsAssessment;
    wounds?: WoundAssessment[];
    sepsis?: SepsisAssessment;
}

export interface ClinicalDecision {
    workingImpression: string; 
    differentialDiagnosis: string; 
    managementPlan: string; 
    finalDisposition: string; 
    destinationLocation?: string;
    receivingUnit?: string;
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
  
  // Timings
  times: {
    callReceived: string;
    mobile: string;
    onScene: string;
    patientContact: string;
    departScene: string;
    atHospital: string;
    clear?: string;
  };

  // Patient
  patient: {
    firstName: string;
    lastName: string;
    dob: string;
    nhsNumber?: string;
    address: string;
    postcode?: string;
    gender: string;
    chronicHypoxia: boolean;
  };

  // History & SAMPLE
  history: {
    presentingComplaint: string;
    historyOfPresentingComplaint: string;
    pastMedicalHistory: string;
    allergies: string;
    medications: string;
    sample?: {
        symptoms: string;
        allergies: string;
        medications: string;
        pastHistory: string;
        lastOralIntake: string;
        eventsPrior: string;
    };
  };

  assessment: Assessment;
  clinicalDecision: ClinicalDecision;
  vitals: VitalsEntry[];
  
  // Body Maps
  injuries: InjuryMark[];
  bodyMapImage?: string; 
  accessMapImage?: string;

  treatments: {
    drugs: DrugAdministration[];
    procedures: Procedure[];
    resusLog?: ResusEvent[];
    role?: {
        criteriaMet: string[];
        timeVerified: string;
        verifiedBy: string;
        notes: string;
        // Cardiac Arrest Specifics
        arrestWitnessed?: boolean;
        bystanderCPR?: boolean;
        downTimeMinutes?: number;
        initialRhythm?: string;
        totalShocks?: number;
        totalAdrenaline?: number;
        airwaySecured?: string;
        lucasUsed?: boolean;
    };
    minorTreatment?: string;
  };

  // Governance & Safeguarding
  governance: {
    safeguarding: {
        concerns: boolean;
        category?: 'Child' | 'Adult at Risk';
        type: string[]; // e.g. Physical, Sexual, Neglect
        details: string;
        referralMade?: boolean;
        referralReference?: string;
    };
    capacity: {
        status: 'Capacity Present' | 'Capacity Lacking';
        stage1: {
            impairment: boolean;
            nexus: boolean; // Causative nexus
        };
        stage2Functional: {
          understand: boolean;
          retain: boolean;
          weigh: boolean;
          communicate: boolean;
        };
        bestInterestsRationale?: string;
    };
    handoverClinician?: string;
    worseningAdviceDetails?: string;
    discharge?: string;
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
      receivingClinicianSignature: string;
      patientSignature?: string;
      media: MediaAttachment[];
      digitalToken?: string;
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
  location: string; // Used as Shift Name / Title
  address?: string; // Physical Address / Coordinates
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
  earliestExpiry?: string; 
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

export interface AuditEntry {
    action: string;
    details: string;
    userId: string;
    userName: string;
    timestamp: string;
    category: 'Clinical' | 'Operational' | 'Security' | 'Drug';
}
