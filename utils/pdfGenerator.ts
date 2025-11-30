
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { EPRF } from '../types';
import logo from '../assets/logo.png';

const LOGO_URL = logo;

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

export const generateSafeguardingPDF = async (data: EPRF) => {
    const doc: any = new jsPDF();
    const themeRed = '#DC2626'; 
    let yPos = 20;

    let logoData = '';
    try { logoData = await getImageData(LOGO_URL); } catch (e) {}

    // Header
    doc.setFillColor(themeRed);
    doc.rect(0, 0, 210, 35, 'F');
    if (logoData) try { doc.addImage(logoData, 'PNG', 12, 6, 22, 22); } catch (e) {}

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("CONFIDENTIAL SAFEGUARDING REFERRAL", 40, 20);
    
    doc.setFontSize(10);
    doc.text(`INCIDENT: ${data.incidentNumber}`, 195, 15, { align: 'right' });
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, 195, 22, { align: 'right' });

    yPos = 45;
    doc.setTextColor(0);

    // Subject
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`SUBJECT: ${data.governance.safeguarding.category || 'Unknown Category'}`, 15, yPos);
    yPos += 10;

    // Patient Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("Patient Details", 15, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${data.patient.firstName} ${data.patient.lastName}`, 15, yPos);
    doc.text(`DOB: ${data.patient.dob}`, 15, yPos + 6);
    doc.text(`NHS: ${data.patient.nhsNumber}`, 15, yPos + 12);
    doc.text(`Address: ${data.patient.address}`, 15, yPos + 18);
    yPos += 30;

    // Concerns
    doc.setFont('helvetica', 'bold');
    doc.text("Nature of Concern", 15, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Categories: ${data.governance.safeguarding.type?.join(', ') || 'Unspecified'}`, 15, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text("Detailed Narrative / Cause for Concern", 15, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(data.governance.safeguarding.details || 'No details provided.', 180);
    doc.text(splitText, 15, yPos);
    yPos += (splitText.length * 5) + 10;

    // Footer
    doc.setFontSize(8);
    doc.text("This document contains sensitive personal data. Handle in accordance with GDPR and Caldicott Principles.", 105, 280, { align: 'center' });

    doc.save(`Safeguarding_${data.incidentNumber}.pdf`);
};

export const generateEPRF_PDF = async (data: EPRF) => {
  const doc: any = new jsPDF();
  const themeBlue = '#0052CC'; 
  const themeDark = '#091E42';
  const themeGrey = '#F1F5F9';

  let yPos = 20;

  const checkPage = (heightNeeded: number) => {
      if (yPos + heightNeeded > 280) {
          doc.addPage();
          yPos = 20;
      }
  };

  const printSectionHeader = (title: string) => {
      checkPage(15);
      doc.setFillColor(240, 240, 240);
      doc.rect(10, yPos, 190, 8, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(title.toUpperCase(), 12, yPos + 5.5);
      yPos += 12;
  };

  let logoData = '';
  try { logoData = await getImageData(LOGO_URL); } catch (e) {}

  // --- HEADER ---
  doc.setFillColor(themeDark);
  doc.rect(0, 0, 210, 35, 'F');
  if (logoData) try { doc.addImage(logoData, 'PNG', 12, 6, 22, 22); } catch (e) {}

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("AEGIS MEDICAL SOLUTIONS", 40, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("CLINICAL PATIENT RECORD", 40, 23);
  
  doc.setFontSize(9);
  doc.text(`INCIDENT: ${data.incidentNumber}`, 195, 12, { align: 'right' });
  doc.text(`DATE: ${new Date().toLocaleDateString()}`, 195, 17, { align: 'right' });
  doc.text(`CALL SIGN: ${data.callSign || 'N/A'}`, 195, 22, { align: 'right' });
  
  yPos = 45;

  // --- DEMOGRAPHICS ---
  doc.setFillColor(themeBlue);
  doc.rect(10, yPos - 5, 190, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.patient.lastName.toUpperCase()}, ${data.patient.firstName}`, 15, yPos + 4);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const dobStr = data.patient.dob ? new Date(data.patient.dob).toLocaleDateString() : 'Unknown';
  doc.text(`DOB: ${dobStr}`, 120, yPos + 4);
  doc.text(`NHS: ${data.patient.nhsNumber || 'N/A'}`, 160, yPos + 4);
  
  yPos += 20;

  // --- TIMINGS ---
  doc.autoTable({
      startY: yPos,
      head: [['Received', 'Mobile', 'On Scene', 'Contact', 'Depart', 'Hospital', 'Clear']],
      body: [[
          data.times.callReceived || '-',
          data.times.mobile || '-',
          data.times.onScene || '-',
          data.times.patientContact || '-',
          data.times.departScene || '-',
          data.times.atHospital || '-',
          data.times.clear || '-'
      ]],
      theme: 'plain',
      styles: { fontSize: 8, halign: 'center' },
      headStyles: { fillColor: themeGrey, textColor: 50, fontStyle: 'bold' }
  });
  yPos = doc.lastAutoTable.finalY + 10;

  // --- HISTORY & SAMPLE ---
  printSectionHeader("Clinical History & SAMPLE");
  const hxData = [
      ['Presenting Complaint', data.history.presentingComplaint],
      ['History of PC', data.history.historyOfPresentingComplaint],
      ['Symptoms', data.history.sample?.symptoms || '-'],
      ['Allergies', data.history.allergies],
      ['Medications', data.history.medications],
      ['Past History', data.history.pastMedicalHistory],
      ['Last Oral Intake', data.history.sample?.lastOralIntake || '-'],
      ['Events Prior', data.history.sample?.eventsPrior || '-']
  ];
  doc.autoTable({
      startY: yPos,
      body: hxData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold', fillColor: themeGrey }, 1: { cellWidth: 'auto' } }
  });
  yPos = doc.lastAutoTable.finalY + 10;

  // --- PRIMARY SURVEY ---
  printSectionHeader("Primary Survey <C>ABCDE");
  const ps = data.assessment.primary;
  const psData = [
      ['<C> Catastrophic Haemorrhage', ps.catastrophicHaemorrhage ? 'YES - MANAGED' : 'No'],
      ['A - Airway', `${ps.airway.patency || ps.airway.status} (${ps.airway.notes || 'Clear'})`],
      ['B - Breathing', `Effort: ${ps.breathing.effort}, Expansion: ${ps.breathing.chestExpansion || 'Equal'}, Sounds: ${ps.breathing.soundsL}/${ps.breathing.soundsR}`],
      ['C - Circulation', `Pulse: ${ps.circulation.radialPulse}, Skin: ${ps.circulation.skin}, CRT: ${ps.circulation.capRefill}`],
      ['D - Disability', `AVPU: ${ps.disability.avpu}, GCS: ${ps.disability.gcs || '-'}, Pupils: ${ps.disability.pupils}, BM: ${ps.disability.bloodGlucose}`],
      ['E - Exposure', `Injuries: ${ps.exposure.injuriesFound ? 'Yes' : 'No'}, Temp: ${ps.exposure.temp}`]
  ];
  doc.autoTable({
      startY: yPos,
      body: psData,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', width: 50 } }
  });
  yPos = doc.lastAutoTable.finalY + 10;

  if (data.assessment.clinicalNarrative) {
      checkPage(30);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("Examination Narrative:", 10, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(data.assessment.clinicalNarrative, 190);
      doc.text(splitText, 10, yPos);
      yPos += (splitText.length * 4) + 10;
  }

  // --- VITALS ---
  if (data.vitals.length > 0) {
      printSectionHeader("Observations");
      const vitalsBody = data.vitals.map(v => [
          v.time, v.rr, `${v.spo2}%`, v.oxygen ? 'Yes' : 'Air', `${v.bpSystolic}/${v.bpDiastolic}`, 
          v.hr, v.temp, v.avpu === 'A' ? `GCS ${v.gcs}` : v.avpu, v.bloodGlucose || '-', v.painScore, v.news2Score
      ]);
      doc.autoTable({
          startY: yPos,
          head: [['Time', 'RR', 'SpO2', 'O2', 'BP', 'HR', 'Temp', 'AVPU', 'BM', 'Pain', 'NEWS2']],
          body: vitalsBody,
          theme: 'striped',
          styles: { fontSize: 8, halign: 'center' },
          headStyles: { fillColor: themeDark }
      });
      yPos = doc.lastAutoTable.finalY + 10;
  }

  // --- INJURIES / BODY MAP IMAGE ---
  if (data.bodyMapImage || (data.injuries && data.injuries.length > 0)) {
      printSectionHeader("Injuries & Body Map");
      
      if (data.bodyMapImage) {
          checkPage(80);
          try {
              doc.addImage(data.bodyMapImage, 'PNG', 10, yPos, 60, 120);
              // If image exists, text table goes next to it
              const injuryBody = data.injuries.filter(i => i.type !== 'IV' && i.type !== 'Other').map(i => [
                  i.location || 'Unknown',
                  i.type,
                  i.subtype || '-',
                  i.notes || '-'
              ]);
              if (injuryBody.length > 0) {
                  doc.autoTable({
                      startY: yPos,
                      margin: { left: 80 },
                      head: [['Location', 'Type', 'Description', 'Notes']],
                      body: injuryBody,
                      theme: 'striped',
                      styles: { fontSize: 8 },
                      headStyles: { fillColor: '#DC2626' }
                  });
              }
              yPos += 125;
          } catch (e) {
              console.error("Error adding body map image", e);
          }
      } else {
          // Just table
          const injuryBody = data.injuries.filter(i => i.type !== 'IV' && i.type !== 'Other').map(i => [
              i.location || 'Unknown',
              i.type,
              i.subtype || '-',
              i.notes || '-'
          ]);
          doc.autoTable({
              startY: yPos,
              head: [['Location', 'Type', 'Description', 'Notes']],
              body: injuryBody,
              theme: 'striped',
              styles: { fontSize: 8 },
              headStyles: { fillColor: '#DC2626' }
          });
          yPos = doc.lastAutoTable.finalY + 10;
      }
  }

  // --- INTERVENTIONS & ACCESS MAP ---
  if (data.treatments.drugs.length > 0 || data.treatments.procedures.length > 0) {
      printSectionHeader("Interventions");
      
      if (data.accessMapImage) {
          checkPage(80);
          doc.addImage(data.accessMapImage, 'PNG', 140, yPos, 40, 80);
      }

      const combined = [
          ...data.treatments.drugs.map(d => [d.time, 'Drug', `${d.drugName} ${d.dose} ${d.route}`, d.administeredBy, d.witnessedBy || '-']),
          ...data.treatments.procedures.map(p => [p.time, 'Procedure', `${p.type} ${p.size || ''} ${p.site || ''}`, p.performedBy, '-'])
      ].sort((a,b) => a[0].localeCompare(b[0]));

      doc.autoTable({
          startY: yPos,
          margin: { right: data.accessMapImage ? 60 : 10 },
          head: [['Time', 'Type', 'Detail', 'Clinician', 'Witness']],
          body: combined,
          theme: 'striped',
          styles: { fontSize: 8 }
      });
      
      yPos = Math.max(doc.lastAutoTable.finalY + 10, yPos + (data.accessMapImage ? 85 : 0));
  }

  // --- DIAGNOSIS & PLAN ---
  printSectionHeader("Diagnosis & Management");
  const planData = [
      ['Impression', data.clinicalDecision?.workingImpression || '-'],
      ['Differentials', data.clinicalDecision?.differentialDiagnosis || '-'],
      ['Management Plan', data.clinicalDecision?.managementPlan || '-'],
      ['Outcome', data.governance.discharge || data.clinicalDecision?.finalDisposition || '-']
  ];
  doc.autoTable({
      startY: yPos,
      body: planData,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
  });
  yPos = doc.lastAutoTable.finalY + 10;

  // --- GOVERNANCE ---
  if (data.governance.capacity.status === 'Capacity Lacking' || data.governance.refusal.isRefusal || data.governance.safeguarding.concerns) {
      printSectionHeader("Governance");
      
      const govBody = [];
      if (data.governance.capacity.status === 'Capacity Lacking') {
          govBody.push(['Mental Capacity', 'Patient LACKS capacity. Best interests acted upon.']);
      }
      if (data.governance.refusal.isRefusal) {
          govBody.push(['Refusal', 'Patient refused care. Risks explained. Capacity confirmed.']);
      }
      if (data.governance.safeguarding.concerns) {
          govBody.push(['Safeguarding', `Concerns raised: ${data.governance.safeguarding.category}. Referral form generated.`]);
      }
      
      doc.autoTable({
          startY: yPos,
          body: govBody,
          theme: 'grid',
          styles: { fontSize: 8 },
          columnStyles: { 0: { fontStyle: 'bold', textColor: 200 } }
      });
      yPos = doc.lastAutoTable.finalY + 10;
  }

  // --- SIGNATURES ---
  checkPage(50); // Ensure space for sigs
  
  // Physical Signature Image
  if (data.handover.clinicianSignature) {
      if (data.handover.clinicianSignature.startsWith('data:image')) {
          doc.addImage(data.handover.clinicianSignature, 'PNG', 20, yPos, 60, 20);
          doc.setFontSize(8);
          doc.text("Clinician Signature (Physical)", 20, yPos + 25);
      }
  }

  // Digital Stamp
  if (data.status === 'Submitted') {
      doc.setDrawColor(0, 100, 0);
      doc.setLineWidth(0.5);
      doc.rect(120, yPos, 70, 25);
      
      doc.setTextColor(0, 100, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("DIGITALLY VERIFIED", 155, yPos + 8, { align: 'center' });
      
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      // Assuming the first assisting clinician is the lead if not explicitly stored
      const signer = data.assistingClinicians[0]?.name || "Clinician"; 
      doc.text(`Signed by: ${signer}`, 155, yPos + 14, { align: 'center' });
      doc.text(`Date: ${new Date(data.lastUpdated).toLocaleString()}`, 155, yPos + 20, { align: 'center' });
  }

  // Footer Numbers
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount} - Confidential Patient Record - Generated by Aegis`, 105, 290, { align: 'center' });
  }

  doc.save(`ePRF_${data.incidentNumber}.pdf`);
};