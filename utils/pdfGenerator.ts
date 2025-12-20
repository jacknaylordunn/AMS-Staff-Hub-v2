
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EPRF } from '../types';

const LOGO_URL = 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png';

const COLORS = {
    primary: '#0052CC',
    secondary: '#091E42',
    accent: '#00B8D9',
    grey: '#F4F5F7',
    text: '#172B4D',
    lightText: '#5E6C84',
    red: '#DE350B',
    green: '#00875A'
};

// Helper to handle offline/base64 images
const resolveImage = async (src: string | undefined): Promise<string> => {
    if (!src) return "";
    if (src.startsWith('OFFLINE_PENDING::')) {
        return src.split('::')[2];
    }
    if (src.startsWith('data:')) return src;
    
    // Fetch URL and convert to base64
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

    addHeader(title: string, data: EPRF, logoData?: string, subTitle?: string) {
        // Top Banner
        this.doc.setFillColor(COLORS.secondary);
        this.doc.rect(0, 0, this.pageWidth, 35, 'F');
        
        if (logoData) {
            try { this.doc.addImage(logoData, 'PNG', 15, 6, 22, 22); } catch (e) {}
        }

        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(18);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text("AEGIS MEDICAL SOLUTIONS", 45, 16);
        
        this.doc.setFontSize(11);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(title.toUpperCase(), 45, 24);
        if (subTitle) {
            this.doc.setFontSize(9);
            this.doc.text(subTitle, 45, 30);
        }

        // Right side meta
        this.doc.setFontSize(9);
        this.doc.text(`REF: ${data.incidentNumber}`, this.pageWidth - 15, 12, { align: 'right' });
        this.doc.text(`INCIDENT DATE: ${data.times.incidentDate || new Date().toLocaleDateString()}`, this.pageWidth - 15, 17, { align: 'right' });
        this.doc.text(`LOC: ${data.location}`, this.pageWidth - 15, 22, { align: 'right' });
        
        this.yPos = 45;
    }

    addSectionTitle(title: string) {
        this.checkPageBreak(15);
        this.doc.setFillColor(COLORS.grey);
        this.doc.setDrawColor(COLORS.primary);
        this.doc.rect(this.margin, this.yPos, this.pageWidth - (this.margin * 2), 8, 'F');
        this.doc.line(this.margin, this.yPos, this.margin, this.yPos + 8); // Accent line
        
        this.doc.setTextColor(COLORS.primary);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(title.toUpperCase(), this.margin + 4, this.yPos + 5.5);
        this.yPos += 14;
    }

    addField(label: string, value: any, inline = false, highlight = false) {
        let valStr = '-';
        if (value === true) valStr = 'YES';
        else if (value === false) valStr = 'No';
        else if (value !== undefined && value !== null && String(value).trim() !== '') valStr = String(value);
        
        // Always show inline fields, but skip empty full-width fields to save space
        if (valStr === '-' && !inline) return; 

        this.doc.setFontSize(9);
        
        if (inline) {
            const labelWidth = this.doc.getTextWidth(label + ": ");
            // Use current Y if plenty of space, else check
            this.checkPageBreak(6);
            
            this.doc.setTextColor(COLORS.lightText);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(label + ": ", this.margin, this.yPos);
            
            this.doc.setTextColor(highlight ? COLORS.red : COLORS.text);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(valStr, this.margin + labelWidth, this.yPos);
            this.yPos += 5;
        } else {
            this.checkPageBreak(15);
            this.doc.setTextColor(COLORS.lightText);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(label, this.margin, this.yPos);
            this.yPos += 4;
            
            this.doc.setTextColor(highlight ? COLORS.red : COLORS.text);
            this.doc.setFont('helvetica', 'normal');
            
            const splitText = this.doc.splitTextToSize(valStr, this.pageWidth - (this.margin * 2));
            this.doc.text(splitText, this.margin, this.yPos);
            this.yPos += (splitText.length * 4) + 6; // Spacing
        }
    }

    addGrid(data: Record<string, any>) {
        this.checkPageBreak(20);
        const keys = Object.keys(data);
        if (keys.length === 0) return;

        let xOffset = this.margin;
        let startY = this.yPos;
        
        keys.forEach((key, i) => {
            const val = data[key];
            const strVal = val === true ? 'YES' : val === false ? 'No' : String(val || '-');
            
            this.doc.setFontSize(8);
            this.doc.setTextColor(COLORS.lightText);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(key.toUpperCase(), xOffset, this.yPos);
            
            this.doc.setTextColor(COLORS.text);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(strVal, xOffset, this.yPos + 4);

            if (i % 2 === 0) {
                xOffset = this.pageWidth / 2 + 5;
            } else {
                xOffset = this.margin;
                this.yPos += 10;
                this.checkPageBreak(10);
            }
        });
        if (keys.length % 2 !== 0) this.yPos += 10;
    }

    addTable(head: string[], body: any[][]) {
        if (body.length === 0) return;
        
        autoTable(this.doc, {
            startY: this.yPos,
            head: [head],
            body: body,
            theme: 'striped',
            headStyles: { fillColor: COLORS.secondary, textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
            margin: { left: this.margin, right: this.margin },
        });
        this.yPos = (this.doc as any).lastAutoTable.finalY + 10;
    }

    addImage(base64: string, label: string) {
        if (!base64 || base64.length < 100) return;
        const imgH = 80;
        const imgW = 80;
        
        this.checkPageBreak(imgH + 15);
        try {
            this.doc.addImage(base64, 'PNG', this.margin, this.yPos, imgW, imgH);
            this.doc.setFontSize(8);
            this.doc.setTextColor(COLORS.lightText);
            this.doc.text(label, this.margin, this.yPos + imgH + 5);
            this.yPos += imgH + 15;
        } catch (e) { console.error("Image render error", e); }
    }

    addFooter(data: EPRF) {
        const pageCount = this.doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i);
            this.doc.setFontSize(8);
            this.doc.setTextColor(150);
            this.doc.text(
                `Page ${i} of ${pageCount} | ${data.incidentNumber} | Generated: ${new Date().toLocaleString()}`,
                this.pageWidth / 2,
                this.pageHeight - 10,
                { align: 'center' }
            );
        }
    }
}

