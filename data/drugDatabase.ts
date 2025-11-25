export interface Drug {
  name: string;
  class: string;
  routes: string[];
}

export const DRUG_DATABASE: Drug[] = [
  // A - Emergency & Common
  { name: 'Adrenaline 1:1000', class: 'Emergency', routes: ['IM'] },
  { name: 'Adrenaline 1:10,000', class: 'Emergency', routes: ['IV', 'IO'] },
  { name: 'Amiodarone', class: 'Emergency', routes: ['IV', 'IO'] },
  { name: 'Aspirin', class: 'Analgesic', routes: ['PO'] },
  { name: 'Atropine', class: 'Emergency', routes: ['IV', 'IO'] },
  { name: 'Activated Charcoal', class: 'Toxin Binder', routes: ['PO'] },
  
  // B - Antibiotics & Respiratory
  { name: 'Benzylpenicillin', class: 'Antibiotic', routes: ['IV', 'IM'] },
  { name: 'Beclometasone', class: 'Corticosteroid', routes: ['Inhaled'] },
  
  // C - Cardiac & Coagulation
  { name: 'Calcium Gluconate', class: 'Electrolyte', routes: ['IV'] },
  { name: 'Clopidogrel', class: 'Antiplatelet', routes: ['PO'] },
  { name: 'Chlorphenamine', class: 'Antihistamine', routes: ['IV', 'IM', 'PO'] },
  { name: 'Co-Codamol 30/500', class: 'Analgesic', routes: ['PO'] },
  { name: 'Co-Codamol 8/500', class: 'Analgesic', routes: ['PO'] },
  
  // D - Controlled & Critical
  { name: 'Dexamethasone', class: 'Corticosteroid', routes: ['IV', 'PO'] },
  { name: 'Diazepam', class: 'Controlled', routes: ['IV', 'PR', 'PO'] },
  { name: 'Diazemuls', class: 'Controlled', routes: ['IV'] },
  
  // E - Gases & Emergency
  { name: 'Entonox', class: 'Analgesic', routes: ['Inhaled'] },
  { name: 'Ergometrine', class: 'Obstetric', routes: ['IV', 'IM'] },
  
  // F - Fluids & Diuretics
  { name: 'Furosemide', class: 'Diuretic', routes: ['IV'] },
  { name: 'Flucloxacillin', class: 'Antibiotic', routes: ['IV', 'PO'] },
  
  // G - Glucose & Glycaemic
  { name: 'Glucagon', class: 'Hypoglycaemic', routes: ['IM'] },
  { name: 'Glucose 10%', class: 'Hypoglycaemic', routes: ['IV'] },
  { name: 'Glucose 40% Gel', class: 'Hypoglycaemic', routes: ['Buccal'] },
  { name: 'GTN Spray', class: 'Vasodilator', routes: ['Sublingual'] },
  { name: 'GTN Tablet', class: 'Vasodilator', routes: ['Sublingual'] },
  
  // H - Hormones & Steroids
  { name: 'Hydrocortisone', class: 'Corticosteroid', routes: ['IV', 'IM'] },
  { name: 'Haloperidol', class: 'Antipsychotic', routes: ['PO', 'IM'] },
  { name: 'Heparin', class: 'Anticoagulant', routes: ['IV'] },
  
  // I - NSAIDs & Inhalers
  { name: 'Ibuprofen', class: 'Analgesic', routes: ['PO'] },
  { name: 'Ipratropium Bromide', class: 'Bronchodilator', routes: ['Nebulised'] },
  { name: 'Insulin (Actrapid)', class: 'Hypoglycaemic', routes: ['SC', 'IV'] },
  
  // K - Anaesthetics
  { name: 'Ketamine', class: 'Controlled', routes: ['IV', 'IO', 'IM'] },
  { name: 'Ketorolac', class: 'NSAID', routes: ['IV', 'IM'] },
  
  // L - Local Anaesthetics
  { name: 'Lidocaine', class: 'Anaesthetic', routes: ['IV', 'IO', 'SC'] },
  { name: 'Loratadine', class: 'Antihistamine', routes: ['PO'] },
  { name: 'Levetiracetam', class: 'Anticonvulsant', routes: ['IV'] },
  
  // M - Controlled & Critical
  { name: 'Magnesium Sulphate', class: 'Electrolyte', routes: ['IV'] },
  { name: 'Midazolam', class: 'Controlled', routes: ['Buccal', 'IV', 'IM', 'IN'] },
  { name: 'Morphine Sulphate', class: 'Controlled', routes: ['IV', 'IM', 'PO', 'ORAL'] },
  { name: 'Methoxyflurane (Penthrox)', class: 'Analgesic', routes: ['Inhaled'] },
  { name: 'Metoclopramide', class: 'Anti-emetic', routes: ['IV', 'IM'] },
  { name: 'Misoprostol', class: 'Obstetric', routes: ['PR', 'PO'] },
  
  // N - Antagonists
  { name: 'Naloxone', class: 'Antagonist', routes: ['IV', 'IM', 'IN'] },
  { name: 'Nitrous Oxide', class: 'Gas', routes: ['Inhaled'] },
  
  // O - Oxygen & Antiemetics
  { name: 'Ondansetron', class: 'Anti-emetic', routes: ['IV', 'IM', 'PO'] },
  { name: 'Oxygen', class: 'Gas', routes: ['Inhaled'] },
  { name: 'Oxytocin', class: 'Obstetric', routes: ['IV', 'IM'] },
  
  // P - Pain & Parasympathetic
  { name: 'Paracetamol', class: 'Analgesic', routes: ['IV', 'PO', 'PR'] },
  { name: 'Prednisolone', class: 'Corticosteroid', routes: ['PO'] },
  { name: 'Prochlorperazine', class: 'Anti-emetic', routes: ['IM', 'Buccal'] },
  
  // S - Sympathomimetics
  { name: 'Salbutamol', class: 'Bronchodilator', routes: ['Nebulised', 'Inhaled'] },
  { name: 'Sodium Chloride 0.9%', class: 'Fluid', routes: ['IV', 'IO', 'Nebulised', 'Irrigation'] },
  { name: 'Sodium Lactate (Hartmanns)', class: 'Fluid', routes: ['IV', 'IO'] },
  { name: 'Syntometrine', class: 'Obstetric', routes: ['IM'] },
  
  // T - Trauma
  { name: 'Tenecteplase', class: 'Thrombolytic', routes: ['IV'] },
  { name: 'Tranexamic Acid', class: 'Anti-fibrinolytic', routes: ['IV', 'IO', 'PO'] },
  { name: 'Tetracaine', class: 'Anaesthetic', routes: ['Topical'] },
  
  // V - Vitamins etc
  { name: 'Vitamin K', class: 'Vitamin', routes: ['IM', 'IV', 'PO'] },
];

export const CONTROLLED_DRUGS = DRUG_DATABASE.filter(d => d.class === 'Controlled').map(d => d.name);
