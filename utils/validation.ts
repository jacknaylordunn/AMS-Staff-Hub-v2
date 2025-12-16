
import { EPRF } from '../types';

export const validateEPRF = (data: EPRF): string[] => {
    const errors: string[] = [];

    // 1. Demographics & Incident
    if (!data.location) errors.push("Incident Location is required.");
    
    // Welfare checks might not have a patient name if refused/unable
    if (data.mode === 'Clinical' && !data.patient.lastName) {
        errors.push("Patient Surname is required for Clinical records.");
    }

    // 2. Clinical History
    if (data.mode === 'Clinical' && !data.history.presentingComplaint) {
        errors.push("Presenting Complaint is required.");
    }

    // 3. Primary Survey (Critical Safety) - Only strictly enforced for Clinical
    if (data.mode === 'Clinical') {
        if (!data.assessment.primary.airway.patency && !data.assessment.primary.airway.status) errors.push("Primary Survey: Airway status missing.");
        if (!data.assessment.primary.breathing.effort) errors.push("Primary Survey: Breathing effort missing.");
        if (!data.assessment.primary.circulation.radialPulse) errors.push("Primary Survey: Circulation/Pulse status missing.");
        if (!data.assessment.primary.disability.avpu) errors.push("Primary Survey: AVPU missing.");
    }

    // 4. Observations
    // Exception: If Status is 'Deceased' (ROLE), vitals might not be taken.
    // Enforce vitals only for Clinical mode unless deceased.
    const isDeceased = data.clinicalDecision?.finalDisposition === 'Deceased';
    if (data.mode === 'Clinical' && !isDeceased && data.vitals.length === 0) {
        errors.push("At least one set of Vital Signs is required for Clinical records.");
    }

    // 5. Governance
    // Capacity
    if (data.governance.capacity.status === 'Capacity Lacking' && !data.governance.capacity.bestInterestsRationale) {
        errors.push("Governance: Capacity is lacking but no 'Best Interests' rationale provided.");
    }

    // Safeguarding
    if (data.governance.safeguarding.concerns && !data.governance.safeguarding.details) {
        errors.push("Governance: Safeguarding concerns raised but no details provided.");
    }

    // 6. Mandatory Narrative
    if ((!data.assessment.clinicalNarrative || data.assessment.clinicalNarrative.length < 5) && data.mode === 'Clinical') {
        errors.push("Assessment: Clinical narrative is too short or missing.");
    }

    // 7. Paediatric Specific (Age < 16)
    if (data.patient.dob) {
        const age = new Date().getFullYear() - new Date(data.patient.dob).getFullYear();
        if (age < 12 && data.mode === 'Clinical' && !data.vitals.some(v => v.rr && v.hr) && !isDeceased) {
             errors.push("Paediatric Patient: Respiratory Rate and Heart Rate are mandatory.");
        }
    }

    // 8. Discharge/Refusal Signatures
    const disposition = data.clinicalDecision?.finalDisposition || '';
    const isConveying = disposition.toLowerCase().includes('conveyed') || disposition.toLowerCase().includes('sdec');
    
    if (!isConveying && !isDeceased && data.status === 'Submitted') {
        // If not conveying and not deceased, we expect a signature or witness
        if (!data.governance.refusal.patientSignature && !data.governance.refusal.witnessSignature) {
             errors.push("Non-Conveyance: Patient or Witness signature required for discharge/refusal.");
        }
        if (!data.governance.worseningAdviceDetails) {
             errors.push("Non-Conveyance: Safety Netting / Worsening advice must be documented.");
        }
    }

    return errors;
};
