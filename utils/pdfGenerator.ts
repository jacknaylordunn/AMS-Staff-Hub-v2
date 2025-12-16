
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

const resolveImage = async (src: string | undefined): Promise<string> => {
    if (!src) return "";
    if (src.startsWith('OFFLINE_PENDING::')) {
        return src.split('::')[2];
    }
    if (src.startsWith('data:')) return src;
    
    // It's a URL, fetch it
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

// --- PDF BUILDER CLASS ---
class PDFBuilder {
    doc: jsPDF;
    yPos: number = 0;
    pageHeight: number;
    pageWidth: number;
    margin: number = 12;

    constructor() {
        this.doc = new jsPDF();
        this.pageHeight = this.doc.internal.pageSize.height;
        this.pageWidth = this.doc.internal.pageSize.width;
        this.yPos = 20;
    }

    checkPageBreak(heightNeeded: number) {
        if (this.yPos + heightNeeded > this.pageHeight - this.margin) {
            this.doc.addPage();
            this.yPos = 20;
            return true;
        }
        return false;
    }

    addHeader(title: string, data: EPRF, logoData?: string) {
        // Banner
        this.doc.setFillColor(COLORS.secondary);
        this.doc.rect(0, 0, this.pageWidth, 30, 'F');
        
        // Logo
        if (logoData) {
            try { this.doc.addImage(logoData, 'PNG', 12, 4, 22, 22); } catch (e) {}
        }

        // Title
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(16);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text("AEGIS MEDICAL SOLUTIONS", 40, 14);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text(title.toUpperCase(), 40, 22);

        // Metadata
        this.doc.setFontSize(9);
        this.doc.text(`INCIDENT: ${data.incidentNumber}`, this.pageWidth - 12, 10, { align: 'right' });
        this.doc.text(`DATE: ${new Date().toLocaleDateString()}`, this.pageWidth - 12, 16, { align: 'right' });
        this.doc.text(`CALL SIGN: ${data.callSign || 'N/A'}`, this.pageWidth - 12, 22, { align: 'right' });
        
        this.yPos = 40;
    }

    addSectionTitle(title: string) {
        this.checkPageBreak(15);
        this.doc.setFillColor(COLORS.grey);
        this.doc.rect(this.margin, this.yPos, this.pageWidth - (this.margin * 2), 8, 'F');
        this.doc.setTextColor(COLORS.primary);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(title.toUpperCase(), this.margin + 4, this.yPos + 5.5);
        this.yPos += 14;
    }

    addSectionSubtitle(title: string) {
        this.checkPageBreak(10);
        this.doc.setTextColor(COLORS.secondary);
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(title, this.margin, this.yPos);
        this.yPos += 5;
    }

    // Prints a Label: Value pair. 
    // If inline is true, prints on one line.
    // If value is boolean, converts to Yes/No.
    addField(label: string, value: any, inline = false, highlight = false) {
        let valStr = '-';
        if (value === true) valStr = 'YES';
        else if (value === false) valStr = 'No';
        else if (value !== undefined && value !== null && String(value).trim() !== '') valStr = String(value);
        
        if (valStr === '-' && !inline) return; 

        this.doc.setFontSize(9);
        
        if (inline) {
            const labelWidth = this.doc.getTextWidth(label + ": ");
            if (this.checkPageBreak(6)) {
               // Page break handled
            }
            if (highlight) this.doc.setTextColor(COLORS.red);
            else this.doc.setTextColor(COLORS.lightText);
            
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(label + ": ", this.margin, this.yPos);
            
            this.doc.setTextColor(COLORS.text);
            this.doc.setFont('helvetica', 'normal');
            this.doc.text(valStr, this.margin + labelWidth, this.yPos);
            this.yPos += 5;
        } else {
            this.checkPageBreak(15);
            this.doc.setTextColor(COLORS.lightText);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(label, this.margin, this.yPos);
            this.yPos += 4;
            
            this.doc.setTextColor(COLORS.text);
            this.doc.setFont('helvetica', 'normal');
            const splitText = this.doc.splitTextToSize(valStr, this.pageWidth - (this.margin * 2));
            this.doc.text(splitText, this.margin, this.yPos);
            this.yPos += (splitText.length * 4) + 4;
        }
    }

    addTable(head: string[], body: any[][], options: any = {}) {
        if (body.length === 0) return;
        
        // Ensure strings
        const safeBody = body.map(row => row.map(cell => 
            (cell === undefined || cell === null) ? '-' : (cell === true ? 'Yes' : (cell === false ? 'No' : String(cell)))
        ));

        autoTable(this.doc, {
            startY: this.yPos,
            head: [head],
            body: safeBody,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, textColor: COLORS.text, overflow: 'linebreak' },
            headStyles: { fillColor: COLORS.secondary, textColor: 255, fontStyle: 'bold' },
            columnStyles: { 0: { fontStyle: 'bold' } },
            margin: { left: this.margin, right: this.margin },
            ...options
        });
        this.yPos = (this.doc as any).lastAutoTable.finalY + 8;
    }

    addImage(base64: string, height: number, label: string) {
        if (!base64 || base64.length < 100) return;
        
        // Ensure aspect ratio roughly if possible, but strict height constraint for layout
        const width = height; 
        
        this.checkPageBreak(height + 10);
        try {
            this.doc.addImage(base64, 'PNG', this.margin, this.yPos, width, height);
            this.doc.setFontSize(8);
            this.doc.setTextColor(COLORS.lightText);
            this.doc.text(label, this.margin, this.yPos + height + 4);
            this.yPos += height + 10;
        } catch (e) {
            console.error("Image render error", e);
        }
    }

    addSignature(base64: string, label: string, x: number, y: number) {
        if (!base64 || base64.length < 100) return;
        try {
            this.doc.addImage(base64, 'PNG', x, y, 40, 20);
            this.doc.setFontSize(7);
            this.doc.setTextColor(COLORS.lightText);
            this.doc.text(label, x, y + 24);
        } catch (e) {
            console.error("Sig render error", e);
        }
    }

    addFooter(pageNum: number, totalPages: number, docId: string) {
        const str = `Page ${pageNum} of ${totalPages}  |  Incident: ${docId}  |  CONFIDENTIAL PATIENT RECORD`;
        this.doc.setFontSize(8);
        this.doc.setTextColor(150);
        this.doc.text(str, this.pageWidth / 2, this.pageHeight - 10, { align: 'center' });
    }
}

