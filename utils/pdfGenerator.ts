
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { EPRF } from '../types';

const LOGO_URL = "https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png";

const getImageData = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
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

export const generateEPRF_PDF = async (data: EPRF) => {
  const doc: any = new jsPDF();
  const themeBlue = '#0052CC'; // ams-blue
  const themeDark = '#091E42'; // ams-dark
  const themeGrey = '#F1F5F9';

  let logoData = '';
  try { logoData = await getImageData(LOGO_URL); } catch (e) {}

  // --- Header ---
  doc.setFillColor(themeDark);
  doc.rect(0, 0, 210, 30, 'F');
  if (logoData) try { doc.addImage(logoData, 'PNG', 10, 5, 20, 20); } catch (e) {}

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("AEGIS MEDICAL SOLUTIONS", 35, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("CLINICAL PATIENT RECORD", 35, 22);
  doc.text("CONFIDENTIAL", 195, 15, { align: 'right' });
  doc.setFontSize(9);
  doc.text(`INCIDENT REF: ${data.incidentNumber}`, 195, 25, { align: 'right' });

  // --- Patient Strip ---
  doc.setFillColor(themeBlue);
  doc.rect(0, 30, 210, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.patient.lastName.toUpperCase()}, ${data.patient.firstName}`, 10, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`DOB: ${data.patient.dob ? new Date(data.patient.dob).toLocaleDateString() : 'Unknown'}`, 100, 40);
  doc.text(`NHS: ${data.patient.nhsNumber || 'N/A'}`, 160, 40);
  if (data.patient.chronicHypoxia) {
      doc.text("COPD / Chronic Hypoxia (Scale 2)", 10, 25); // Added warning in header
  }

  let yPos = 55;

  // --- Incident Details ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("INCIDENT & CREW DETAILS", 10, yPos);
  
  const crewList = data.assistingClinicians && data.assistingClinicians.length > 0 
    ? data.assistingClinicians.map(c => `${c.name} (${c.role})`).join(', ')
    : 'Solo Clinician';

  doc.autoTable({
    startY: yPos + 3,
    head: [['Date', 'Call Sign', 'Mode', 'Location', 'Crew']],
    body: [[new Date().toLocaleDateString(), data.callSign, data.mode, data.location, crewList]],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: themeGrey, textColor: 50, fontStyle: 'bold' },
  });
  yPos = doc.lastAutoTable.finalY + 10;

  // --- History ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("CLINICAL HISTORY", 10, yPos);
  doc.setDrawColor(200);
  doc.line(10, yPos + 2, 200, yPos + 2);
  yPos += 8;

  const historyData = [
      ['PC', data.history.presentingComplaint],
      ['HPC', data.history.historyOfPresentingComplaint],
      ['PMH', data.history.pastMedicalHistory],
      ['Allergies', data.history.allergies],
      ['Meds', data.history.medications]
  ];

  doc.autoTable({
      startY: yPos,
      body: historyData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 30, fontStyle: 'bold', fillColor: themeGrey }, 1: { cellWidth: 'auto' } },
  });
  yPos = doc.lastAutoTable.finalY + 10;

  // --- Assessment (Primary Survey) ---
  if (yPos > 250) { doc.addPage(); yPos = 20; }
  doc.setFontSize(11);
  doc.text("PRIMARY SURVEY (ABCDE)", 10, yPos);
  doc.line(10, yPos + 2, 200, yPos + 2);
  yPos += 8;

  const prim = data.assessment.primary;
  const primBody = [[
      `Airway: ${prim.airway.status}\nIntervention: ${prim.airway.intervention || 'None'}`,
      `Breathing:\nAir Entry L: ${prim.breathing.airEntryL} R: ${prim.breathing.airEntryR}\nSounds L: ${prim.breathing.soundsL} R: ${prim.breathing.soundsR}\nEffort: ${prim.breathing.effort}`,
      `Circulation:\nRadial: ${prim.circulation.radialPulse}\nSkin: ${prim.circulation.skin} (${prim.circulation.temp})`,
      `Disability:\nAVPU: ${prim.disability.avpu}\nPupils: ${prim.disability.pupils}\nBM: ${prim.disability.bloodGlucose}`,
      `Exposure:\nInjuries: ${prim.exposure.injuriesFound ? 'Yes' : 'No'}\nRash: ${prim.exposure.rash ? 'Yes' : 'No'}`
  ]];

  doc.autoTable({
      startY: yPos,
      body: primBody,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2 }
  });
  yPos = doc.lastAutoTable.finalY + 10;

  // --- Specialized Assessment Sections (Conditional) ---
  
  // 1. Cardiac
  if (data.assessment.cardiac?.chestPainPresent || data.assessment.cardiac?.ecg?.rhythm) {
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.text("CARDIAC ASSESSMENT", 10, yPos);
      doc.autoTable({
          startY: yPos + 3,
          head: [['Pain (SOCRATES)', 'ECG Analysis']],
          body: [[
              `Onset: ${data.assessment.cardiac?.socrates?.onset || '-'}\nSeverity: ${data.assessment.cardiac?.socrates?.severity}/10\nChar: ${data.assessment.cardiac?.socrates?.character}\nRad: ${data.assessment.cardiac?.socrates?.radiation}`,
              `Rhythm: ${data.assessment.cardiac?.ecg?.rhythm}\nRate: ${data.assessment.cardiac?.ecg?.rate}\nSTEMI: ${data.assessment.cardiac?.ecg?.stElevation ? 'YES' : 'No'}\nNotes: ${data.assessment.cardiac?.ecg?.twelveLeadNotes}`
          ]],
          theme: 'grid',
          styles: { fontSize: 8 }
      });
      yPos = doc.lastAutoTable.finalY + 8;
  }

  // 2. Respiratory
  if (data.assessment.respiratory?.cough || data.assessment.respiratory?.peakFlowPre) {
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.text("RESPIRATORY ASSESSMENT", 10, yPos);
      doc.autoTable({
          startY: yPos + 3,
          head: [['Cough / Sputum', 'Peak Flow', 'History']],
          body: [[
              `${data.assessment.respiratory?.cough} / ${data.assessment.respiratory?.sputumColor || '-'}`,
              `Pre: ${data.assessment.respiratory?.peakFlowPre || '-'} L/min\nPost: ${data.assessment.respiratory?.peakFlowPost || '-'} L/min`,
              data.assessment.respiratory?.history
          ]],
          theme: 'grid',
          styles: { fontSize: 8 }
      });
      yPos = doc.lastAutoTable.finalY + 8;
  }

  // 3. GI / GU
  if (data.assessment.gastrointestinal?.abdominalPain || data.assessment.gastrointestinal?.painLocation) {
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.text("GI / GU ASSESSMENT", 10, yPos);
      doc.autoTable({
          startY: yPos + 3,
          head: [['Abdomen', 'Output / Intake']],
          body: [[
              `Pain: ${data.assessment.gastrointestinal?.painLocation}\nPalpation: ${data.assessment.gastrointestinal?.palpation}\nDistension: ${data.assessment.gastrointestinal?.distension ? 'Yes' : 'No'}`,
              `Last Meal: ${data.assessment.gastrointestinal?.lastMeal}\nLast BM: ${data.assessment.gastrointestinal?.lastBowelMovement}\nUrine: ${data.assessment.gastrointestinal?.urineOutput}`
          ]],
          theme: 'grid',
          styles: { fontSize: 8 }
      });
      yPos = doc.lastAutoTable.finalY + 8;
  }

  // 4. Obs/Gynae
  if (data.assessment.obsGynae?.pregnant) {
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.text("MATERNITY ASSESSMENT", 10, yPos);
      doc.autoTable({
          startY: yPos + 3,
          body: [[
              `Gestation: ${data.assessment.obsGynae?.gestationWeeks || '?'} weeks\nGravida/Para: ${data.assessment.obsGynae?.gravida || '-'}/${data.assessment.obsGynae?.para || '-'}\nContractions: ${data.assessment.obsGynae?.contractions || 'None'}\nBleeding: ${data.assessment.obsGynae?.bleeding ? 'YES' : 'No'}`
          ]],
          theme: 'grid',
          styles: { fontSize: 8 }
      });
      yPos = doc.lastAutoTable.finalY + 8;
  }

  // 5. Mental Health
  if (data.assessment.mentalHealth?.appearance) {
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.text("MENTAL STATE EXAM", 10, yPos);
      doc.autoTable({
          startY: yPos + 3,
          head: [['Appearance/Behaviour', 'Speech/Mood', 'Risk']],
          body: [[
              `${data.assessment.mentalHealth?.appearance}\n${data.assessment.mentalHealth?.behaviour}`,
              `${data.assessment.mentalHealth?.speech}\n${data.assessment.mentalHealth?.mood}`,
              `Self: ${data.assessment.mentalHealth?.riskToSelf ? 'High' : 'Low'}\nOthers: ${data.assessment.mentalHealth?.riskToOthers ? 'High' : 'Low'}`
          ]],
          theme: 'grid',
          styles: { fontSize: 8 }
      });
      yPos = doc.lastAutoTable.finalY + 8;
  }

  // --- Vitals Grid (Detailed) ---
  doc.text("OBSERVATIONS & TREND", 10, yPos);
  const vitalsBody = data.vitals?.map((v) => [
    v.time, 
    v.hr, 
    v.rr, 
    `${v.bpSystolic}/${v.bpDiastolic}`, 
    `${v.spo2}%`, 
    v.oxygen ? `${v.oxygenFlow || 'O2'} ${v.oxygenDevice ? `(${v.oxygenDevice})` : ''}` : 'Air', 
    v.temp, 
    v.avpu === 'A' ? `GCS ${v.gcs}` : v.avpu, 
    v.bloodGlucose || '-',
    v.painScore || '0',
    v.popsScore ? `POPS ${v.popsScore}` : `NEWS ${v.news2Score}`
  ]) || [];

  doc.autoTable({
    startY: yPos + 3,
    head: [['Time', 'HR', 'RR', 'BP', 'SpO2', 'O2', 'Temp', 'GCS/AVPU', 'BM', 'Pain', 'Score']],
    body: vitalsBody,
    theme: 'striped',
    styles: { fontSize: 8, halign: 'center', cellPadding: 2 },
    headStyles: { fillColor: themeDark, textColor: 255 }
  });
  yPos = doc.lastAutoTable.finalY + 10;

  // --- Treatments & Interventions ---
  if (data.treatments.drugs.length > 0 || data.treatments.procedures.length > 0) {
      if (yPos > 230) { doc.addPage(); yPos = 20; }
      doc.text("INTERVENTIONS, PROCEDURES & DRUGS", 10, yPos);
      
      const drugsBody = data.treatments.drugs.map((d) => [
          d.time, 'Drug', `${d.drugName} ${d.dose} (${d.route})`, `Batch: ${d.batchNumber || '-'}`, d.administeredBy, d.witnessedBy ? `Wit: ${d.witnessedBy}` : '-'
      ]);
      const procBody = data.treatments.procedures.map((p) => [
          p.time, 'Proc', `${p.type} - ${p.details || ''}`, `Site: ${p.site || '-'}`, p.performedBy, p.success ? 'Success' : 'Fail'
      ]);

      doc.autoTable({
          startY: yPos + 3,
          head: [['Time', 'Type', 'Detail', 'Notes', 'Clinician', 'Status/Wit']],
          body: [...drugsBody, ...procBody],
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: themeBlue }
      });
      yPos = doc.lastAutoTable.finalY + 10;
  }

  // --- Handover ---
  if (yPos > 220) { doc.addPage(); yPos = 20; }
  doc.setFontSize(11);
  doc.text("HANDOVER / SBAR", 10, yPos);
  doc.line(10, yPos + 2, 200, yPos + 2);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const sbarLines = doc.splitTextToSize(data.handover.sbar || "No narrative recorded.", 180);
  doc.text(sbarLines, 10, yPos);
  yPos += sbarLines.length * 5 + 15;

  if (yPos > 200) { doc.addPage(); yPos = 20; }
  
  doc.setFillColor(245, 245, 245);
  doc.rect(10, yPos, 190, 45, 'F');
  doc.setFontSize(9);
  doc.setTextColor(50);
  doc.text("GOVERNANCE & DISCHARGE:", 15, yPos + 6);
  doc.text(`Safeguarding: ${data.governance.safeguarding.concerns ? 'YES' : 'NO'}`, 15, yPos + 12);
  doc.text(`Outcome: ${data.governance.discharge}`, 15, yPos + 18);
  if (data.governance.destinationLocation) doc.text(`Destination: ${data.governance.destinationLocation}`, 90, yPos + 18);
  
  // --- Receiving Details ---
  if (data.handover.receivingClinicianName) {
      doc.text(`Handover To: ${data.handover.receivingClinicianName}`, 15, yPos + 30);
      doc.text(`PIN/Reg: ${data.handover.receivingClinicianPin}`, 90, yPos + 30);
  }

  yPos += 55;

  // --- Signatures ---
  doc.setTextColor(0);
  doc.setFontSize(8);
  doc.text("I confirm that the clinical assessment and treatment recorded is accurate.", 10, yPos);
  yPos += 10;

  let sigStart = yPos;
  
  // Clinician Sig
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("Treating Clinician:", 10, sigStart);
  if (data.handover.clinicianSignature) {
      try { doc.addImage(data.handover.clinicianSignature, 'PNG', 10, sigStart + 5, 40, 20); } catch(e) {}
  }
  doc.line(10, sigStart + 25, 60, sigStart + 25); 
  doc.text(data.logs[0]?.author || "Clinician", 10, sigStart + 30);

  // Receiving Sig
  if (data.handover.receivingClinicianSignature) {
      doc.text("Receiving Clinician:", 75, sigStart);
      try { doc.addImage(data.handover.receivingClinicianSignature, 'PNG', 75, sigStart + 5, 40, 20); } catch(e) {}
      doc.line(75, sigStart + 25, 125, sigStart + 25);
      doc.text(data.handover.receivingClinicianName || "Receiver", 75, sigStart + 30);
  }

  // Patient Sig
  doc.text("Patient / Rep:", 140, sigStart);
  if (data.handover.patientSignature) {
      try { doc.addImage(data.handover.patientSignature, 'PNG', 140, sigStart + 5, 40, 20); } catch(e) {}
  } else if (data.governance.refusal.patientSignature) {
      try {
         doc.addImage(data.governance.refusal.patientSignature, 'PNG', 140, sigStart + 5, 40, 20);
         doc.setTextColor(200, 0, 0);
         doc.text("(REFUSAL)", 180, sigStart);
         doc.setTextColor(0);
      } catch(e) {}
  }
  doc.line(140, sigStart + 25, 190, sigStart + 25); 

  doc.save(`ePRF-${data.incidentNumber}.pdf`);
};
