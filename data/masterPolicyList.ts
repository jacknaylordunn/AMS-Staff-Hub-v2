
import { CompanyDocument } from '../types';

// Helper to infer category based on ID prefix
// CG, CP -> Clinical
// OP, COM -> Operational
// HR -> HR
// HS, IG -> Policy
export interface PolicyDefinition {
    id: string;
    title: string;
    category: CompanyDocument['category'];
}

export const MASTER_POLICY_INDEX: PolicyDefinition[] = [
    // Section A: Clinical Governance
    { id: 'CG-001', title: 'Clinical Governance Framework', category: 'Clinical' },
    { id: 'CG-002', title: 'Safeguarding Adults and Children Policy', category: 'Clinical' },
    { id: 'CG-003', title: 'Medicines Management and Logistics Policy', category: 'Clinical' },
    { id: 'CG-004', title: 'Incident Reporting and Duty of Candour Policy', category: 'Clinical' },
    { id: 'CG-005', title: 'Infection Prevention and Control Policy', category: 'Clinical' },
    { id: 'CG-006', title: 'Patient Report Form Completion and Records Management', category: 'Clinical' },
    { id: 'CG-007', title: 'Consent and Capacity Policy', category: 'Clinical' },
    { id: 'CG-008', title: 'DNACPR and End of Life Care Policy', category: 'Clinical' },
    { id: 'CG-009', title: 'Complaints and Feedback Policy', category: 'Clinical' },
    { id: 'CG-010', title: 'Chaperone Policy', category: 'Clinical' },
    { id: 'CG-011', title: 'Accessible Information Standard Policy', category: 'Clinical' },
    { id: 'CG-012', title: 'Nutrition and Hydration Policy', category: 'Clinical' },
    { id: 'CG-013', title: 'Quality Assurance and Audit Policy', category: 'Clinical' },

    // Section B: Operations
    { id: 'OP-001', title: 'Driving and Vehicle Operations Policy', category: 'Operational' },
    { id: 'OP-002', title: 'Vehicle Daily Inspection and Defect Reporting SOP', category: 'Operational' },
    { id: 'OP-003', title: 'Medical Equipment Management and Maintenance', category: 'Operational' },
    { id: 'OP-004', title: 'Event Medical Planning and Risk Assessment Procedure', category: 'Operational' },
    { id: 'OP-005', title: 'Radio Communications and Voice Procedure', category: 'Operational' },
    { id: 'OP-006', title: 'Major Incident and Mass Casualty Plan', category: 'Operational' },
    { id: 'OP-007', title: 'Business Continuity and Disaster Recovery Plan', category: 'Operational' },
    { id: 'OP-008', title: 'Counter Terrorism and Security SOP', category: 'Operational' },
    { id: 'OP-009', title: 'Medical Gases Safety Policy', category: 'Operational' },
    { id: 'OP-010', title: 'Environmental and Sustainability Policy', category: 'Operational' },
    { id: 'OP-011', title: 'Premises Security and Fire Safety Policy', category: 'Operational' },
    { id: 'OP-012', title: 'Clinical Triage and Prioritisation Procedure', category: 'Operational' },
    { id: 'OP-013', title: 'Patient Property and Valuables Procedure', category: 'Operational' },
    { id: 'OP-014', title: 'Did Not Wait and Self Discharge Procedure', category: 'Operational' },
    { id: 'OP-015', title: 'Controlled Drugs Standard Operating Procedure', category: 'Operational' },
    { id: 'OP-016', title: 'Vehicle and Equipment Decontamination SOP', category: 'Operational' },
    { id: 'OP-017', title: 'Event Control Room Operations SOP', category: 'Operational' },
    { id: 'OP-018', title: 'Sub Contractor and Agency Staff Management Policy', category: 'Operational' },
    { id: 'OP-019', title: 'Event Breakdown and Site Clearance SOP', category: 'Operational' },
    { id: 'OP-020', title: 'Inter Agency Liaison and Joint Working Policy', category: 'Operational' },
    { id: 'OP-021', title: 'Body Worn Video Usage Policy', category: 'Operational' },
    { id: 'OP-022', title: 'Lost Child and Vulnerable Person Procedure', category: 'Operational' },
    { id: 'OP-023', title: 'Stock Control and Inventory Management Policy', category: 'Operational' },
    { id: 'OP-024', title: 'Key Holding and Access Control Policy', category: 'Operational' },
    { id: 'OP-025', title: 'Vehicle Make Ready Standards', category: 'Operational' },
    { id: 'OP-026', title: 'Ambulance Equipment Loading and Weight Limits Policy', category: 'Operational' },

    // Section C: HR
    { id: 'HR-001', title: 'Recruitment Vetting and DBS Policy', category: 'HR' },
    { id: 'HR-002', title: 'Staff Code of Conduct and Professional Standards', category: 'HR' },
    { id: 'HR-003', title: 'Training and Development Policy', category: 'HR' },
    { id: 'HR-004', title: 'Whistleblowing and Freedom to Speak Up Policy', category: 'HR' },
    { id: 'HR-005', title: 'Disciplinary and Grievance Procedure', category: 'HR' },
    { id: 'HR-006', title: 'Fitness to Practice and Professional Registration Policy', category: 'HR' },
    { id: 'HR-007', title: 'Equality Diversity and Inclusion Policy', category: 'HR' },
    { id: 'HR-008', title: 'Staff Wellbeing and Trauma Risk Management Policy', category: 'HR' },
    { id: 'HR-009', title: 'Sickness Absence Policy', category: 'HR' },
    { id: 'HR-010', title: 'Learner Appeals Policy', category: 'HR' },
    { id: 'HR-011', title: 'Clinical Supervision and Appraisal Policy', category: 'HR' },
    { id: 'HR-012', title: 'Fatigue Management Policy', category: 'HR' },
    { id: 'HR-013', title: 'Staff Drug and Alcohol Testing Policy', category: 'HR' },
    { id: 'HR-014', title: 'Malpractice and Plagiarism Policy', category: 'HR' },
    { id: 'HR-015', title: 'Expenses and Subsistence Policy', category: 'HR' },
    { id: 'HR-016', title: 'Modern Slavery and Human Trafficking Policy', category: 'HR' },
    { id: 'HR-017', title: 'Uniform and Personal Appearance Policy', category: 'HR' },
    { id: 'HR-018', title: 'Student and Observer Placement Policy', category: 'HR' },

    // Section D: Health and Safety (Mapped to Policy)
    { id: 'HS-001', title: 'Health and Safety at Work Policy', category: 'Policy' },
    { id: 'HS-002', title: 'Dynamic Risk Assessment Policy', category: 'Policy' },
    { id: 'HS-003', title: 'Manual Handling Operations Policy', category: 'Policy' },
    { id: 'HS-004', title: 'Lone Working Policy', category: 'Policy' },
    { id: 'HS-005', title: 'Waste Management Policy', category: 'Policy' },
    { id: 'HS-006', title: 'Prevention and Management of Violence and Aggression Policy', category: 'Policy' },
    { id: 'HS-007', title: 'Display Screen Equipment Policy', category: 'Policy' },
    { id: 'HS-008', title: 'Management of Sharps and Splash Injuries Procedure', category: 'Policy' },
    { id: 'HS-009', title: 'Noise at Work and Hearing Protection Policy', category: 'Policy' },
    { id: 'HS-010', title: 'Driving for Work Grey Fleet Policy', category: 'Policy' },
    { id: 'HS-011', title: 'Hazardous Materials and CBRN Awareness Policy', category: 'Policy' },

    // Section E: Information Governance (Mapped to Policy)
    { id: 'IG-001', title: 'Data Protection and GDPR Policy', category: 'Policy' },
    { id: 'IG-002', title: 'Subject Access Request Procedure', category: 'Policy' },
    { id: 'IG-003', title: 'Information Security and Acceptable Use', category: 'Policy' },
    { id: 'IG-004', title: 'Social Media Policy', category: 'Policy' },
    { id: 'IG-005', title: 'Anti Bribery and Corruption Policy', category: 'Policy' },
    { id: 'IG-006', title: 'Conflict of Interest Policy', category: 'Policy' },
    { id: 'IG-007', title: 'Document Retention and Archiving Policy', category: 'Policy' },
    { id: 'IG-008', title: 'Brand Reputation and Media Handling Policy', category: 'Policy' },

    // Section F: Clinical Procedures (Mapped to Clinical)
    { id: 'CP-001', title: 'Sepsis Recognition and Screening Policy', category: 'Clinical' },
    { id: 'CP-002', title: 'Management of the Deteriorating Patient NEWS2 Policy', category: 'Clinical' },
    { id: 'CP-003', title: 'Head Injury and Concussion Management Policy', category: 'Clinical' },
    { id: 'CP-004', title: 'Patient Identification Policy', category: 'Clinical' },
    { id: 'CP-005', title: 'Point of Care Testing Policy', category: 'Clinical' },
    { id: 'CP-006', title: 'Mental Health Crisis and Acute Behavioural Disturbance Policy', category: 'Clinical' },
    { id: 'CP-007', title: 'Paediatric Assessment and PEWS Policy', category: 'Clinical' },
    { id: 'CP-008', title: 'Spinal Injury Management Policy', category: 'Clinical' },
    { id: 'CP-009', title: 'Environmental Exposure Policy Heat and Cold', category: 'Clinical' },
    { id: 'CP-010', title: 'Drug and Alcohol Intoxication Policy', category: 'Clinical' },
    { id: 'CP-011', title: 'Pain Management Policy', category: 'Clinical' },
    { id: 'CP-012', title: 'Anaphylaxis and Allergic Reaction Policy', category: 'Clinical' },
    { id: 'CP-013', title: 'Diabetes and Hypoglycaemia Management Policy', category: 'Clinical' },
    { id: 'CP-014', title: 'Asthma and Acute Respiratory Distress Policy', category: 'Clinical' },
    { id: 'CP-015', title: 'Seizure Management Policy', category: 'Clinical' },
    { id: 'CP-016', title: 'Cardiac Arrest and Pit Crew Resuscitation Policy', category: 'Clinical' },
    { id: 'CP-017', title: 'Burns and Scalds Management Policy', category: 'Clinical' },
    { id: 'CP-018', title: 'Obstetric Emergencies and Childbirth Policy', category: 'Clinical' },
    { id: 'CP-019', title: 'Stroke and TIA Recognition Policy', category: 'Clinical' },
    { id: 'CP-020', title: 'Sexual Assault and Forensic Awareness Policy', category: 'Clinical' },
    { id: 'CP-021', title: 'Chest Pain and Acute Coronary Syndrome Policy', category: 'Clinical' },
    { id: 'CP-022', title: 'Wound Management and Closure Policy', category: 'Clinical' },
    { id: 'CP-023', title: 'Limb Trauma and Fracture Management Policy', category: 'Clinical' },
    { id: 'CP-024', title: 'Eye Emergencies and Irrigation Policy', category: 'Clinical' },
    { id: 'CP-025', title: 'Suspected Drink Spiking and Vulnerability Policy', category: 'Clinical' },
    { id: 'CP-026', title: 'Naloxone Administration and Opioid Overdose Policy', category: 'Clinical' },
    { id: 'CP-027', title: 'Dental Trauma and Emergencies Policy', category: 'Clinical' },
    { id: 'CP-028', title: 'Crowd Crush and Traumatic Asphyxia Policy', category: 'Clinical' },
    { id: 'CP-029', title: 'Blast Injury and Ballistic Trauma Policy', category: 'Clinical' },
    { id: 'CP-030', title: 'Management of Hyperventilation Syndrome Policy', category: 'Clinical' },
    { id: 'CP-031', title: 'Death at an Event Procedure', category: 'Clinical' },
    { id: 'CP-032', title: 'Soft Tissue Injury Management Policy', category: 'Clinical' },
    { id: 'CP-033', title: 'Epistaxis Management Policy', category: 'Clinical' },
    { id: 'CP-034', title: 'Water Safety and Immersion Incident Policy', category: 'Clinical' },
    { id: 'CP-035', title: 'Infectious Disease and Pandemic Response Policy', category: 'Clinical' },

    // Section G: Commercial (Mapped to Operational)
    { id: 'COM-001', title: 'Terms of Business and Booking Policy', category: 'Operational' },
    { id: 'COM-002', title: 'Client Engagement and Service Level Agreement Policy', category: 'Operational' },
    { id: 'COM-003', title: 'Night Time Economy and Club Medic SOP', category: 'Operational' },
    { id: 'COM-004', title: 'Sports Event and Pitch Side Protocols', category: 'Operational' },
    { id: 'COM-005', title: 'Event Safety Advisory Group Attendance Policy', category: 'Operational' },
    { id: 'COM-006', title: 'VIP and Artist Medical Care Policy', category: 'Operational' },
    { id: 'COM-007', title: 'Adverse Weather and Event Suspension Protocol', category: 'Operational' },
    { id: 'COM-008', title: 'Film and Television Medical Safety Policy', category: 'Operational' },
    { id: 'COM-009', title: 'Campsite and Welfare Medical Operations Policy', category: 'Operational' },
];
