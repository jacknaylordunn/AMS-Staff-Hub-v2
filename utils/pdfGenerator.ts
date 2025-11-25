
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

  // --- Load Logo ---
  let logoData = '';
  try {
      logoData = await getImageData(LOGO_URL);
  } catch (e) {
      console.error("Logo load failed", e);
  }

  // --- Document Header ---
  doc.setFillColor(themeDark);
  doc.rect(0, 0, 210, 30, 'F');
  
  if (logoData) {
      try {
        // White bg for logo if needed or direct overlay
        doc.addImage(logoData, 'PNG', 10, 5, 20, 20);
      } catch (e) { console.error(e); }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("AEGIS MEDICAL SOLUTIONS", 35, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("CLINICAL PATIENT RECORD", 35, 22);
  doc.text("aegismedicalsolutions.co.uk", 35, 27);

  doc.setFontSize(12);
  doc.text("CONFIDENTIAL", 195, 15, { align: 'right' });
  doc.setFontSize(9);
  doc.text(`INCIDENT REF: ${data.incidentNumber}`, 195, 25, { align: 'right' });

  // --- Patient Banner ---
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

  let yPos = 55;

  // --- Incident Summary ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("INCIDENT DETAILS", 10, yPos);
  
  doc.autoTable({
    startY: yPos + 3,
    head: [['Date', 'Call Sign', 'Mode', 'Location', 'Time Call', 'Time Scene']],
    body: [[
        new Date().toLocaleDateString(), 
        data.callSign, 
        data.mode, 
        data.location,
        data.times.callReceived || '-',
        data.times.onScene || '-'
    ]],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: themeGrey, textColor: 50, fontStyle: 'bold' },
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // --- Clinical History ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("CLINICAL HISTORY & EXAM", 10, yPos);
  doc.setDrawColor(200);
  doc.line(10, yPos + 2, 200, yPos + 2);
  yPos += 8;

  const historyData = [
      ['Presenting Complaint', data.history.presentingComplaint],
      ['History of PC', data.history.historyOfPresentingComplaint],
      ['Past Medical History', data.history.pastMedicalHistory],
      ['Allergies', data.history.allergies],
      ['Current Medication', data.history.medications]
  ];

  doc.autoTable({
      startY: yPos,
      body: historyData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold', fillColor: themeGrey }, 1: { cellWidth: 'auto' } },
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // --- Primary Survey ---
  if (yPos > 250) { doc.addPage(); yPos = 20; }
  doc.setFontSize(11);
  doc.text("PRIMARY SURVEY (ABCDE)", 10, yPos);
  doc.line(10, yPos + 2, 200, yPos + 2);
  yPos += 8;

  doc.autoTable({
      startY: yPos,
      head: [['Airway', 'Breathing', 'Circulation', 'Disability', 'Exposure']],
      body: [[data.assessment.airway, data.assessment.breathing, data.assessment.circulation, data.assessment.disability, data.assessment.exposure]],
      theme: 'striped',
      headStyles: { fillColor: themeBlue, textColor: 255 },
      styles: { halign: 'center' }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // --- Vital Signs ---
  doc.text("OBSERVATIONS", 10, yPos);
  const vitalsBody = data.vitals?.map((v) => [
    v.time, v.hr, v.rr, `${v.bpSystolic}/${v.bpDiastolic}`, `${v.spo2}%`, v.oxygen ? 'Yes' : 'Air', `${v.temp}°C`, v.avpu, v.news2Score
  ]) || [];

  doc.autoTable({
    startY: yPos + 3,
    head: [['Time', 'HR', 'RR', 'BP', 'SpO2', 'O2', 'Temp', 'AVPU', 'NEWS2']],
    body: vitalsBody,
    theme: 'striped',
    styles: { fontSize: 9, halign: 'center' },
    headStyles: { fillColor: themeDark, textColor: 255 }
  });

  yPos = doc.lastAutoTable.finalY + 10;

  // --- Drugs & Treatment ---
  if (data.treatments.drugs.length > 0) {
      if (yPos > 230) { doc.addPage(); yPos = 20; }
      doc.text("MEDICATION ADMINISTERED", 10, yPos);
      const drugsBody = data.treatments.drugs.map((d) => [
          d.time, d.drugName, d.dose, d.route, d.administeredBy, d.witnessedBy ? `Yes (${d.witnessedBy})` : '-'
      ]);
      doc.autoTable({
          startY: yPos + 3,
          head: [['Time', 'Drug', 'Dose', 'Route', 'Admin By', 'Witnessed']],
          body: drugsBody,
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: themeBlue }
      });
      yPos = doc.lastAutoTable.finalY + 10;
  }

  // --- Handover / SBAR ---
  if (yPos > 220) { doc.addPage(); yPos = 20; }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("HANDOVER / NARRATIVE", 10, yPos);
  doc.line(10, yPos + 2, 200, yPos + 2);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const sbarLines = doc.splitTextToSize(data.handover.sbar || "No narrative recorded.", 180);
  doc.text(sbarLines, 10, yPos);
  yPos += sbarLines.length * 5 + 15;

  // --- Signatures & Governance ---
  if (yPos > 200) { doc.addPage(); yPos = 20; }
  
  // Governance Box
  doc.setFillColor(240, 240, 240);
  doc.rect(10, yPos, 190, 25, 'F');
  doc.setFontSize(8);
  doc.setTextColor(50);
  doc.text("GOVERNANCE CHECKS:", 15, yPos + 6);
  doc.text(`Safeguarding Concerns: ${data.governance.safeguarding.concerns ? 'YES' : 'NO'}`, 15, yPos + 12);
  doc.text(`Capacity Status: ${data.governance.capacity.status}`, 15, yPos + 17);
  doc.text(`Discharge Outcome: ${data.governance.discharge}`, 90, yPos + 12);
  yPos += 35;

  // Declarations
  doc.setTextColor(0);
  doc.setFontSize(8);
  doc.text("I confirm that the clinical assessment and treatment recorded is accurate to the best of my knowledge.", 10, yPos);
  yPos += 10;

  let sigStart = yPos;
  
  // Clinician Sig
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("Clinician Signature:", 10, sigStart);
  if (data.handover.clinicianSignature) {
      try {
         doc.addImage(data.handover.clinicianSignature, 'PNG', 10, sigStart + 5, 40, 20);
      } catch(e) { console.error(e); }
  }
  doc.line(10, sigStart + 25, 60, sigStart + 25); // Underline
  doc.text(data.logs[0]?.author || "Clinician", 10, sigStart + 30);

  // Patient Sig
  doc.text("Patient / Rep Signature:", 100, sigStart);
  if (data.handover.patientSignature) {
      try {
         doc.addImage(data.handover.patientSignature, 'PNG', 100, sigStart + 5, 40, 20);
      } catch(e) { console.error(e); }
  } else if (data.governance.refusal.signature) {
      try {
         doc.addImage(data.governance.refusal.signature, 'PNG', 100, sigStart + 5, 40, 20);
         doc.setTextColor(200, 0, 0);
         doc.text("(REFUSAL OF CARE)", 150, sigStart);
         doc.setTextColor(0);
      } catch(e) { console.error(e); }
  }
  doc.line(100, sigStart + 25, 150, sigStart + 25); // Underline

  // --- Footer ---
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setDrawColor(themeBlue);
    doc.line(10, 280, 200, 280);

    doc.setFontSize(7);
    doc.setTextColor(100);
    
    doc.text(`Generated: ${new Date().toLocaleString()}`, 10, 285);
    doc.text(`Aegis Staff Hub | aegismedicalsolutions.co.uk`, 10, 289);

    doc.setFont('helvetica', 'bold');
    doc.text("CONFIDENTIAL PATIENT RECORD - GDPR SENSITIVE", 105, 285, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text("Contains sensitive personal data. Do not distribute without authorisation.", 105, 289, { align: 'center' });

    doc.text(`Page ${i} of ${pageCount}`, 200, 285, { align: 'right' });
  }

  doc.save(`ePRF-${data.incidentNumber}.pdf`);
};