export const createEPRFDoc = async (data: EPRF, type: 'FULL' | 'REFERRAL' | 'SAFEGUARDING'): Promise<jsPDF> => {
    const pdf = new PDFBuilder();
    let logoData = '';
    try { logoData = await resolveImage(LOGO_URL); } catch (e) {}

    // --- CASE 1: SAFEGUARDING ---
    if (type === 'SAFEGUARDING') {
        pdf.addHeader("SAFEGUARDING REFERRAL FORM", data, logoData, "STRICTLY CONFIDENTIAL");
        
        pdf.addSectionTitle("Patient Details");
        pdf.addGrid({
            "Name": `${data.patient.firstName} ${data.patient.lastName}`,
            "DOB": data.patient.dob,
            "NHS No": data.patient.nhsNumber,
            "Gender": data.patient.gender,
            "Address": `${data.patient.address}, ${data.patient.postcode}`
        });

        pdf.addSectionTitle("Safeguarding Concerns");
        pdf.addField("Category", data.governance.safeguarding.category, true);
        pdf.addField("Types", data.governance.safeguarding.type?.join(', '), true);
        pdf.addField("Detailed Concern", data.governance.safeguarding.details);
        
        pdf.addSectionTitle("Actions Taken");
        pdf.addGrid({
            "Referral Made": data.governance.safeguarding.referralMade,
            "Reference No": data.governance.safeguarding.referralReference,
            "Immediate Risk": "See Narrative"
        });

        pdf.addSectionTitle("Clinician");
        pdf.addGrid({
            "Name": data.handover.clinicianSignature ? "Signed Electronically" : data.assistingClinicians?.[0]?.name,
            "Role": data.assistingClinicians?.[0]?.role,
            "Date": new Date().toLocaleDateString()
        });
        
        pdf.addFooter(data);
        return pdf.doc;
    }

    // --- CASE 2: GP REFERRAL ---
    if (type === 'REFERRAL') {
        pdf.addHeader("CLINICAL REFERRAL LETTER", data, logoData, "URGENT MEDICAL REFERRAL");

        pdf.addSectionTitle("Patient Details");
        pdf.addGrid({
            "Name": `${data.patient.firstName} ${data.patient.lastName}`,
            "DOB": data.patient.dob,
            "NHS No": data.patient.nhsNumber,
            "Address": data.patient.address
        });

        pdf.addSectionTitle("Reason for Referral");
        pdf.addField("Presenting Complaint", data.history.presentingComplaint);
        pdf.addField("History", data.history.historyOfPresentingComplaint);

        pdf.addSectionTitle("Clinical Observations (Latest)");
        if (data.vitals.length > 0) {
            const v = data.vitals[data.vitals.length - 1];
            pdf.addGrid({
                "BP": `${v.bpSystolic}/${v.bpDiastolic}`,
                "Pulse": v.hr,
                "SpO2": `${v.spo2}%`,
                "Resp Rate": v.rr,
                "Temp": v.temp,
                "NEWS2": v.news2Score
            });
        } else {
            pdf.addField("Vitals", "None recorded");
        }

        pdf.addSectionTitle("Assessment Findings");
        pdf.addField("Summary", data.assessment.clinicalNarrative);
        pdf.addField("Plan", data.clinicalDecision.managementPlan);

        pdf.addSectionTitle("Referring Clinician");
        pdf.addGrid({
            "Name": data.assistingClinicians?.[0]?.name,
            "Role": data.assistingClinicians?.[0]?.role
        });

        pdf.addFooter(data);
        return pdf.doc;
    }

    // --- CASE 3: FULL RECORD (Clinical / Welfare / Minor) ---
    
    const modeLabel = data.mode === 'Welfare' ? 'WELFARE CHECK RECORD' : data.mode === 'Minor' ? 'MINOR INJURY RECORD' : 'CLINICAL PATIENT RECORD';
    pdf.addHeader(modeLabel, data, logoData);

    // 1. Incident
    pdf.addSectionTitle("Incident & Patient");
    pdf.addGrid({
        "Incident No": data.incidentNumber,
        "Call Sign": data.callSign,
        "Date": data.times.incidentDate,
        "Time Called": data.times.callReceived,
        "On Scene": data.times.onScene,
        "Patient Name": `${data.patient.firstName} ${data.patient.lastName}`,
        "DOB": data.patient.dob,
        "Address": data.patient.address
    });
    
    if (data.patient.dnacpr?.hasDNACPR) {
        pdf.addField("DNACPR STATUS", `IN PLACE (Verified: ${data.patient.dnacpr.verified ? 'Yes' : 'No'})`, true, true);
    }

    // 2. History (Skipped for simple welfare if empty)
    if (data.history.presentingComplaint || data.history.historyOfPresentingComplaint) {
        pdf.addSectionTitle("History");
        pdf.addField("PC", data.history.presentingComplaint);
        pdf.addField("HPC", data.history.historyOfPresentingComplaint);
        pdf.addField("Medical History", data.history.pastMedicalHistory);
        pdf.addField("Meds", data.history.medications);
        pdf.addField("Allergies", data.history.allergies, true, data.history.allergies !== 'NKDA');
    }

    // 3. Vitals & Assessment
    if (data.vitals.length > 0) {
        pdf.addSectionTitle("Vital Signs");
        const vRows = data.vitals.map(v => [
            v.time,
            v.rrRefused ? 'REF' : (v.rr?.toString() || '-'),
            v.spo2Refused ? 'REF' : (v.spo2 ? `${v.spo2}%` : '-'),
            v.bpRefused ? 'REF' : `${v.bpSystolic || '-'}/${v.bpDiastolic || '-'}`,
            v.hrRefused ? 'REF' : (v.hr?.toString() || '-'),
            v.tempRefused ? 'REF' : (v.temp?.toString() || '-'),
            v.gcsRefused ? 'REF' : (v.avpu === 'A' ? (v.gcs?.toString() || '15') : v.avpu),
            v.bloodGlucoseRefused ? 'REF' : (v.bloodGlucose?.toString() || '-'),
            v.news2Score.toString()
        ]);
        pdf.addTable(['Time', 'RR', 'SpO2', 'BP', 'HR', 'Temp', 'GCS', 'BM', 'NEWS2'], vRows);
    }

    if (data.assessment.clinicalNarrative) {
        pdf.addSectionTitle("Examination / Narrative");
        pdf.addField("Findings", data.assessment.clinicalNarrative);
    }

    // 4. Treatments (Combined Drugs, Procedures, Welfare Actions)
    const hasDrugs = data.treatments.drugs.length > 0;
    const hasProcs = data.treatments.procedures.length > 0;
    
    if (hasDrugs || hasProcs) {
        pdf.addSectionTitle("Treatments & Interventions");
        
        if (hasDrugs) {
            const dRows = data.treatments.drugs.map(d => [d.time, d.drugName, d.dose, d.route, d.administeredBy]);
            pdf.addTable(['Time', 'Drug', 'Dose', 'Route', 'Admin By'], dRows);
        }
        
        if (hasProcs) {
            const pRows = data.treatments.procedures.map(p => [p.time, p.type, p.site || '-', p.details || '-', p.performedBy]);
            pdf.addTable(['Time', 'Intervention', 'Site', 'Details', 'By'], pRows);
        }
    }

    // 5. Maps (Injury & Access)
    if (data.injuries.length > 0) {
        pdf.addSectionTitle("Visual Body Map Log");
        const iRows = data.injuries.map(i => [
            i.location || 'Unknown', 
            i.type, 
            i.type === 'IV' || i.type === 'IO' ? `${i.device} ${i.gauge}` : i.subtype || '-', 
            i.success !== undefined ? (i.success ? 'Success' : 'Fail') : '-',
            i.time || '-'
        ]);
        pdf.addTable(['Location', 'Type', 'Detail', 'Outcome', 'Time'], iRows);
    }

    if (data.bodyMapImage) {
        const img = await resolveImage(data.bodyMapImage);
        pdf.addImage(img, "Injury Map");
    }
    if (data.accessMapImage) {
        const img = await resolveImage(data.accessMapImage);
        pdf.addImage(img, "Vascular Access Map");
    }

    // 6. Outcome
    pdf.addSectionTitle("Outcome & Governance");
    pdf.addField("Impression", data.clinicalDecision.workingImpression, true);
    pdf.addField("Disposition", data.clinicalDecision.finalDisposition, true);
    pdf.addField("Plan", data.clinicalDecision.managementPlan);
    
    if (data.governance.safeguarding.concerns) {
        pdf.addField("Safeguarding", "CONCERNS RAISED", true, true);
    }
    
    if (data.governance.refusal.isRefusal) {
        pdf.addField("Refusal", "PATIENT REFUSED CARE - See signed declaration.", true, true);
    }

    // 7. Signatures
    pdf.checkPageBreak(40);
    const sigY = pdf.yPos;
    
    if (data.handover.clinicianSignature) {
        const sig = await resolveImage(data.handover.clinicianSignature);
        if (sig) {
            pdf.doc.addImage(sig, 'PNG', pdf.margin, sigY, 40, 20);
            pdf.doc.setFontSize(8);
            pdf.doc.text("Lead Clinician", pdf.margin, sigY + 25);
        }
    }

    if (data.handover.receivingClinicianSignature) {
        const sig = await resolveImage(data.handover.receivingClinicianSignature);
        if (sig) {
            pdf.doc.addImage(sig, 'PNG', pdf.margin + 50, sigY, 40, 20);
            pdf.doc.setFontSize(8);
            pdf.doc.text("Receiving Clinician", pdf.margin + 50, sigY + 25);
        }
    }

    pdf.addFooter(data);
    return pdf.doc;
};

export const generateEPRF_PDF = async (data: EPRF) => {
    const doc = await createEPRFDoc(data, 'FULL');
    doc.save(`ePRF_${data.incidentNumber}.pdf`);
};

export const getEPRFBlob = async (data: EPRF): Promise<Blob> => {
    const doc = await createEPRFDoc(data, 'FULL');
    return doc.output('blob');
};

export const generateGPReferral = async (data: EPRF) => {
    const doc = await createEPRFDoc(data, 'REFERRAL'); 
    doc.save(`GP_Referral_${data.incidentNumber}.pdf`);
};

export const generateSafeguardingPDF = async (data: EPRF) => {
    const doc = await createEPRFDoc(data, 'SAFEGUARDING');
    doc.save(`Safeguarding_${data.incidentNumber}.pdf`);
};
