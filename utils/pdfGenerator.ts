import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EPRF, VitalsEntry, DrugAdministration, Procedure, InjuryMark, MediaAttachment } from '../types';

// --- CONFIGURATION ---
const LOGO_URL = 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png';

const COLORS = {
    primary: '#003366',    // Dark Navy (Professional / Legal)
    secondary: '#0052CC',  // AMS Blue
    accent: '#00B8D9',     // Cyan
    headerBg: '#F4F5F7',   // Light Grey
    text: '#172B4D',       // Dark Slate
    lightText: '#6B778C',  // Muted Text
    red: '#DE350B',        // Critical/Alert
    green: '#00875A',      // Success/Normal
    white: '#FFFFFF',
    border: '#DFE1E6'
};

// --- TYPES ---
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

const formatValue = (val: any, fallback = 'Not Recorded'): string => {
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
        this.doc.text(`Incident Ref: ${data.incidentNumber}`, this.pageWidth - 15, 20, { align: 'right' });
        this.doc.text(`Date: ${new Date(data.times.incidentDate || Date.now()).toLocaleDateString()}`, this.pageWidth - 15, 25, { align: 'right' });
        this.doc.text(`Call Sign: ${data.callSign || 'N/A'}`, this.pageWidth - 15, 30, { align: 'right' });

        this.yPos = headerHeight + 10;
    }

    addFooter(data: EPRF) {
        const pageCount = this.doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i);
            this.doc.setFontSize(8);
            this.doc.setTextColor(100);
            const patientId = data.patient.lastName ? `${data.patient.lastName.toUpperCase()}, ${data.patient.firstName}` : 'Unknown Patient';
            this.doc.text(`Patient: ${patientId} (${data.patient.nhsNumber || 'No NHS No'})`, this.margin, this.pageHeight - 10);
            this.doc.text(`Page ${i} of ${pageCount}`, this.pageWidth / 2, this.pageHeight - 10, { align: 'center' });
            this.doc.text("CONFIDENTIAL - GDPR PROTECTED", this.pageWidth - this.margin, this.pageHeight - 10, { align: 'right' });
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
            if (['CRITICAL', 'HIGH RISK', 'POSITIVE', 'YES - TRIGGERED'].includes(displayVal.toUpperCase())) this.doc.setTextColor(COLORS.red);

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
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
            margin: { left: this.margin, right: this.margin },
            didDrawPage: (data) => { this.yPos = data.cursor.y + 10; }
        });
        this.yPos = (this.doc as any).lastAutoTable.finalY + 10;
    }

    async addImage(base64: string, label: string, height = 80) {
        if (!base64 || base64.length < 100) return;
        this.checkPageBreak(height + 15);
        try {
            this.doc.addImage(base64, 'PNG', this.margin, this.yPos, 100, height);
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

    // 1. HEADER & TITLE
    let docTitle = "Patient Report";
    if (mode === 'SAFEGUARDING') docTitle = "Safeguarding Referral";
    if (mode === 'REFERRAL') docTitle = "GP / Clinical Referral";
    if (mode === 'TRAUMA_HANDOVER') docTitle = "Trauma Handover (ATMIST)";
    if (mode === 'FULL') {
        if (data.mode === 'Clinical') docTitle = "Clinical Patient Record";
        if (data.mode === 'Welfare') docTitle = "Welfare / Social Record";
        if (data.mode === 'Minor') docTitle = "Minor Injury Record";
    }

    builder.addHeader(docTitle, data, logoData, mode === 'SAFEGUARDING' ? 'CONFIDENTIAL' : undefined);

    // 2. PATIENT DETAILS
    builder.addSectionTitle("Patient & Incident Details");
    const pt = data.patient;
    const isSafeguarding = mode === 'SAFEGUARDING';

    builder.addGrid({
        "Incident Date": data.times.incidentDate,
        "Location": data.location,
        "Patient Name": `${pt.firstName} ${pt.lastName}`,
        "DOB / Age": `${pt.dob} (${getAge(pt.dob)})`,
        "NHS Number": pt.nhsNumber,
        "Gender": pt.gender,
        "Address": pt.address,
        "Postcode": pt.postcode,
        "GP Practice": data.clinicalDecision.gpPractice
    }, 3);

    if (pt.dnacpr?.hasDNACPR) {
        builder.addAlertBox("DNACPR / ADVANCE DIRECTIVE", 
            `DNACPR IN PLACE. Verified: ${pt.dnacpr.verified ? "YES" : "NO"}. Date Issued: ${pt.dnacpr.dateIssued || 'Unknown'}`
        );
    }

    // 3. TIMELINE (Clinical)
    if (mode === 'FULL' && data.mode === 'Clinical') {
        const times = data.times;
        builder.addSubsectionTitle("Timeline Log");
        builder.addGrid({
            "Call Received": times.callReceived,
            "Mobile": times.mobile,
            "On Scene": times.onScene,
            "Patient Contact": times.patientContact,
            "Depart Scene": times.departScene,
            "At Hospital": times.atHospital,
            "Clear": times.clear
        }, 4);
    }

    // 4. HISTORY (All except Safeguarding)
    if (!isSafeguarding) {
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
    }

    // 5. PRIMARY SURVEY (Clinical Only)
    if (mode === 'FULL' && data.mode === 'Clinical') {
        builder.addSectionTitle("Primary Survey (ABCDE)");
        const p = data.assessment.primary;
        builder.addTable(
            ['Param', 'Assessment', 'Finding', 'Intervention / Notes'],
            [
                ['<C>', 'Catastrophic Haemorrhage', p.catastrophicHaemorrhage ? 'POSITIVE' : 'Negative', '-'],
                ['A', 'Airway Status', p.airway.status, p.airway.intervention || p.airway.notes],
                ['B', 'Breathing', `RR: ${p.breathing.rate} | Sats: ${p.breathing.oxygenSats}%`, `Effort: ${p.breathing.effort} | AE: ${p.breathing.airEntryL}/${p.breathing.airEntryR}`],
                ['C', 'Circulation', `Pulse: ${p.circulation.radialPulse} | BP: ${p.circulation.systolicBP}/${p.circulation.diastolicBP}`, `Skin: ${p.circulation.skin} | CRT: ${p.circulation.capRefill}`],
                ['D', 'Disability', `AVPU: ${p.disability.avpu} | GCS: ${p.disability.gcs}`, `Pupils: ${p.disability.pupils} | BM: ${p.disability.bloodGlucose}`],
                ['E', 'Exposure', `Temp: ${p.exposure.temp}`, p.exposure.injuriesFound ? 'Injuries Found' : 'No obvious injuries']
            ]
        );
    }

    // 6. VITALS (All except Safeguarding)
    if (!isSafeguarding && data.vitals.length > 0) {
        builder.addSectionTitle("Vital Signs Log");
        builder.addTable(
            ['Time', 'RR', 'SpO2', 'O2', 'BP', 'HR', 'Temp', 'GCS', 'BM', 'NEWS2', 'Pain'],
            data.vitals.map(v => [
                v.time,
                v.rrRefused ? 'Ref' : String(v.rr || '-'),
                v.spo2Refused ? 'Ref' : `${v.spo2 || '-'}%`,
                v.oxygen ? `${v.oxygenDevice || 'Supp'} (${v.oxygenFlow || ''})` : 'Air',
                v.bpRefused ? 'Ref' : `${v.bpSystolic || '-'}/${v.bpDiastolic || '-'}`,
                v.hrRefused ? 'Ref' : String(v.hr || '-'),
                v.tempRefused ? 'Ref' : String(v.temp || '-'),
                v.gcsRefused ? 'Ref' : String(v.gcs || v.avpu || '-'),
                v.bloodGlucoseRefused ? 'Ref' : String(v.bloodGlucose || '-'),
                String(v.news2Score),
                v.painScoreRefused ? 'Ref' : String(v.painScore || '-')
            ]),
            'grid'
        );
    }

    // 7. DETAILED ASSESSMENTS (Adaptive)
    if (mode === 'FULL' || mode === 'REFERRAL') {
        builder.addSectionTitle("Detailed Assessment");

        // Narrative
        builder.addFullWidthField("Examination Narrative", data.assessment.clinicalNarrative);
        if (data.mode === 'Minor') builder.addFullWidthField("Minor Injury Assessment", data.assessment.minorInjuryAssessment || "See Narrative");

        // -- NEURO --
        if (data.assessment.neuro?.gcs?.total || data.assessment.neuro?.fast?.testPositive) {
            builder.addSubsectionTitle("Neurological Assessment");
            const n = data.assessment.neuro;
            builder.addGrid({
                "GCS Total": `${n.gcs.total}/15 (E${n.gcs.eyes} V${n.gcs.verbal} M${n.gcs.motor})`,
                "Pupils (L)": `Size: ${n.pupils.leftSize}mm | React: ${n.pupils.leftReaction}`,
                "Pupils (R)": `Size: ${n.pupils.rightSize}mm | React: ${n.pupils.rightReaction}`,
                "FAST Test": n.fast.testPositive ? "POSITIVE" : "Negative"
            });
            if (n.limbs) {
                builder.addGrid({
                    "L.Arm Power": n.limbs.leftArm.power, "L.Arm Sens": n.limbs.leftArm.sensation,
                    "R.Arm Power": n.limbs.rightArm.power, "R.Arm Sens": n.limbs.rightArm.sensation,
                    "L.Leg Power": n.limbs.leftLeg.power, "L.Leg Sens": n.limbs.leftLeg.sensation,
                    "R.Leg Power": n.limbs.rightLeg.power, "R.Leg Sens": n.limbs.rightLeg.sensation,
                }, 4);
            }
        }

        // -- RESPIRATORY --
        if (data.assessment.respiratory) {
            builder.addSubsectionTitle("Respiratory Assessment");
            const r = data.assessment.respiratory;
            builder.addGrid({
                "Air Entry": r.airEntry,
                "Added Sounds": r.addedSounds,
                "Cough": r.cough,
                "Sputum": r.sputumColor,
                "Accessory Muscle": r.accessoryMuscleUse ? "YES" : "No",
                "Tracheal Tug": r.trachealTug ? "YES" : "No",
                "Peak Flow": `Pre: ${r.peakFlowPre || '-'} | Post: ${r.peakFlowPost || '-'}`,
                "Nebulisers Given": r.nebulisersGiven ? "YES" : "No"
            });
        }

        // -- CARDIAC --
        if (data.assessment.cardiac) {
            builder.addSubsectionTitle("Cardiac Assessment");
            const c = data.assessment.cardiac;
            builder.addGrid({
                "Chest Pain": c.chestPainPresent ? "YES" : "No",
                "ECG Rhythm": c.ecg?.rhythm,
                "ECG Rate": c.ecg?.rate,
                "STEMI Criteria": c.ecg?.stChanges ? "MET - POSITIVE" : "Not Met",
                "ST Changes": c.ecg?.stDetails?.type || "None"
            });
            if (c.socrates) {
                builder.addGrid({
                    "Site": c.socrates.site, "Onset": c.socrates.onset, "Character": c.socrates.character,
                    "Radiation": c.socrates.radiation, "Assoc. Symptoms": c.socrates.associations,
                    "Time Course": c.socrates.timeCourse, "Exacerbating": c.socrates.exacerbatingRelieving, "Severity": `${c.socrates.severity}/10`
                }, 2);
            }
        }

        // -- GASTROINTESTINAL --
        if (data.assessment.gastrointestinal) {
            builder.addSubsectionTitle("Gastrointestinal / Abdomen");
            const g = data.assessment.gastrointestinal;
            builder.addGrid({
                "Abdo Pain": g.abdominalPain ? "YES" : "No",
                "Location": g.painLocation,
                "Palpation": g.palpation,
                "Distension": g.distension,
                "Bowel Sounds": g.bowelSounds,
                "Last Meal": g.lastMeal,
                "Last Bowel Mov": g.lastBowelMovement,
                "FAST Scan": g.fastScan || "Not Performed"
            });
            if (g.quadrants) {
                builder.addGrid({
                    "RUQ": g.quadrants.ruq, "LUQ": g.quadrants.luq,
                    "RLQ": g.quadrants.rlq, "LLQ": g.quadrants.llq
                }, 4);
            }
        }

        // -- OBS / GYNAE --
        if (data.assessment.obsGynae) {
            builder.addSubsectionTitle("Obstetrics & Gynaecology");
            const ob = data.assessment.obsGynae;
            builder.addGrid({
                "Pregnant": ob.pregnant ? "YES" : "No",
                "Gestation": ob.gestationWeeks || "N/A",
                "Gravida/Para": `${ob.gravida || '-'}/${ob.para || '-'}`,
                "Contractions": ob.contractions || "None",
                "Membranes": ob.membranesRuptured ? "Ruptured" : "Intact",
                "Bleeding": ob.bleeding ? `YES - ${ob.bleedAmount}` : "None"
            });
        }

        // -- MENTAL HEALTH --
        if (data.assessment.mentalHealth) {
            builder.addSubsectionTitle("Mental Health");
            const mh = data.assessment.mentalHealth;
            builder.addGrid({
                "Appearance": mh.appearance,
                "Behaviour": mh.behaviour,
                "Speech": mh.speech,
                "Mood": mh.mood,
                "Risk to Self": mh.riskToSelf ? "YES" : "No",
                "Risk to Others": mh.riskToOthers ? "YES" : "No"
            });
        }

        // -- WOUNDS --
        if (data.assessment.wounds && data.assessment.wounds.length > 0) {
            builder.addSubsectionTitle("Wound Assessment");
            builder.addTable(
                ['Site', 'Class', 'Dimensions', 'Contamination', 'Tetanus Status'],
                data.assessment.wounds.map(w => [w.site, w.classification, w.dimensions, w.contamination, w.tetanusStatus])
            );
        }

        // -- BURNS --
        if (data.assessment.burns?.estimatedPercentage) {
            builder.addSubsectionTitle("Burns Assessment");
            builder.addGrid({
                "Site": data.assessment.burns.site,
                "TBSA %": data.assessment.burns.estimatedPercentage,
                "Depth": data.assessment.burns.depth
            });
        }

        // -- SEPSIS --
        if (data.assessment.sepsis?.screeningTrigger) {
             builder.addSubsectionTitle("Sepsis Screening Tool");
             const s = data.assessment.sepsis;
             builder.addGrid({
                 "Screening Triggered": "YES",
                 "Red Flags": s.redFlags.length > 0 ? s.redFlags.join(', ') : "None",
                 "Risk Factors": s.riskFactors.length > 0 ? s.riskFactors.join(', ') : "None",
                 "Sepsis Outcome": s.outcome
             });
        }

        // -- TRAUMA TRIAGE --
        if (data.assessment.traumaTriage) {
            builder.addSubsectionTitle("Major Trauma Triage");
            const t = data.assessment.traumaTriage;
            builder.addGrid({
                "Major Trauma": t.isMajorTrauma ? "YES - TRIGGERED" : "No",
                "Physiology": t.physiology ? "Triggered" : "-",
                "Anatomy": t.anatomy ? "Triggered" : "-",
                "Mechanism": t.mechanism ? "Triggered" : "-"
            });
        }
        
        // -- SOCIAL & FALLS --
        if (data.assessment.cfsScore || data.assessment.falls || data.assessment.social) {
             builder.addSubsectionTitle("Social, Falls & Frailty");
             builder.addGrid({
                 "CFS Score": data.assessment.cfsScore ? `${data.assessment.cfsScore}` : "Not Assessed",
                 "History of Falls": data.assessment.falls?.historyOfFalls ? "YES" : "No",
                 "Anticoagulants": data.assessment.falls?.anticoagulants || "Not Recorded",
                 "Living Status": data.assessment.social?.livingStatus || "Not Recorded",
                 "Carers": data.assessment.social?.carers ? "YES" : "No",
                 "Access Keys": data.assessment.social?.accessKeys ? "Yes" : "No"
             });
        }
    }

    // 8. TREATMENTS
    if (!isSafeguarding) {
        const hasDrugs = data.treatments.drugs.length > 0;
        const hasProcs = data.treatments.procedures.length > 0;
        const hasResus = data.treatments.resusLog && data.treatments.resusLog.length > 0;
        const role = data.treatments.role;

        if (hasDrugs || hasProcs || hasResus || role) {
            builder.addSectionTitle("Treatments & Interventions");
            
            if (hasDrugs) {
                builder.addSubsectionTitle("Medications Administered");
                builder.addTable(
                    ['Time', 'Drug', 'Dose', 'Route', 'Batch', 'Admin By', 'Witness'],
                    data.treatments.drugs.map(d => [d.time, d.drugName, d.dose, d.route, d.batchNumber || '-', d.administeredBy, d.witnessedBy || '-'])
                );
            }

            if (hasProcs) {
                builder.addSubsectionTitle("Procedures");
                builder.addTable(
                    ['Time', 'Procedure', 'Site', 'Details', 'Success', 'By'],
                    data.treatments.procedures.map(p => [p.time, p.type, p.site || '-', p.details || '-', p.success ? 'Yes' : 'No', p.performedBy])
                );
            }

            if (role) {
                builder.addSubsectionTitle("Resuscitation & ROLE Verification");
                builder.addGrid({
                    "Verification Time": role.timeVerified,
                    "Verified By": role.verifiedBy,
                    "Arrest Witnessed": role.arrestWitnessed ? "Yes" : "No",
                    "Bystander CPR": role.bystanderCPR ? "Yes" : "No",
                    "No of Shocks": role.totalShocks,
                    "Down Time": `${role.downTimeMinutes} mins`
                });
                builder.addFullWidthField("ROLE Criteria Met", role.criteriaMet.join(', '));
            }

            if (hasResus) {
                builder.addSubsectionTitle("Resuscitation Log");
                builder.addTable(
                    ['Time', 'Action', 'Type', 'Clinician'],
                    data.treatments.resusLog!.map(r => [new Date(r.timestamp).toLocaleTimeString(), r.action, r.type, r.user])
                );
            }
        }
    }

    // 9. MEDIA & BODY MAPS
    if (mode === 'FULL') {
        let hasImages = false;
        if (data.bodyMapImage) hasImages = true;
        if (data.accessMapImage) hasImages = true;
        if (data.handover.media && data.handover.media.length > 0) hasImages = true;

        if (hasImages) {
            builder.addSectionTitle("Diagrams & Media Evidence");
            if (data.bodyMapImage) await builder.addImage(await resolveImage(data.bodyMapImage), "Injury / Body Map", 100);
            if (data.accessMapImage) await builder.addImage(await resolveImage(data.accessMapImage), "Vascular Access Map", 80);
            
            if (data.handover.media) {
                for (const item of data.handover.media) {
                    await builder.addImage(await resolveImage(item.url), `Uploaded: ${item.notes || 'Evidence'} (${new Date(item.timestamp).toLocaleTimeString()})`, 90);
                }
            }
        }
        
        if (data.injuries.length > 0) {
             builder.addSubsectionTitle("Injury & Mark Log");
             builder.addTable(
                 ['Location', 'Type', 'Notes', 'Success'],
                 data.injuries.map(i => [i.location || 'Map', i.type, i.notes || i.subtype || '-', i.success === undefined ? '-' : (i.success ? 'Yes' : 'No')])
             );
        }
    }

    // 10. DECISION & GOVERNANCE
    if (!isSafeguarding) {
        builder.addSectionTitle("Clinical Decision & Governance");
        
        builder.addFullWidthField("Working Impression", data.clinicalDecision.workingImpression);
        builder.addFullWidthField("Management Plan", data.clinicalDecision.managementPlan);
        
        builder.addGrid({
            "Final Disposition": data.clinicalDecision.finalDisposition,
            "Destination": data.clinicalDecision.destinationHospital || 'N/A',
            "Worsening Advice": data.governance.worseningAdviceDetails ? "Given & Documented" : "Not Recorded"
        });

        builder.addSubsectionTitle("Mental Capacity Act (MCA)");
        builder.addGrid({
            "Capacity Status": data.governance.capacity.status.toUpperCase(),
            "Stage 1 (Impairment)": data.governance.capacity.stage1?.impairment ? "Yes" : "No",
            "Stage 2 (Understanding)": data.governance.capacity.stage2Functional?.understand ? "Yes" : "NO",
            "Best Interests": data.governance.capacity.bestInterestsRationale || "N/A"
        });

        if (data.governance.safeguarding.concerns) {
            builder.addAlertBox("SAFEGUARDING CONCERN", 
                `Category: ${data.governance.safeguarding.category}\nDetails: ${data.governance.safeguarding.details}\nReferral Made: ${data.governance.safeguarding.referralMade ? 'YES' : 'NO'}`
            );
        }

        if (data.governance.refusal.isRefusal) {
             builder.addAlertBox("REFUSAL OF CARE / ADVICE",
                `Patient refused: ${data.governance.refusal.type}\nCapacity Confirmed: ${data.governance.refusal.capacityConfirmed ? 'YES' : 'NO'}\nRisks Explained: ${data.governance.refusal.risksExplained ? 'YES' : 'NO'}`
             );
             builder.addGrid({
                 "Patient Signature": data.governance.refusal.patientSignature ? "SIGNED" : "Refused",
                 "Witness": data.governance.refusal.witnessName || "N/A",
                 "Witness Signature": data.governance.refusal.witnessSignature ? "SIGNED" : "N/A"
             });
        }
    }

    // 11. SIGNATURES
    builder.addSectionTitle("Signatures & Handover");
    if (data.handover.receivingName) {
        builder.addGrid({ "Handover To": data.handover.receivingName, "Grade/Pin": data.handover.receivingPin, "Time": data.handover.receivingTime });
    }

    builder.checkPageBreak(40);
    const sigY = builder.yPos;
    
    if (data.handover.clinicianSignature) {
        try {
            const sigImg = await resolveImage(data.handover.clinicianSignature);
            builder.doc.addImage(sigImg, 'PNG', builder.margin, sigY, 40, 20);
        } catch(e) {}
    }
    builder.doc.setFontSize(8);
    builder.doc.text("Lead Clinician", builder.margin, sigY + 25);
    builder.doc.text(data.assistingClinicians?.[0]?.name || "Clinician", builder.margin, sigY + 30);
    builder.doc.text(data.assistingClinicians?.[0]?.role || "", builder.margin, sigY + 34);

    if (data.handover.patientSignature || data.handover.receivingClinicianSignature) {
        const sigData = data.handover.patientSignature || data.handover.receivingClinicianSignature;
        try {
            const sigImg = await resolveImage(sigData);
            builder.doc.addImage(sigImg, 'PNG', builder.margin + 60, sigY, 40, 20);
        } catch(e) {}
        builder.doc.text(data.handover.patientSignature ? "Patient Signature" : "Receiving Clinician Signature", builder.margin + 60, sigY + 25);
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
    const doc = await createEPRFDoc(data, 'FULL');
    doc.save(`ePRF_${data.incidentNumber}.pdf`);
};

export const generateGPReferral = async (data: EPRF) => {
    const doc = await createEPRFDoc(data, 'REFERRAL');
    doc.save(`GP_Referral_${data.incidentNumber}.pdf`);
};

export const generateSafeguardingPDF = async (data: EPRF) => {
    const doc = await createEPRFDoc(data, 'SAFEGUARDING');
    doc.save(`Safeguarding_${data.incidentNumber}.pdf`);
};

export const getEPRFBlob = async (data: EPRF) => {
    const doc = await createEPRFDoc(data, 'FULL');
    return doc.output('blob');
};