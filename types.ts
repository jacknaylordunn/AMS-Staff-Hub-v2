

export enum Role {
    Admin = 'Admin',
    Manager = 'Manager',
    Doctor = 'Doctor',
    Nurse = 'Nurse',
    Paramedic = 'Paramedic',
    EMT = 'EMT',
    FREC4 = 'FREC4',
    FREC3 = 'FREC3',
    FirstAider = 'FirstAider',
    Welfare = 'Welfare',
    Pending = 'Pending'
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

export interface ComplianceDoc {
    id: string;
    name: string;
    expiryDate: string;
    status: 'Valid' | 'Expiring' | 'Expired' | 'Pending' | 'Rejected';
    fileUrl?: string;
    uploadedAt?: string;
}

export interface User {
    uid: string;
    email: string;
    name: string;
    role: Role;
    status: 'Active' | 'Pending' | 'Suspended' | 'Rejected';
    regNumber?: string;
    photoURL?: string;
    compliance?: ComplianceDoc[];
    pin?: string;
    pinHash?: string;
    pinLastUpdated?: string;
    employeeId?: string;
    phone?: string;
    address?: string;
    stats?: {
        totalHours: number;
        completedShifts: number;
        lastShiftDate: string;
    };
    roleChangeRequest?: {
        newRole: string;
        reason: string;
        status: string;
        requestDate: string;
    };
}

export interface ShiftSlot {
    id: string;
    role: Role;
    userId?: string;
    userName?: string;
    bids?: ShiftBid[];
}

export interface ShiftBid {
    userId: string;
    userName: string;
    userRole: string;
    timestamp: string;
}

export interface TimeRecord {
    userId: string;
    clockInTime?: string;
    clockInLocation?: string;
    clockOutTime?: string;
    durationMinutes?: number;
}

export interface ShiftResource {
    id: string;
    type: 'Vehicle' | 'Kit';
    name: string;
}

export interface Shift {
    id: string;
    start: Date;
    end: Date;
    location: string;
    address?: string;
    notes?: string;
    status: 'Open' | 'Filled' | 'Cancelled';
    tags?: string[];
    slots: ShiftSlot[];
    timeRecords?: Record<string, TimeRecord>;
    resources?: ShiftResource[];
    createdBy?: string;
}

export interface Announcement {
    id: string;
    title: string;
    message: string;
    priority: 'Normal' | 'Urgent';
    date: any;
    author: string;
    readBy: string[];
}

export interface Vehicle {
    id: string;
    callSign: string;
    registration: string;
    type: string;
    status: string;
    mileage?: number;
    checklist?: ChecklistItem[];
    lastCheck?: string;
}

export interface MedicalKit {
    id: string;
    name: string;
    type: string;
    status: string;
    lastCheck?: string;
    earliestExpiry?: string;
    checklist?: ChecklistItem[];
}

export interface ChecklistItem {
    id: string;
    label: string;
    category: string;
}

export interface AssetCheck {
    id: string;
    assetId: string;
    assetType: 'Vehicle' | 'Kit';
    userId: string;
    userName: string;
    timestamp: string;
    status: 'Pass' | 'Fail';
    faults?: string[];
    checklistData?: Record<string, boolean>;
}

export interface MajorIncidentReport {
    id: string;
    active: boolean;
    declaredBy: string;
    declaredByRole?: string;
    timeDeclared: string;
    type: 'DECLARATION' | 'METHANE_REPORT';
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

export interface Unavailability {
    id: string;
    userId: string;
    start: string;
    end: string;
    reason?: string;
    type: 'Holiday' | 'Sick' | 'Other';
}

export interface CPDEntry {
    id: string;
    title: string;
    date: string;
    type: 'Self-directed' | 'Work-based' | 'Formal';
    hours: number;
    reflection: string;
    evidenceUrl?: string;
    timestamp: any;
}

export interface Kudos {
    id: string;
    fromUser: string;
    fromUid: string;
    toUser: string;
    toUid: string;
    message: string;
    isPublic: boolean;
    timestamp: any;
    tags?: string[];
}

export interface InjuryMark {
    id: string;
    x: number;
    y: number;
    view: 'Anterior' | 'Posterior';
    type: 'Injury' | 'Pain' | 'IV' | 'IO' | 'IM' | 'SC' | 'Other';
    subtype?: string;
    location?: string; // Auto-generated description
    
    // Access Specific
    device?: string;
    gauge?: string;
    time?: string;
    success?: boolean;
    attempts?: number;
    
