
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EPRF } from '../types';

// --- CONFIGURATION ---
const LOGO_URL = 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png';

const COLORS = {
    primary: '#003366',    // Dark Navy
    secondary: '#0052CC',  // AMS Blue
    accent: '#00B8D9',     // Cyan
    headerBg: '#F4F5F7',   // Light Grey
    text: '#172B4D',       // Dark Slate
    lightText: '#6B778C',  // Muted Text
    red: '#DE350B',        // Critical
    green: '#00875A',      // Success
    white: '#FFFFFF',
    border: '#DFE1E6'
};

type PDFMode = 'FULL' | 'REFERRAL' | 'SAFEGUARDING' | 'TRAUMA_HANDOVER';

// --- HELPERS ---

const resolveImage = async (src: string | undefined): Promise<string> => {
    if (!src) return "";
    if (src.startsWith('OFFLINE_PENDING::')) return ""; 
    if (src.startsWith('data:')) return src;
    
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            } else {
                resolve("");
            }
        };
        img.onerror = () => resolve("");
    });
};

const formatValue = (val: any, fallback = '-'): string => {
    if (val === true) return 'YES';
    if (val === false) return 'No';
    if (val === undefined || val === null || val === '') return fallback;
    return String(val);
};

// --- PDF BUILDER CLASS ---

class PDFBuilder {
    doc: jsPDF;
    yPos: number = 0;
    pageHeight: number;
    pageWidth: number;
    margin: number = 15;

    constructor() {
        this.doc = new jsPDF();
        this.pageHeight = this.doc.internal.pageSize.height;
        this.pageWidth = this.doc.internal.pageSize.width;
    }

    checkPageBreak(heightNeeded: number) {
        if (this.yPos + heightNeeded > this.pageHeight - this.margin) {
            this.doc.addPage();
            this.yPos = 20; 
            return true;
        }
        return false;
    }

    addHeader(title: string, data: EPRF, logoData?: string, badge?: string) {
        const headerHeight = 35;
        this.doc.setFillColor(COLORS.primary);
        this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');
        
        if (logoData) {
            try { this.doc.addImage(logoData, 'PNG', 10, 5, 25, 25); } catch (e) {}
        }

        this.doc.setTextColor(COLORS.white);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(16);
        this.doc.text("AEGIS MEDICAL SOLUTIONS", 40, 14);
        
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text("CLINICAL PATIENT REPORT", 40, 20);
        
        this.doc.setFontSize(12);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(title.toUpperCase(), 40, 28);
        
        if (badge) {
            this.doc.setFillColor(COLORS.red);
            this.doc.roundedRect(this.pageWidth - 50, 5, 35, 8, 2, 2, 'F');
            this.doc.setTextColor(COLORS.white);
            this.doc.setFontSize(8);
            this.doc.text(badge, this.pageWidth - 46, 10);
        }

        this.doc.setTextColor(COLORS.white);
        this.doc.setFontSize(8);
        this.doc.text(`Ref: ${data.incidentNumber}`, this.pageWidth - 15, 20, { align: 'right' });
        this.doc.text(`Date: ${new Date(data.times.incidentDate || Date.now()).toLocaleDateString()}`, this.pageWidth - 15, 25, { align: 'right' });
        
        this.yPos = headerHeight + 10;
    }

    addFooter(data: EPRF) {
        const pageCount = this.doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i);
            this.doc.setFontSize(8);
            this.doc.setTextColor(100);
            const name = data.patient.lastName ? `${data.patient.lastName.toUpperCase()}, ${data.patient.firstName}` : 'Unknown Patient';
            const nhs = data.patient.nhsNumber ? ` | NHS: ${data.patient.nhsNumber}` : '';
            
