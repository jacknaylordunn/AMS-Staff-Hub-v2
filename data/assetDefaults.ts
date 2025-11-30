import { ChecklistItem } from '../types';

export const DEFAULT_VDI_CHECKLIST: ChecklistItem[] = [
    { id: 'ext_tyres', label: 'Tyres (Tread & Pressure)', category: 'External' },
    { id: 'ext_lights', label: 'Lights, Sirens & Indicators', category: 'External' },
    { id: 'ext_body', label: 'Bodywork Damage Check', category: 'External' },
    { id: 'eng_fluids', label: 'Fluid Levels (Oil, Coolant, Brake)', category: 'Engine' },
    { id: 'eng_fuel', label: 'Fuel Level (> 1/4)', category: 'Engine' },
    { id: 'int_clean', label: 'Interior Cleanliness', category: 'Interior' },
    { id: 'int_equip', label: 'Medical Equipment Secure', category: 'Interior' },
];

export const DEFAULT_KIT_CHECKLIST_ITEMS: Record<string, string[]> = {
    'Paramedic Bag': ['Monitor (ECG/SpO2/BP)', 'Advanced Airway Kit (iGel/Laryngoscope)', 'Cannulation Kit & Fluids', 'Drugs Pack (JRCALC Checked)', 'IO Driver & Needles'],
    'Response Bag': ['Oxygen Cylinder (>50%)', 'BVM (Adult/Paed)', 'Suction Unit (Functioning)', 'Diagnostic Kit (BP/SpO2/Therm/BM)', 'Basic Airway (OPA/NPA)'],
    'Trauma Bag': ['Tourniquets (x2)', 'Blast Bandages / Haemostatics', 'Pelvic Binder', 'Splints (Sam/Traction)', 'Chest Seals'],
    'Welfare Bag': ['Water Bottles', 'Energy Snacks', 'Foil Blankets', 'Vomit Bowls', 'Basic First Aid (Plasters)', 'Torch/Headtorch'],
    'Drug Pack': ['CD Register Check', 'JRCALC Pocket Book', 'Ampoule Snapper', 'Flush Syringes'],
    'O2 Bag': ['CD Oxygen Cylinder', 'Entonox Cylinder', 'Masks (NRB/Nasal/Neb)', 'Tubing']
};