    // Injury Specific
    notes?: string;
}

export interface VitalsEntry {
    id?: string; // Added ID for editing
    time: string;
    hr?: number;
    rr?: number;
    spo2?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
    news2Score: number;
    temp?: number;
    oxygen: boolean;
    oxygenDevice?: string;
    oxygenFlow?: string;
    avpu?: 'A' | 'V' | 'P' | 'U';
    gcs?: number;
    bloodGlucose?: number;
    painScore?: number;
    popsScore?: number;
    bpPosition?: string;
    bpLimb?: string;
    rrRefused?: boolean;
    spo2Refused?: boolean;
    hrRefused?: boolean;
    bpRefused?: boolean;
    tempRefused?: boolean;
    gcsRefused?: boolean;
    bloodGlucoseRefused?: boolean;
    painScoreRefused?: boolean;
}

export interface DrugAdministration {
    id: string;
    time: string;
    drugName: string;
    dose: string;
    route: string;
    batchNumber?: string;
    authorisation: string;
    administeredBy: string;
    witnessedBy?: string;
    witnessUid?: string;
    witnessToken?: string;
}

export interface Procedure {
    id: string;
    time: string;
    type: string;
    site?: string;
    size?: string;
    success: boolean;
    attempts?: number;
    performedBy: string;
    details?: string;
    etco2?: string;
    depth?: string;
    secureMethod?: string;
}

export interface LinkedRecord {
    id: string;
    incidentNumber: string;
    date: string;
    diagnosis: string;
}

export interface WoundAssessment {
    id: string;
    site: string;
    classification: string;
    dimensions: string;
    contamination: string;
    tetanusStatus: string;
    closure?: string;
}

export interface ResusEvent {
    id: string;
    timestamp: string;
    action: string;
    type: 'Shock' | 'Drug' | 'Airway' | 'Mechanical' | 'Status' | 'Other';
    user: string;
}

export interface MediaAttachment {
    id: string;
    type: 'Photo';
    url: string;
    timestamp: string;
    notes?: string;
}

export interface CranialNerveStatus {
    nerve: string;
    test: string;
    status: 'Normal' | 'Abnormal' | 'Not Tested';
    notes?: string;
}

export interface CompanyDocument {
    id: string;
    title: string;
    category: 'Policy' | 'Clinical' | 'Operational' | 'HR' | 'Memo';
    description?: string;
    version: string;
    url: string;
    lastUpdated: string;
    uploadedBy: string;
}

export interface TraumaTriageResult {
    physiology: boolean;
    anatomy: boolean;
    mechanism: boolean;
    special: boolean;
    isMajorTrauma: boolean;
    criteria: string[];
    vehiclePosition?: string;
    estSpeed?: string;
    seatbeltWorn?: string;
    airbagsDeployed?: string;
    extrication?: string;
}

export interface NeuroAssessment {
    gcs: { eyes?: number; verbal?: number; motor?: number; total?: number };
    pupils: { leftSize: number; leftReaction: string; rightSize: number; rightReaction: string };
    fast: { face: string; arms: string; speech: string; time: string; testPositive: boolean };
    limbs: {
        leftArm: { power: string; sensation: string };
        rightArm: { power: string; sensation: string };
        leftLeg: { power: string; sensation: string };
        rightLeg: { power: string; sensation: string };
    };
    cranialNerves?: CranialNerveStatus[];
}

export interface MentalHealthAssessment {
    appearance: string;
    behaviour: string;
    speech: string;
    mood: string;
    perception?: string;
    riskToSelf: boolean;
    riskToOthers: boolean;
    capacityStatus?: string; 
    selfHarmHistory?: string; 
    suicideRisk?: string; 
    mentalHealthHistory?: string; 
}

export interface PrimarySurvey {
    catastrophicHaemorrhage?: boolean;
    airway: { status: string; patency?: string; notes: string; intervention: string };
    breathing: { rate: string | number; effort: string; oxygenSats: string | number; chestExpansion?: string; airEntryL: string; airEntryR: string; soundsL: string; soundsR: string; rhythm: string; depth: string };
    circulation: { radialPulse: string; character?: string; skin: string; capRefill: string; color: string; systolicBP: string | number; diastolicBP: string | number; temp: string | number };
    disability: { avpu: string; gcs: string; pupils: string; bloodGlucose: string | number };
    exposure: { injuriesFound: boolean; rash: boolean; temp: string | number };
}

export interface EPRF {
    id: string;
    incidentNumber: string;
    callSign: string;
    location: string;
    mode: 'Clinical' | 'Welfare' | 'Minor';
    status: 'Draft' | 'Submitted';
    userId: string;
    accessUids?: string[];
    lastUpdated: string;
    lastSync?: string;
    shiftId?: string;
    assistingClinicians?: {
        name: string;
        role: string;
        badgeNumber: string;
    }[];
    times: {
        incidentDate: string; // Added Incident Date
        callReceived: string;
        mobile: string;
        onScene: string;
        patientContact: string;
        departScene: string;
        atHospital: string;
        clear: string;
    };
    patient: {
        firstName: string;
        lastName: string;
        dob: string;
        gender: string;
        nhsNumber: string;
        address: string;
        postcode: string;
        chronicHypoxia: boolean;
        dnacpr: {
            hasDNACPR: boolean;
            dateIssued?: string;
            verified: boolean;
        };
    };
    history: {
        presentingComplaint: string;
        historyOfPresentingComplaint: string;
        sample?: {
            symptoms: string;
            allergies: string;
            medications: string;
            pastMedicalHistory: string;
            lastOralIntake: string;
            eventsPrior: string;
            medsTakenToHospital?: boolean;
        };
        allergies: string;
        medications: string;
        pastMedicalHistory: string;
    };
    assessment: {
        primary: PrimarySurvey;
        clinicalNarrative: string;
        neuro: NeuroAssessment;
        cardiac?: {
            chestPainPresent: boolean;
            ecg?: { 
                rhythm: string; 
                rate: string; 
                time: string; 
                stChanges: boolean; 
                stDetails?: { type: 'Elevation' | 'Depression' | 'None'; leads: string; };
                twelveLeadNotes?: string 
            };
            socrates?: any;
            wellsCriteria?: string[];
            wellsScore?: number;
        };
        respiratory?: {
            cough: string;
            sputumColor: string;
            peakFlowPre: string;
            peakFlowPost: string;
            airEntry: string;
            addedSounds: string;
            accessoryMuscleUse: boolean;
            accessoryMuscleDetails?: string; 
            trachealTug?: boolean; 
            nebulisersGiven?: boolean;
            history?: string;
        };
        gastrointestinal?: {
            abdominalPain: boolean;
            distension: string;
            palpation: string;
            bowelSounds: string;
            fastScan?: string;
            urineOutput: string;
            vomitDescription: string;
            stoolDescription: string;
            painLocation: string;
            lastMeal?: string;
            lastBowelMovement?: string;
            lastVomit?: string; 
            nausea: boolean; 
            vomiting: boolean; 
            diarrhoea: boolean; 
            fluidIntake?: string; 
            quadrants?: { ruq: string; luq: string; rlq: string; llq: string }; 
        };
        obsGynae?: {
            pregnant: boolean;
            gestationWeeks?: string;
            gravida?: string;
            para?: string;
            contractions?: string;
            membranesRuptured?: boolean;
            bleeding?: boolean;
            bleedAmount?: string;
            foetalMovements?: boolean;
            notes?: string;
        };
        mentalHealth?: MentalHealthAssessment;
        traumaTriage?: TraumaTriageResult;
        sepsis?: {
            redFlags: string[];
            suspectedSource?: string[];
            riskFactors: string[];
            screeningTrigger?: boolean;
            outcome?: string;
        };
        wounds?: WoundAssessment[];
        burns?: { estimatedPercentage: string; depth: string; site?: string };
        cfsScore?: number;
        mobility?: { preMorbidMobility: string; currentMobility: string; transferAbility: string; aidsUsed: string };
        social?: { 
            livingStatus: string; 
            carers: boolean;
            supportDetails: string;
            accessKeys?: boolean;
        };
        falls?: { 
            historyOfFalls: boolean; 
            anticoagulants?: string; 
            unsteadyWalk: boolean;
            visualImpairment?: boolean;
            alteredMentalState?: boolean;
            medications?: boolean;
        };
        minorInjuryAssessment?: string;
    };
    treatments: {
        drugs: DrugAdministration[];
        procedures: Procedure[];
        minorTreatment?: string;
        role?: {
            timeVerified: string;
            verifiedBy: string;
            arrestWitnessed: boolean;
            bystanderCPR: boolean;
            dnacprAvailable: boolean; 
            downTimeMinutes: number;
            totalShocks: number;
            criteriaMet: string[];
            resusSummary: string; 
        };
        resusLog?: ResusEvent[];
    };
    clinicalDecision: {
        workingImpression: string;
        differentialDiagnosis: string;
        managementPlan: string;
        finalDisposition: string;
        destinationTrust?: string;
        destinationRegion?: string;
        destinationHospital?: string;
        destinationDepartment?: string;
        gpPractice?: string;
        gpName?: string;
        gpCallTime?: string;
        gpRefNumber?: string;
    };
    governance: {
        capacity: {
            status: string;
            stage1?: { impairment: boolean; nexus: boolean };
            stage2Functional?: { understand: boolean; retain: boolean; weigh: boolean; communicate: boolean };
            bestInterestsRationale: string;
        };
        safeguarding: {
            concerns: boolean;
            category: string;
            type?: string[];
            details: string;
            referralMade: boolean;
            referralReference: string;
        };
        refusal: {
            isRefusal: boolean;
            type: string;
            details: string;
            risksExplained: boolean;
            capacityConfirmed: boolean;
            alternativesOffered: boolean;
            worseningAdviceGiven: boolean;
            patientRefusedToSign: boolean;
            patientSignature?: string;
            patientSigTime?: string;
            witnessName?: string;
            witnessSignature?: string;
            witnessSigTime?: string;
            staffSignature?: string;
            staffSigTime?: string;
        };
        worseningAdviceDetails?: string;
    };
    handover: {
        handoverType: string;
        receivingName: string;
        receivingPin: string;
        receivingTime: string;
        sbar?: string;
        atmist?: string;
        media?: MediaAttachment[];
        clinicianSignature?: string;
        clinicianSigTime?: string;
        receivingClinicianSignature?: string;
        receivingSigTime?: string;
        patientSignature?: string;
        patientSigTime?: string;
        digitalToken?: string;
    };
    vitals: VitalsEntry[];
    injuries: InjuryMark[]; 
    logs: any[];
    linkedRecords?: LinkedRecord[];
    bodyMapImage?: string;
    accessMapImage?: string;
    pdfUrl?: string;
    locked?: boolean;
}