            this.doc.text(`Patient: ${name}${nhs}`, this.margin, this.pageHeight - 10);
            this.doc.text(`Page ${i} of ${pageCount}`, this.pageWidth / 2, this.pageHeight - 10, { align: 'center' });
            this.doc.text("CONFIDENTIAL MEDICAL RECORD", this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
        }
    }

    addSectionTitle(title: string) {
        this.checkPageBreak(15);
        this.yPos += 5;
        this.doc.setFillColor(COLORS.headerBg);
        this.doc.setDrawColor(COLORS.border);
        this.doc.rect(this.margin, this.yPos, this.pageWidth - (this.margin * 2), 8, 'FD');
        this.doc.setDrawColor(COLORS.secondary);
        this.doc.setLineWidth(1);
        this.doc.line(this.margin, this.yPos, this.margin, this.yPos + 8);
        this.doc.setTextColor(COLORS.primary);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(title.toUpperCase(), this.margin + 5, this.yPos + 5.5);
        this.yPos += 12;
        this.doc.setLineWidth(0.1);
    }

    addSubsectionTitle(title: string) {
        this.checkPageBreak(8);
        this.doc.setTextColor(COLORS.secondary);
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(title, this.margin, this.yPos);
        this.doc.setDrawColor(COLORS.secondary);
        this.doc.line(this.margin, this.yPos + 1, this.margin + this.doc.getTextWidth(title), this.yPos + 1);
        this.yPos += 6;
    }

    addGrid(data: Record<string, any>, cols = 2) {
        this.checkPageBreak(20);
        const colWidth = (this.pageWidth - (this.margin * 2)) / cols;
        const startX = this.margin;
        let colIndex = 0;
        let rowY = this.yPos;
        let maxRowH = 0;

        Object.entries(data).forEach(([key, value]) => {
            const displayVal = formatValue(value);
            this.checkPageBreak(10);
            if (this.yPos !== rowY && colIndex === 0) rowY = this.yPos;

            const currentX = startX + (colIndex * colWidth);
            
            this.doc.setFontSize(8);
            this.doc.setTextColor(COLORS.lightText);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(key.toUpperCase(), currentX, rowY);
            
            this.doc.setTextColor(COLORS.text);
            this.doc.setFont('helvetica', 'normal');
            if (displayVal === 'YES') this.doc.setTextColor(COLORS.green);
            if (['CRITICAL', 'HIGH RISK', 'POSITIVE', 'YES - TRIGGERED', 'Capacity Lacking', 'Major Trauma'].includes(displayVal) || displayVal.includes('Allergy')) this.doc.setTextColor(COLORS.red);

            const splitVal = this.doc.splitTextToSize(displayVal, colWidth - 5);
            this.doc.text(splitVal, currentX, rowY + 4);
            
            maxRowH = Math.max(maxRowH, (splitVal.length * 4) + 6);
            colIndex++;
            
            if (colIndex >= cols) {
                colIndex = 0;
                rowY += maxRowH;
                this.yPos = rowY;
                maxRowH = 0;
            }
        });

        if (colIndex !== 0) this.yPos = rowY + maxRowH;
        this.yPos += 2; // small spacer
    }

    addFullWidthField(label: string, value: string, highlight = false) {
        if (!value) return;
        this.checkPageBreak(15);
        this.doc.setFontSize(9);
        this.doc.setTextColor(COLORS.lightText);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(label.toUpperCase(), this.margin, this.yPos);
        this.yPos += 5;
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(highlight ? COLORS.red : COLORS.text);
        const splitText = this.doc.splitTextToSize(value, this.pageWidth - (this.margin * 2));
        this.doc.text(splitText, this.margin, this.yPos);
        this.yPos += (splitText.length * 5) + 5;
    }

    addTable(headers: string[], body: string[][], theme: 'striped' | 'grid' = 'striped') {
        if (body.length === 0) return;
        autoTable(this.doc, {
            startY: this.yPos,
            head: [headers],
            body: body,
            theme: theme,
            headStyles: { fillColor: COLORS.secondary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', font: 'helvetica' },
            margin: { left: this.margin, right: this.margin },
            didDrawPage: (data) => { this.yPos = data.cursor.y + 10; }
        });
        this.yPos = (this.doc as any).lastAutoTable.finalY + 10;
    }

    async addImage(base64: string, label: string, height = 80) {
        if (!base64 || base64.length < 100) return;
        this.checkPageBreak(height + 15);
        try {
            // Center the image if possible or fit to width
            const imgProps = this.doc.getImageProperties(base64);
            const ratio = imgProps.width / imgProps.height;
            const printWidth = Math.min(100, height * ratio);
            
            this.doc.addImage(base64, 'PNG', this.margin, this.yPos, printWidth, height);
            this.doc.setFontSize(8);
            this.doc.setTextColor(COLORS.lightText);
            this.doc.text(`Exhibit: ${label}`, this.margin, this.yPos + height + 5);
            this.yPos += height + 15;
        } catch (e) { console.warn(`Failed to render image: ${label}`); }
    }

    addAlertBox(title: string, message: string) {
        this.checkPageBreak(30);
        this.doc.setDrawColor(COLORS.red);
        this.doc.setFillColor('#FFF5F5');
        this.doc.roundedRect(this.margin, this.yPos, this.pageWidth - (this.margin * 2), 25, 2, 2, 'FD');
        this.doc.setTextColor(COLORS.red);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(title.toUpperCase(), this.margin + 5, this.yPos + 8);
        this.doc.setTextColor(COLORS.text);
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');
        const splitMsg = this.doc.splitTextToSize(message, this.pageWidth - (this.margin * 2) - 10);
        this.doc.text(splitMsg, this.margin + 5, this.yPos + 16);
        this.yPos += 35;
    }
}