// --- MAIN GENERATOR FUNCTION ---
const createEPRFDoc = async (data: EPRF, type: 'FULL' | 'REFERRAL' | 'SAFEGUARDING'): Promise<jsPDF> => {
    const pdf = new PDFBuilder();
    let logoData = '';
    try { logoData = await resolveImage(LOGO_URL); } catch (e) {}

    const titleMap = {
        'FULL': 'CLINICAL PATIENT RECORD (ePRF)',
        'REFERRAL': 'CLINICAL REFERRAL / HANDOVER',
        'SAFEGUARDING': 'SAFEGUARDING REFERRAL'
    };
    pdf.addHeader(titleMap[type], data, logoData);

    // --- 1. INCIDENT & CONTEXT ---
    if (type !== 'SAFEGUARDING') {
        pdf.addSectionTitle("Incident Details");
        pdf.addField("Location", data.location, true);
        pdf.addField("Mode", data.mode, true);
        
        const timesData = [
            [
                data.times.callReceived, 
                data.times.mobile, 
                data.times.onScene, 
                data.times.patientContact, 
                data.times.departScene, 
                data.times.atHospital, 
                data.times.clear
            ]
        ];
        pdf.addTable(
            ['Call Received', 'Mobile', 'On Scene', 'Contact', 'Depart', 'At Hospital', 'Clear'],
            timesData,
            { halign: 'center' }
        );

        if (data.assistingClinicians && data.assistingClinicians.length > 0) {
            const crewData = data.assistingClinicians.map(c => [c.name, c.role, c.badgeNumber]);
            pdf.addTable(['Assisting Crew', 'Role', 'ID'], crewData);
        }
    }

    // --- 2. PATIENT DETAILS ---
    pdf.addSectionTitle("Patient & Demographics");
    pdf.doc.setFontSize(11);
    pdf.doc.setFont('helvetica', 'bold');
    pdf.doc.text(`${data.patient.lastName?.toUpperCase() || 'UNKNOWN'}, ${data.patient.firstName || ''}`, pdf.margin, pdf.yPos);
    pdf.yPos += 6;
    
    const dob = data.patient.dob ? new Date(data.patient.dob).toLocaleDateString() : 'Unknown';
    const age = data.patient.dob ? Math.floor((new Date().getTime() - new Date(data.patient.dob).getTime()) / 31557600000) : '?';
    
    pdf.addField("DOB / Age", `${dob} (${age} yrs) | ${data.patient.gender || '-'}`, true);
    pdf.addField("NHS Number", data.patient.nhsNumber, true);
    pdf.addField("Address", `${data.patient.address || ''}, ${data.patient.postcode || ''}`, true);
    pdf.addField("Chronic Hypoxia / COPD", data.patient.chronicHypoxia ? "YES - Target SpO2 88-92%" : "No", true, data.patient.chronicHypoxia);
    pdf.yPos += 4;

    if (data.linkedRecords && data.linkedRecords.length > 0) {
        pdf.addSectionSubtitle("Linked History");
        const links = data.linkedRecords.map(l => [new Date(l.date).toLocaleDateString(), l.incidentNumber, l.diagnosis]);
        pdf.addTable(['Date', 'Incident', 'Diagnosis'], links);
    }

    // --- 3. CLINICAL HISTORY ---
    pdf.addSectionTitle("Clinical History");
    pdf.addField("Presenting Complaint (PC)", data.history.presentingComplaint);
    pdf.addField("History of PC (HPC)", data.history.historyOfPresentingComplaint);
    
    const sampleBody = [
        ['Symptoms', data.history.sample?.symptoms],
        ['Allergies', data.history.allergies || 'NKDA'],
        ['Medications', data.history.medications || 'None Listed'],
        ['Past Medical Hx', data.history.pastMedicalHistory || 'None Listed'],
        ['Last Intake', data.history.sample?.lastOralIntake],
        ['Events Prior', data.history.sample?.eventsPrior]
    ];
    pdf.addTable(['Category', 'Details'], sampleBody);

    // --- 4. SAFEGUARDING ---
    if (data.governance.safeguarding.concerns || type === 'SAFEGUARDING') {
        pdf.addSectionTitle("Safeguarding");
        const sg = data.governance.safeguarding;
        pdf.addField("Concern Raised", "YES", true, true);
        pdf.addField("Category", sg.category, true);
        pdf.addField("Types", sg.type?.join(', '), true);
        pdf.addField("Details / Disclosures", sg.details);
        if (sg.referralMade) pdf.addField("Referral Reference", sg.referralReference, true);
    }

    // --- 5. EXAMINATION ---
    pdf.addSectionTitle("Examination");
    
    // Primary Survey
    const ps = data.assessment.primary;
    const psRows = [
        ['<C> Catastrophic Haemorrhage', ps.catastrophicHaemorrhage ? 'YES - FOUND' : 'None Visible'],
        ['Airway', `Status: ${ps.airway.status || '-'}\nPatency: ${ps.airway.patency || '-'}\nNotes: ${ps.airway.notes || '-'}`],
        ['Breathing', `RR: ${ps.breathing.rate}\nEffort: ${ps.breathing.effort}\nAir Entry: ${ps.breathing.airEntryL}/${ps.breathing.airEntryR}\nSounds: ${ps.breathing.soundsL}/${ps.breathing.soundsR}\nSpO2: ${ps.breathing.oxygenSats}\nExpansion: ${ps.breathing.chestExpansion || '-'}`],
        ['Circulation', `Pulse: ${ps.circulation.radialPulse}\nSkin: ${ps.circulation.skin}\nCRT: ${ps.circulation.capRefill}\nTemp: ${ps.circulation.temp}\nBP Est: ${ps.circulation.systolicBP || '?'} / ${ps.circulation.diastolicBP || '?'}`],
        ['Disability', `AVPU: ${ps.disability.avpu}\nGCS: ${ps.disability.gcs || '-'}\nPupils: ${ps.disability.pupils}\nBM: ${ps.disability.bloodGlucose}`],
        ['Exposure', `Major Injuries: ${ps.exposure.injuriesFound ? 'YES' : 'No'}\nRash: ${ps.exposure.rash ? 'YES' : 'No'}\nTemp: ${ps.exposure.temp}`]
    ];
    pdf.addTable(['Primary Survey (<C>ABCDE)', 'Assessment Findings'], psRows);

    // Vitals Log
    if (data.vitals.length > 0) {
        pdf.addSectionSubtitle("Vital Signs Log");
        const vitalsRows = data.vitals.map(v => {
            let bp = `${v.bpSystolic || '-'}/${v.bpDiastolic || '-'}`;
            if (v.bpPosition || v.bpLimb) bp += ` (${v.bpPosition?.charAt(0) || '?'}/${v.bpLimb?.charAt(0) || '?'})`;
            
            return [
                v.time, v.rr, `${v.spo2}%`, v.oxygen ? (v.oxygenDevice || 'Supp') : 'Air', 
                bp, v.hr, v.temp, 
                v.avpu === 'A' ? v.gcs : v.avpu, v.bloodGlucose, v.painScore, v.news2Score
            ];
        });
        pdf.addTable(
            ['Time', 'RR', 'SpO2', 'O2', 'BP', 'HR', 'Temp', 'AVPU', 'BM', 'Pain', 'NEWS'],
            vitalsRows,
            { styles: { halign: 'center', fontSize: 7 } }
        );
    }

    const ass = data.assessment;
    if (ass.clinicalNarrative) pdf.addField("Clinical Narrative / Detailed Exam", ass.clinicalNarrative);

    // --- SYSTEM ASSESSMENTS ---
    // Neuro
    if (ass.neuro.gcs.total || ass.neuro.fast.testPositive !== undefined) {
        pdf.addSectionSubtitle("Neuro Assessment");
        pdf.addField("GCS Breakdown", `E${ass.neuro.gcs.eyes || '-'} V${ass.neuro.gcs.verbal || '-'} M${ass.neuro.gcs.motor || '-'} = Total ${ass.neuro.gcs.total || '-'}/15`, true);
        pdf.addField("Pupils", `L: Size ${ass.neuro.pupils.leftSize || '-'} (${ass.neuro.pupils.leftReaction || '-'}) | R: Size ${ass.neuro.pupils.rightSize || '-'} (${ass.neuro.pupils.rightReaction || '-'})`, true);
        pdf.addField("FAST Test", `Face: ${ass.neuro.fast.face || '-'} | Arms: ${ass.neuro.fast.arms || '-'} | Speech: ${ass.neuro.fast.speech || '-'} | Onset: ${ass.neuro.fast.time || '-'}`, true, ass.neuro.fast.testPositive);
        
        const limbData = [
            ['Left Arm', ass.neuro.limbs.leftArm.power, ass.neuro.limbs.leftArm.sensation],
            ['Right Arm', ass.neuro.limbs.rightArm.power, ass.neuro.limbs.rightArm.sensation],
            ['Left Leg', ass.neuro.limbs.leftLeg.power, ass.neuro.limbs.leftLeg.sensation],
            ['Right Leg', ass.neuro.limbs.rightLeg.power, ass.neuro.limbs.rightLeg.sensation],
        ];
        pdf.addTable(['Limb', 'Power', 'Sensation'], limbData);

        if (ass.neuro.cranialNerves && ass.neuro.cranialNerves.length > 0) {
            const cnRows = ass.neuro.cranialNerves.map(cn => [cn.nerve, cn.test, cn.status, cn.notes || '-']);
            pdf.addTable(['Cranial Nerve', 'Test', 'Status', 'Notes'], cnRows);
        }
    }

    // Cardiac
    if (ass.cardiac?.ecg?.rhythm || ass.cardiac?.chestPainPresent) {
        pdf.addSectionSubtitle("Cardiac Assessment");
        pdf.addField("Chest Pain Present", ass.cardiac.chestPainPresent, true, ass.cardiac.chestPainPresent);
        if (ass.cardiac.socrates) {
            const s = ass.cardiac.socrates;
            pdf.addField("SOCRATES", `Site: ${s.site}, Onset: ${s.onset}, Char: ${s.character}, Rad: ${s.radiation}, Assoc: ${s.associations}, Time: ${s.timeCourse}, Sev: ${s.severity}`);
        }
        pdf.addField("ECG Details", `${ass.cardiac.ecg.rhythm} (Rate: ${ass.cardiac.ecg.rate}, Time: ${ass.cardiac.ecg.time})`, true);
        pdf.addField("STEMI Criteria Met", ass.cardiac.ecg.stElevation, true, ass.cardiac.ecg.stElevation);
        
        if (ass.cardiac.wellsScore !== undefined) {
            pdf.addField("Wells Score (DVT)", `${ass.cardiac.wellsScore} (${ass.cardiac.wellsScore >= 2 ? 'Likely' : 'Unlikely'})`, true);
        }
    }

    // Respiratory
    if (ass.respiratory?.cough || ass.respiratory?.airEntry) {
        pdf.addSectionSubtitle("Respiratory Assessment");
        pdf.addField("Air Entry", ass.respiratory.airEntry, true);
        pdf.addField("Added Sounds", ass.respiratory.addedSounds, true);
        pdf.addField("Acc. Muscles", ass.respiratory.accessoryMuscleUse, true);
        pdf.addField("Cough", ass.respiratory.cough, true);
        pdf.addField("Sputum", ass.respiratory.sputumColor, true);
        pdf.addField("Peak Flow", `Pre: ${ass.respiratory.peakFlowPre || '-'} -> Post: ${ass.respiratory.peakFlowPost || '-'}`, true);
    }

    // Abdominal
    if (ass.gastrointestinal?.abdominalPain || ass.gastrointestinal?.distension) {
        pdf.addSectionSubtitle("Abdominal & GU Assessment");
        pdf.addField("Pain Location", ass.gastrointestinal.painLocation, true);
        pdf.addField("Palpation", ass.gastrointestinal.palpation, true);
        pdf.addField("Distension", ass.gastrointestinal.distension, true);
        pdf.addField("Bowel Sounds", ass.gastrointestinal.bowelSounds, true);
        pdf.addField("FAST Scan", ass.gastrointestinal.fastScan || 'Not Performed', true);
        pdf.addField("Urine Output", ass.gastrointestinal.urineOutput, true);
        pdf.addField("Vomit Desc", ass.gastrointestinal.vomitDescription, true);
        pdf.addField("Stool Desc", ass.gastrointestinal.stoolDescription, true);
    }

    // Obs/Gynae
    if (ass.obsGynae?.pregnant) {
        pdf.addSectionSubtitle("Obstetric Assessment");
        const obs = ass.obsGynae;
        pdf.addField("Pregnant", "YES", true);
        pdf.addField("Gestation", obs.gestationWeeks + " weeks", true);
        pdf.addField("Gravida/Para", `G${obs.gravida} P${obs.para}`, true);
        pdf.addField("Contractions", obs.contractions, true);
        pdf.addField("Membranes", obs.membranesRuptured ? "Ruptured" : "Intact", true);
        pdf.addField("Bleeding", `${obs.bleeding ? "YES" : "No"} (${obs.bleedAmount || '-'})`, true);
        pdf.addField("Foetal Move", obs.foetalMovements, true);
        pdf.addField("Notes", obs.notes);
    }

    // Mental Health
    if (ass.mentalHealth) {
        pdf.addSectionSubtitle("Mental Health Assessment");
        const mh = ass.mentalHealth;
        pdf.addField("Appearance", mh.appearance, true);
        pdf.addField("Behaviour", mh.behaviour, true);
        pdf.addField("Speech", mh.speech, true);
        pdf.addField("Mood", mh.mood, true);
        pdf.addField("Risk to Self", mh.riskToSelf, true);
        pdf.addField("Risk to Others", mh.riskToOthers, true);
    }

    // Trauma
    if ((ass.traumaTriage?.criteria && ass.traumaTriage.criteria.length > 0) || ass.traumaTriage?.vehiclePosition) {
        pdf.addSectionSubtitle("Trauma Triage");
        pdf.addField("Major Trauma", ass.traumaTriage?.isMajorTrauma ? "POSITIVE" : "Negative", true, ass.traumaTriage?.isMajorTrauma);
        if (ass.traumaTriage?.vehiclePosition) {
            pdf.addField("RTC Mechanism", 
                `Pos: ${ass.traumaTriage.vehiclePosition} | Speed: ${ass.traumaTriage.estSpeed} | Belt: ${ass.traumaTriage.seatbeltWorn} | Airbag: ${ass.traumaTriage.airbagsDeployed} | Extrication: ${ass.traumaTriage.extrication}`
            );
        }
        if (ass.traumaTriage?.criteria) {
            pdf.addField("Criteria Met", ass.traumaTriage.criteria.join(', '));
        }
    }

    // Sepsis
    if (ass.sepsis?.redFlags && ass.sepsis.redFlags.length > 0) {
        pdf.addSectionSubtitle("Sepsis Screening");
        pdf.addField("Red Flags", ass.sepsis.redFlags.join(', '), false, true);
        pdf.addField("Source", ass.sepsis.suspectedSource?.join(', ') || '-');
        pdf.addField("Risk Factors", ass.sepsis.riskFactors.join(', '));
    }

    // Wounds & Burns
    if ((ass.wounds && ass.wounds.length > 0) || (ass.burns?.estimatedPercentage)) {
        pdf.addSectionSubtitle("Wounds & Burns");
        if (ass.burns?.estimatedPercentage) {
            pdf.addField("Burns TBSA %", ass.burns.estimatedPercentage, true);
            pdf.addField("Depth", ass.burns.depth, true);
        }
        if (ass.wounds && ass.wounds.length > 0) {
            const wBody = ass.wounds.map(w => [w.site, w.classification, w.dimensions, w.contamination, w.tetanusStatus, w.closure || 'None']);
            pdf.addTable(['Site', 'Type', 'Size', 'Contam', 'Tetanus', 'Closure'], wBody);
        }
    }

    // Social / Frailty
    if (ass.cfsScore || ass.mobility?.currentMobility) {
        pdf.addSectionSubtitle("Social & Mobility");
        pdf.addField("CFS Score", ass.cfsScore, true);
        pdf.addField("Mobility (Pre-Morbid)", ass.mobility?.preMorbidMobility, true);
        pdf.addField("Mobility (Current)", ass.mobility?.currentMobility, true);
        pdf.addField("Transfer Ability", ass.mobility?.transferAbility, true);
        pdf.addField("Aids Used", ass.mobility?.aidsUsed, true);
        if (ass.falls) {
            pdf.addField("Falls Hx", `Hx Falls: ${ass.falls.historyOfFalls}, Anticoagulants: ${ass.falls.anticoagulants}, Unsteady: ${ass.falls.unsteadyWalk}`, true);
        }
    }

    if (ass.minorInjuryAssessment) {
        pdf.addSectionSubtitle("Minor Injury Assessment");
        pdf.addField("Details", ass.minorInjuryAssessment);
    }

    // Visual Assessments (Images)
    if (data.bodyMapImage) {
        const bodyMap = await resolveImage(data.bodyMapImage);
        if (bodyMap) pdf.addImage(bodyMap, 80, "Body Map (Injuries)");
    }
    
    // Textual Injuries List (Backup for Body Map)
    if (data.injuries && data.injuries.length > 0) {
        pdf.addSectionSubtitle("Injury List (Body Map Data)");
        const injRows = data.injuries.map(i => [i.location, i.type, i.subtype || '-']);
        pdf.addTable(['Location', 'Type', 'Specifics'], injRows);
    }

    // --- 6. INTERVENTIONS ---
    if (type === 'FULL' || type === 'REFERRAL') {
        pdf.addSectionTitle("Treatments & Interventions");
        
        // Drugs
        if (data.treatments.drugs.length > 0) {
            const drugRows = data.treatments.drugs.map(d => [
                d.time, d.drugName, d.dose, d.route, d.batchNumber || '-', d.administeredBy, d.witnessedBy || '-'
            ]);
            pdf.addTable(['Time', 'Drug', 'Dose', 'Route', 'Batch', 'Admin By', 'Witness'], drugRows);
        } else {
            pdf.addField("Medication", "No drugs administered.");
        }

        // Procedures
        if (data.treatments.procedures.length > 0) {
            const procRows = data.treatments.procedures.map(p => {
                let details = `${p.size || ''} ${p.site || ''} ${p.details || ''}`;
                if (p.etco2) details += ` | EtCO2: ${p.etco2}`;
                if (p.depth) details += ` | Depth: ${p.depth}`;
                return [p.time, p.type, details, p.performedBy, p.success ? 'Success' : 'Fail'];
            });
            pdf.addTable(['Time', 'Procedure', 'Details', 'Clinician', 'Outcome'], procRows);
        } else {
            pdf.addField("Procedures", "No procedures recorded.");
        }

        // Minor Treatment Narrative
        if (data.treatments.minorTreatment) {
            pdf.addField("Minor Treatment", data.treatments.minorTreatment);
        }

        // Resus / ROLE
        if (data.treatments.role?.timeVerified || data.treatments.resusLog?.length) {
            pdf.addSectionSubtitle("Resuscitation & Verification of Death");
            const r = data.treatments.role;
            if (r) {
                pdf.addField("Arrest Witnessed", r.arrestWitnessed, true);
                pdf.addField("Bystander CPR", r.bystanderCPR, true);
                pdf.addField("Downtime", `${r.downTimeMinutes} mins`, true);
                pdf.addField("Total Shocks", r.totalShocks, true);
                
                if (r.criteriaMet && r.criteriaMet.length > 0) {
                    pdf.addField("ROLE Criteria Met", r.criteriaMet.join(', '), false, true);
                }
                if (r.timeVerified) {
                    pdf.addField("Life Extinct Verified At", new Date(r.timeVerified).toLocaleTimeString(), true);
                    pdf.addField("Verified By", r.verifiedBy, true);
                }
            }
        }

        if (data.accessMapImage) {
            const accessMap = await resolveImage(data.accessMapImage);
            if (accessMap) pdf.addImage(accessMap, 80, "Vascular Access Map");
        }
    }

    // --- 7. CLINICAL DECISION ---
    pdf.addSectionTitle("Clinical Decision");
    pdf.addField("Working Impression", data.clinicalDecision.workingImpression, false, true);
    pdf.addField("Differential Diagnosis", data.clinicalDecision.differentialDiagnosis);
    pdf.addField("Management Plan", data.clinicalDecision.managementPlan);
    
    pdf.addField("Final Disposition", data.clinicalDecision.finalDisposition || 'Not Recorded', true, true);

    if (data.clinicalDecision.destinationHospital) {
        pdf.addField("Destination", `${data.clinicalDecision.destinationHospital} (${data.clinicalDecision.destinationDepartment})`, true);
    }
    
    if (data.clinicalDecision.gpName || data.clinicalDecision.gpPractice) {
        pdf.addField("GP Referral Details", `Practice: ${data.clinicalDecision.gpPractice || '-'} | GP: ${data.clinicalDecision.gpName || '-'} | Ref: ${data.clinicalDecision.gpRefNumber || '-'}`);
    }

    // --- 8. GOVERNANCE & LEGAL ---
    pdf.addSectionTitle("Legal & Governance Checklist");
    
    // Mental Capacity
    const cap = data.governance.capacity;
    pdf.addField("Mental Capacity Status", cap.status.toUpperCase(), true, cap.status === 'Capacity Lacking');
    if (cap.status === 'Capacity Lacking') {
        pdf.addField("Stage 1 (Impairment)", "Positive - Impairment of mind/brain identified", true);
        pdf.addField("Stage 2 (Functional)", `Understand:${cap.stage2Functional?.understand?'Y':'N'} | Retain:${cap.stage2Functional?.retain?'Y':'N'} | Weigh:${cap.stage2Functional?.weigh?'Y':'N'} | Comm:${cap.stage2Functional?.communicate?'Y':'N'}`, true);
        pdf.addField("Best Interests Rationale", cap.bestInterestsRationale);
    }

    // Refusal
    const ref = data.governance.refusal;
    if (ref.isRefusal) {
        pdf.addSectionSubtitle("Refusal of Care");
        const checks = [
            ['Patient has Capacity (MCA confirmed)', ref.capacityConfirmed],
            ['Risks of refusal fully explained', ref.risksExplained],
            ['Alternative care options offered', ref.alternativesOffered],
            ['Worsening advice given', ref.worseningAdviceGiven]
        ];
        pdf.addTable(['Governance Check', 'Confirmed'], checks);
        pdf.addField("Discussion Details", ref.details);
    }

    if (data.governance.worseningAdviceDetails) {
        pdf.addField("Safety Netting / Worsening Advice", data.governance.worseningAdviceDetails);
    }

    // --- 9. HANDOVER TEXTS ---
    if (data.handover.sbar || data.handover.atmist) {
        pdf.addSectionTitle("Handover / Pre-Alert Content");
        if (data.handover.atmist) {
            pdf.addSectionSubtitle("ATMIST Report");
            pdf.addField("Details", data.handover.atmist);
        }
        if (data.handover.sbar) {
            pdf.addSectionSubtitle("SBAR Report");
            pdf.addField("Details", data.handover.sbar);
        }
    }

    // --- 10. PHOTOGRAPHIC EVIDENCE ---
    if (data.handover.media && data.handover.media.length > 0) {
        pdf.addSectionTitle("Photographic Evidence");
        for (const media of data.handover.media) {
            try {
                // If using online storage, resolveImage handles CORS and conversion
                const base64 = await resolveImage(media.url);
                if (base64) {
                    pdf.addImage(base64, 100, `Evidence: ${media.notes || 'Photo'} (${new Date(media.timestamp).toLocaleString()})`);
                }
            } catch (e) {
                pdf.addField("Image Error", "Could not load image: " + media.notes);
            }
        }
    }

    // --- 11. EVENT LOGS ---
    if (data.logs && data.logs.length > 0) {
        pdf.addSectionTitle("Communication & Event Log");
        const logRows = data.logs.map(l => [
            new Date(l.timestamp).toLocaleTimeString(), 
            l.category, 
            l.message, 
            l.author
        ]);
        pdf.addTable(['Time', 'Cat', 'Event', 'Author'], logRows);
    }

    // --- 12. SIGNATURES ---
    pdf.addSectionTitle("Authorisation & Signatures");
    
    const sigY = pdf.yPos;
    let xOffset = pdf.margin;
    
    // Clinician Sig
    if (data.handover.clinicianSignature) {
        const sig = await resolveImage(data.handover.clinicianSignature);
        if (sig) {
            pdf.addSignature(sig, "Lead Clinician", xOffset, sigY);
            if (data.handover.clinicianSigTime) pdf.doc.text(data.handover.clinicianSigTime, xOffset, sigY + 28);
            xOffset += 50;
        }
    }

    // Patient Sig (Refusal or Discharge)
    if (data.governance.refusal.patientSignature) {
        const sig = await resolveImage(data.governance.refusal.patientSignature);
        if (sig) {
            pdf.addSignature(sig, "Patient Signature (Refusal)", xOffset, sigY);
            xOffset += 50;
        }
    } else if (data.governance.refusal.patientRefusedToSign) {
        pdf.doc.text("Patient Refused to Sign", xOffset, sigY + 10);
        xOffset += 50;
    } else if (data.handover.patientSignature) {
        const sig = await resolveImage(data.handover.patientSignature);
        if (sig) {
            pdf.addSignature(sig, "Patient Signature (Discharge)", xOffset, sigY);
            xOffset += 50;
        }
    }

    // Witness / Receiving Sig
    if (data.handover.receivingClinicianSignature) {
        const sig = await resolveImage(data.handover.receivingClinicianSignature);
        if (sig) {
            pdf.addSignature(sig, "Receiving Staff", xOffset, sigY);
            if (data.handover.receivingName) pdf.doc.text(data.handover.receivingName, xOffset, sigY + 28);
            xOffset += 50;
        }
    } else if (data.governance.refusal.witnessSignature) {
        const sig = await resolveImage(data.governance.refusal.witnessSignature);
        if (sig) {
            pdf.addSignature(sig, "Witness", xOffset, sigY);
            if (data.governance.refusal.witnessName) pdf.doc.text(data.governance.refusal.witnessName, xOffset, sigY + 28);
            xOffset += 50;
        }
    } else if (data.governance.refusal.staffSignature) {
        // Fallback or specific staff signature on refusal form
        const sig = await resolveImage(data.governance.refusal.staffSignature);
        if (sig) {
            pdf.addSignature(sig, "Clinician (Refusal Form)", xOffset, sigY);
            xOffset += 50;
        }
    }

    pdf.yPos += 35;

    // Digital Token
    if (data.handover.digitalToken) {
        pdf.doc.setFontSize(7);
        pdf.doc.setTextColor(COLORS.lightText);
        pdf.doc.text(`Digital Seal: ${data.handover.digitalToken}`, pdf.margin, pdf.yPos);
    }

    // --- PAGINATION ---
    const pageCount = pdf.doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.doc.setPage(i);
        pdf.addFooter(i, pageCount, data.incidentNumber);
    }

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