// --- MAIN GENERATOR FUNCTION ---

export const createEPRFDoc = async (data: EPRF, mode: PDFMode = 'FULL'): Promise<jsPDF> => {
    const builder = new PDFBuilder();
    let logoData = '';
    try { logoData = await resolveImage(LOGO_URL); } catch (e) {}

    // 1. HEADER
    let docTitle = "Patient Report";
    if (mode === 'SAFEGUARDING') docTitle = "Safeguarding Referral Form";
    if (mode === 'REFERRAL') docTitle = "GP / Medical Referral Letter";
    if (mode === 'TRAUMA_HANDOVER') docTitle = "Trauma Handover (ATMIST)";
    if (mode === 'FULL') {
        docTitle = `${data.mode || 'Clinical'} Patient Record`;
    }

    builder.addHeader(docTitle, data, logoData, mode === 'SAFEGUARDING' ? 'CONFIDENTIAL' : undefined);

    // 2. REFERRAL HEADER (Letter Format)
    if (mode === 'REFERRAL') {
        builder.addFullWidthField("To", "The Receiving GP / Medical Team");
        builder.addFullWidthField("Date", new Date().toLocaleDateString());
        builder.addFullWidthField("Re", `Patient: ${data.patient.firstName} ${data.patient.lastName} (DOB: ${data.patient.dob})`);
        builder.yPos += 10;
        builder.doc.text("Dear Doctor / Colleague,", builder.margin, builder.yPos);
        builder.yPos += 10;
        builder.doc.text("Please see below the clinical assessment for the above patient attended by our team today.", builder.margin, builder.yPos);
        builder.yPos += 15;
    }

    // 3. DEMOGRAPHICS
    builder.addSectionTitle("Patient & Incident Context");
    const pt = data.patient;
    const addr = [pt.address, pt.postcode].filter(Boolean).join(', ');

    builder.addGrid({
        "Patient Name": `${pt.firstName} ${pt.lastName}`,
        "DOB": `${pt.dob} (Age: ${getAge(pt.dob)})`,
        "Gender": pt.gender,
        "NHS Number": pt.nhsNumber,
        "Patient Address": addr,
        "GP Surgery": data.clinicalDecision.gpPractice
    }, 2);

    if (pt.dnacpr?.hasDNACPR) {
        builder.addAlertBox("DNACPR STATUS", 
            `DNACPR IN PLACE. Verified: ${pt.dnacpr.verified ? "YES" : "NO"}. Date Issued: ${pt.dnacpr.dateIssued || 'Unknown'}`
        );
    }

    // 4. INCIDENT LOGISTICS
    if (mode === 'FULL') {
        builder.addSubsectionTitle("Logistics");
        builder.addGrid({
            "Incident Location": data.location,
            "Call Sign": data.callSign,
            "Receiving Hospital": data.clinicalDecision.destinationHospital
        }, 3);
        
        builder.addSubsectionTitle("Timings");
        builder.addGrid({
            "Call Received": data.times.callReceived,
            "Mobile": data.times.mobile,
            "On Scene": data.times.onScene,
            "Pt Contact": data.times.patientContact,
            "Depart Scene": data.times.departScene,
            "At Hospital": data.times.atHospital,
            "Clear": data.times.clear
        }, 7); // Spread across row
    }

    // 5. HISTORY & PRESENTATION
    builder.addSectionTitle("Clinical History");
    builder.addFullWidthField("Presenting Complaint (PC)", data.history.presentingComplaint);
    builder.addFullWidthField("History of PC (HPC)", data.history.historyOfPresentingComplaint);
    
    if (data.history.sample) {
        builder.addSubsectionTitle("SAMPLE History");
        builder.addGrid({
            "Symptoms": data.history.sample.symptoms,
            "Allergies": data.history.sample.allergies,
            "Medications": data.history.sample.medications,
            "Past History": data.history.sample.pastMedicalHistory,
            "Last Intake": data.history.sample.lastOralIntake,
            "Events": data.history.sample.eventsPrior
        }, 2);
    } else {
        builder.addGrid({
            "Past Medical History": data.history.pastMedicalHistory || 'Nil Reported',
            "Medications": data.history.medications || 'Nil Reported',
            "Allergies": data.history.allergies || 'NKDA'
        }, 1);
    }

    // New: Social & Family History
    if (data.history.socialHistory || data.history.familyHistory) {
        builder.addSubsectionTitle("Social & Family Context");
        if (data.history.socialHistory) builder.addFullWidthField("Social History", data.history.socialHistory);
        if (data.history.familyHistory) builder.addFullWidthField("Family History", data.history.familyHistory);
    }

    // 6. CLINICAL NARRATIVE (Important)
    builder.addSectionTitle("Clinical Assessment Narrative");
    builder.addFullWidthField("", data.assessment.clinicalNarrative || "No narrative recorded.");

    // Mental Health specific if present
    if (data.assessment.mentalHealth?.mood || data.assessment.mentalHealth?.riskToSelf) {
        builder.addSubsectionTitle("Mental Health Assessment");
        builder.addGrid({
            "Appearance": data.assessment.mentalHealth.appearance,
            "Behaviour": data.assessment.mentalHealth.behaviour,
            "Speech": data.assessment.mentalHealth.speech,
            "Mood": data.assessment.mentalHealth.mood,
            "Risk to Self": data.assessment.mentalHealth.riskToSelf ? "HIGH RISK" : "No",
            "Risk to Others": data.assessment.mentalHealth.riskToOthers ? "HIGH RISK" : "No"
        }, 2);
    }

    // Social / Frailty if present
    if (data.assessment.cfsScore || data.assessment.social?.livingStatus) {
        builder.addSubsectionTitle("Social & Frailty");
        builder.addGrid({
            "Clinical Frailty Score": data.assessment.cfsScore ? String(data.assessment.cfsScore) : '-',
            "Living Status": data.assessment.social?.livingStatus,
            "Carers Involved": data.assessment.social?.carers ? "Yes" : "No",
            "Access Keys": data.assessment.social?.accessKeys ? "Yes" : "No"
        }, 2);
    }

    // 7. VITAL SIGNS
    if (data.vitals.length > 0) {
        builder.addSectionTitle("Vital Signs");
        builder.addTable(
            ['Time', 'RR', 'SpO2', 'O2', 'BP', 'HR', 'Temp', 'GCS', 'BM', 'NEWS2'],
            data.vitals.map(v => [
                v.time,
                v.rrRefused ? 'Ref' : String(v.rr || '-'),
                v.spo2Refused ? 'Ref' : `${v.spo2 || '-'}%`,
                v.oxygen ? `${v.oxygenDevice || 'Supp'} ${v.oxygenFlow || ''}` : 'Air',
                v.bpRefused ? 'Ref' : `${v.bpSystolic || '-'}/${v.bpDiastolic || '-'}`,
                v.hrRefused ? 'Ref' : String(v.hr || '-'),
                v.tempRefused ? 'Ref' : String(v.temp || '-'),
                v.gcsRefused ? 'Ref' : String(v.gcs || v.avpu || '-'),
                v.bloodGlucoseRefused ? 'Ref' : String(v.bloodGlucose || '-'),
                String(v.news2Score)
            ]),
            'grid'
        );
    }

    // 8. TREATMENTS & LOGS
    if (data.treatments.drugs.length > 0 || data.treatments.procedures.length > 0 || (data.logs && data.logs.length > 0)) {
        builder.addSectionTitle("Treatments & Interventions");
        
        if (data.treatments.drugs.length > 0) {
            builder.addSubsectionTitle("Medications");
            builder.addTable(
                ['Time', 'Drug', 'Dose', 'Route', 'Batch', 'Clinician'],
                data.treatments.drugs.map(d => [d.time, d.drugName, d.dose, d.route, d.batchNumber || '-', d.administeredBy])
            );
        }

        if (data.treatments.procedures.length > 0) {
            builder.addSubsectionTitle("Procedures");
            builder.addTable(
                ['Time', 'Procedure', 'Site', 'Details', 'Success', 'Clinician'],
                data.treatments.procedures.map(p => [p.time, p.type, p.site || '-', p.details || '-', p.success ? 'Yes' : 'No', p.performedBy])
            );
        }

        if (data.logs && data.logs.length > 0) {
            builder.addSubsectionTitle("Welfare & Care Log");
            builder.addTable(
                ['Time', 'Category', 'Action / Observation', 'Logged By'],
                data.logs.map(l => [
                    new Date(l.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                    l.category,
                    l.message,
                    l.author
                ])
            );
        }
    }

    // 9. BODY MAPS & IMAGES
    // Automatically include active Body Map if present
    const hasMedia = data.bodyMapImage || data.accessMapImage || (data.handover.media && data.handover.media.length > 0);
    const hasInjuries = data.injuries && data.injuries.length > 0;

    if (hasMedia || hasInjuries) {
        builder.addSectionTitle("Body Maps & Media Evidence");
        
        // List injuries first
        if (hasInjuries) {
            builder.addSubsectionTitle("Recorded Injuries");
            builder.addTable(
                ['Location', 'Type', 'Notes'],
                data.injuries.map(i => [i.location || 'Unknown', `${i.type} (${i.subtype || '-'})`, i.notes || '-'])
            );
        }

        if (data.bodyMapImage) await builder.addImage(await resolveImage(data.bodyMapImage), "Injury Body Map", 100);
        if (data.accessMapImage) await builder.addImage(await resolveImage(data.accessMapImage), "Vascular Access Map", 80);
        
        if (data.handover.media) {
            for (const item of data.handover.media) {
                await builder.addImage(await resolveImage(item.url), `Photo Evidence: ${item.notes || ''}`, 90);
            }
        }
    }

    // 10. DECISION & OUTCOME
    builder.addSectionTitle("Clinical Decision");
    builder.addFullWidthField("Working Impression", data.clinicalDecision.workingImpression);
    builder.addFullWidthField("Management Plan", data.clinicalDecision.managementPlan);
    builder.addGrid({
        "Final Disposition": data.clinicalDecision.finalDisposition,
        "Destination": data.clinicalDecision.destinationHospital || 'N/A'
    }, 2);

    // New: Pathway Data
    if (data.clinicalDecision.pathwayData?.pathwayName) {
        builder.addAlertBox("CLINICAL PATHWAY TRIGGERED", 
            `Protocol: ${data.clinicalDecision.pathwayData.pathwayName}\nOutcome: ${data.clinicalDecision.pathwayData.outcome}\nCriteria Met: ${data.clinicalDecision.pathwayData.criteriaMet.join(', ')}`
        );
    }

    // 11. GOVERNANCE (Capacity / Safeguarding)
    builder.addSectionTitle("Governance");
    builder.addGrid({
        "Capacity Status": data.governance.capacity.status,
        "Safeguarding Concerns": data.governance.safeguarding.concerns ? "YES - RAISED" : "No",
        "Refusal of Care": data.governance.refusal.isRefusal ? "YES" : "No"
    }, 3);

    if (data.governance.safeguarding.concerns) {
        builder.addAlertBox("SAFEGUARDING DETAILS", data.governance.safeguarding.details);
    }

    if (data.governance.worseningAdviceDetails) {
        builder.addFullWidthField("Worsening Advice / Safety Netting", data.governance.worseningAdviceDetails);
    }

    // 12. SIGNATURES
    builder.addSectionTitle("Signatures");
    builder.checkPageBreak(40);
    const sigY = builder.yPos;
    
    // Clinician Sig
    if (data.handover.clinicianSignature) {
        try {
            const sigImg = await resolveImage(data.handover.clinicianSignature);
            builder.doc.addImage(sigImg, 'PNG', builder.margin, sigY, 40, 20);
        } catch(e) {}
    }
    builder.doc.setFontSize(8);
    builder.doc.text("Lead Clinician", builder.margin, sigY + 25);
    builder.doc.text(data.assistingClinicians?.[0]?.name || "Clinician", builder.margin, sigY + 30);
    if (data.handover.clinicianSigTime) {
        builder.doc.text(`Signed: ${data.handover.clinicianSigTime}`, builder.margin, sigY + 35);
    }
    
    // Patient / Witness / Receiver Sig
    const sig2 = data.handover.patientSignature || data.handover.receivingClinicianSignature || data.governance.refusal.patientSignature;
    const sig2Time = data.handover.patientSigTime || data.handover.receivingSigTime || data.governance.refusal.patientSigTime;
    const sig2Label = data.handover.patientSignature 
        ? "Patient Signature" 
        : data.handover.receivingClinicianSignature 
            ? `Receiving: ${data.handover.receivingName}` 
            : "Patient/Witness Signature";

    if (sig2) {
        try {
            const sigImg = await resolveImage(sig2);
            builder.doc.addImage(sigImg, 'PNG', builder.margin + 60, sigY, 40, 20);
        } catch(e) {}
        builder.doc.text(sig2Label, builder.margin + 60, sigY + 25);
        if (sig2Time) {
            builder.doc.text(`Signed: ${sig2Time}`, builder.margin + 60, sigY + 30);
        }
    }

    builder.addFooter(data);
    return builder.doc;
};

// --- EXPORTS ---
function getAge(dob: string) {
    if (!dob) return '?';
    const ageDifMs = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(ageDifMs).getUTCFullYear() - 1970);
}

export const generateEPRF_PDF = async (data: EPRF) => {
    // This is mostly legacy if called directly, usually we use getEPRFBlob now
    const doc = await createEPRFDoc(data, 'FULL');
    doc.save(`ePRF_${data.incidentNumber}.pdf`);
};

export const getEPRFBlob = async (data: EPRF, mode: PDFMode = 'FULL') => {
    const doc = await createEPRFDoc(data, mode);
    return doc.output('blob');
};
