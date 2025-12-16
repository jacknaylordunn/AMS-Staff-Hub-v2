
export interface HospitalTrust {
    name: string;
    regions: HospitalRegion[];
}

export interface HospitalRegion {
    name: string;
    hospitals: Hospital[];
}

export interface Hospital {
    name: string;
    departments: string[];
}

export const COMMON_DEPARTMENTS = [
    'Emergency Department (ED)',
    'Major Trauma Centre (MTC)',
    'Trauma Unit (TU)',
    'Hyper-Acute Stroke Unit (HASU)',
    'PPCI (Heart Attack Centre)',
    'Paediatric ED',
    'Maternity / Labour Ward',
    'SDEC / Ambulatory Care',
    'Minor Injuries Unit (MIU)',
    'Spinal Injuries Centre',
    'Neurosurgery',
    'Burns Centre'
];

export const HOSPITAL_DATA: HospitalTrust[] = [
    {
        name: 'South Central (SCAS)',
        regions: [
            {
                name: 'Oxfordshire & Buckinghamshire',
                hospitals: [
                    { name: "John Radcliffe Hospital (Oxford)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)', 'Paediatric ED', 'Neurosurgery'] },
                    { name: "Milton Keynes University Hospital", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)', 'Paediatric ED'] },
                    { name: "Stoke Mandeville Hospital", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'Spinal Injuries Centre'] },
                    { name: "Wycombe General Hospital", departments: ['Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)', 'Minor Injuries Unit (MIU)'] },
                    { name: "Horton General Hospital (Banbury)", departments: ['Emergency Department (ED)'] }
                ]
            },
            {
                name: 'Berkshire',
                hospitals: [
                    { name: "Royal Berkshire Hospital (Reading)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] },
                    { name: "Wexham Park Hospital (Slough)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] }
                ]
            },
            {
                name: 'Hampshire',
                hospitals: [
                    { name: "University Hospital Southampton", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)', 'Paediatric ED', 'Neurosurgery'] },
                    { name: "Queen Alexandra Hospital (Portsmouth)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] },
                    { name: "Basingstoke & North Hampshire", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'PPCI (Heart Attack Centre)'] },
                    { name: "Royal Hampshire County (Winchester)", departments: ['Emergency Department (ED)', 'Hyper-Acute Stroke Unit (HASU)'] },
                    { name: "St Mary's Hospital (Isle of Wight)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'Hyper-Acute Stroke Unit (HASU)'] }
                ]
            }
        ]
    },
    {
        name: 'London (LAS)',
        regions: [
            {
                name: 'Major Trauma Centres',
                hospitals: [
                    { name: "The Royal London Hospital", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Hyper-Acute Stroke Unit (HASU)'] },
                    { name: "St Mary's Hospital (Paddington)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'PPCI (Heart Attack Centre)'] },
                    { name: "St George's Hospital (Tooting)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] },
                    { name: "King's College Hospital", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)', 'Neurosurgery'] }
                ]
            },
            {
                name: 'Specialist Centers',
                hospitals: [
                    { name: "Harefield Hospital", departments: ['PPCI (Heart Attack Centre)'] },
                    { name: "St Bartholomew's (Barts)", departments: ['PPCI (Heart Attack Centre)'] },
                    { name: "Royal Brompton", departments: ['Specialist Heart/Lung'] }
                ]
            },
            {
                name: 'General EDs & Other',
                hospitals: [
                    { name: "Charing Cross Hospital", departments: ['Emergency Department (ED)', 'Hyper-Acute Stroke Unit (HASU)', 'Neurosurgery'] },
                    { name: "UCLH (University College)", departments: ['Emergency Department (ED)', 'Hyper-Acute Stroke Unit (HASU)'] },
                    { name: "Northwick Park Hospital", departments: ['Emergency Department (ED)', 'Hyper-Acute Stroke Unit (HASU)'] },
                    { name: "Chelsea & Westminster", departments: ['Emergency Department (ED)', 'Burns Centre'] },
                    { name: "Royal Free Hospital", departments: ['Emergency Department (ED)', 'PPCI (Heart Attack Centre)', 'Infectious Diseases'] },
                    { name: "St Thomas' Hospital", departments: ['Emergency Department (ED)', 'PPCI (Heart Attack Centre)'] },
                    { name: "Hillingdon Hospital", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)'] },
                    { name: "West Middlesex Hospital", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)'] }
                ]
            }
        ]
    },
    {
        name: 'South East Coast (SECAmb)',
        regions: [
            {
                name: 'Sussex',
                hospitals: [
                    { name: "Royal Sussex County (Brighton)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Neurosurgery', 'PPCI (Heart Attack Centre)'] },
                    { name: "Worthing Hospital", departments: ['Emergency Department (ED)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] },
                    { name: "Eastbourne DGH", departments: ['Emergency Department (ED)', 'Hyper-Acute Stroke Unit (HASU)'] },
                    { name: "Conquest Hospital (Hastings)", departments: ['Emergency Department (ED)', 'PPCI (Heart Attack Centre)'] }
                ]
            },
            {
                name: 'Kent',
                hospitals: [
                    { name: "William Harvey (Ashford)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'PPCI (Heart Attack Centre)', 'Hyper-Acute Stroke Unit (HASU)'] },
                    { name: "Medway Maritime", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'PPCI (Heart Attack Centre)'] },
                    { name: "Darent Valley (Dartford)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)'] },
                    { name: "Tunbridge Wells (Pembury)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'PPCI (Heart Attack Centre)'] }
                ]
            },
            {
                name: 'Surrey',
                hospitals: [
                    { name: "Royal Surrey County (Guildford)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)'] },
                    { name: "East Surrey (Redhill)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'PPCI (Heart Attack Centre)'] },
                    { name: "St Peter's (Chertsey)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'PPCI (Heart Attack Centre)'] },
                    { name: "Frimley Park", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] }
                ]
            }
        ]
    },
    {
        name: 'South Western (SWASFT)',
        regions: [
            {
                name: 'Bristol & Avon',
                hospitals: [
                    { name: "Southmead Hospital (Bristol)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)', 'Neurosurgery'] },
                    { name: "Bristol Royal Infirmary (BRI)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'PPCI (Heart Attack Centre)', 'Paediatric ED'] }
                ]
            },
            {
                name: 'Devon',
                hospitals: [
                    { name: "Derriford Hospital (Plymouth)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)', 'Neurosurgery'] },
                    { name: "Royal Devon & Exeter (RD&E)", departments: ['Emergency Department (ED)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] }
                ]
            },
            {
                name: 'Dorset',
                hospitals: [
                    { name: "Royal Bournemouth", departments: ['Emergency Department (ED)', 'PPCI (Heart Attack Centre)'] },
                    { name: "Poole Hospital", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)'] }
                ]
            },
            {
                name: 'Cornwall',
                hospitals: [
                    { name: "Royal Cornwall (Treliske)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] }
                ]
            }
        ]
    },
    {
        name: 'East of England (EEAST)',
        regions: [
            {
                name: 'Cambridgeshire',
                hospitals: [
                    { name: "Addenbrooke's Hospital (Cambridge)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)', 'Transplant Centre'] }
                ]
            },
            {
                name: 'Norfolk',
                hospitals: [
                    { name: "Norfolk & Norwich", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] }
                ]
            },
            {
                name: 'Bedfordshire & Herts',
                hospitals: [
                    { name: "Luton & Dunstable", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] },
                    { name: "Watford General", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)'] },
                    { name: "Lister Hospital (Stevenage)", departments: ['Emergency Department (ED)', 'Trauma Unit (TU)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] }
                ]
            },
            {
                name: 'Essex',
                hospitals: [
                    { name: "Basildon University", departments: ['Emergency Department (ED)', 'PPCI (Heart Attack Centre)', 'Hyper-Acute Stroke Unit (HASU)', 'Cardiothoracic Centre'] }
                ]
            }
        ]
    },
    {
        name: 'West Midlands (WMAS)',
        regions: [
            {
                name: 'Birmingham',
                hospitals: [
                    { name: "Queen Elizabeth (Birmingham)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Neurosurgery'] },
                    { name: "Birmingham Heartlands", departments: ['Emergency Department (ED)', 'PPCI (Heart Attack Centre)'] }
                ]
            },
            {
                name: 'Staffordshire',
                hospitals: [
                    { name: "Royal Stoke University", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Neurosurgery'] }
                ]
            },
            {
                name: 'Coventry',
                hospitals: [
                    { name: "University Hospital Coventry", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] }
                ]
            },
            {
                name: 'Wolverhampton',
                hospitals: [
                    { name: "New Cross Hospital", departments: ['Emergency Department (ED)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] }
                ]
            }
        ]
    },
    {
        name: 'East Midlands (EMAS)',
        regions: [
            {
                name: 'Nottinghamshire',
                hospitals: [
                    { name: "Queen's Medical Centre (Nottingham)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Neurosurgery', 'Spinal Centre'] }
                ]
            },
            {
                name: 'Leicestershire',
                hospitals: [
                    { name: "Leicester Royal Infirmary", departments: ['Emergency Department (ED)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] }
                ]
            },
            {
                name: 'Northamptonshire',
                hospitals: [
                    { name: "Kettering General", departments: ['Emergency Department (ED)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] },
                    { name: "Northampton General", departments: ['Emergency Department (ED)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] }
                ]
            }
        ]
    },
    {
        name: 'North West (NWAS)',
        regions: [
            {
                name: 'Greater Manchester',
                hospitals: [
                    { name: "Manchester Royal Infirmary", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)'] },
                    { name: "Salford Royal", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Neurosurgery'] },
                    { name: "Wythenshawe Hospital", departments: ['Emergency Department (ED)', 'PPCI (Heart Attack Centre)', 'Transplant Centre'] }
                ]
            },
            {
                name: 'Merseyside',
                hospitals: [
                    { name: "Aintree University Hospital", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)'] },
                    { name: "Liverpool Heart & Chest", departments: ['PPCI (Heart Attack Centre)'] },
                    { name: "The Walton Centre", departments: ['Neurosurgery (Specialist)'] }
                ]
            },
            {
                name: 'Lancashire',
                hospitals: [
                    { name: "Royal Preston", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Neurosurgery', 'PPCI (Heart Attack Centre)'] }
                ]
            }
        ]
    },
    {
        name: 'North East & Yorkshire',
        regions: [
            {
                name: 'North East (NEAS)',
                hospitals: [
                    { name: "Royal Victoria Infirmary (Newcastle)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)'] },
                    { name: "James Cook University (Middlesbrough)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'PPCI (Heart Attack Centre)', 'Spinal Centre'] }
                ]
            },
            {
                name: 'Yorkshire (YAS)',
                hospitals: [
                    { name: "Leeds General Infirmary", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Hyper-Acute Stroke Unit (HASU)', 'PPCI (Heart Attack Centre)'] },
                    { name: "Northern General (Sheffield)", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Spinal Centre'] },
                    { name: "Hull Royal Infirmary", departments: ['Emergency Department (ED)', 'Major Trauma Centre (MTC)', 'Neurosurgery'] }
                ]
            }
        ]
    },
    {
        name: 'Mental Health & Specialist',
        regions: [
            {
                name: 'Mental Health Units',
                hospitals: [
                    { name: "The Maudsley Hospital (London)", departments: ['Psychiatric Intensive Care (PICU)', 'Place of Safety (S136)'] },
                    { name: "Bethlem Royal Hospital", departments: ['Secure Services', 'Mother & Baby Unit'] },
                    { name: "Springfield University Hospital", departments: ['Forensic Psych', 'Eating Disorders'] },
                    { name: "Broadmoor Hospital", departments: ['High Secure'] },
                    { name: "Littlemore Mental Health Centre", departments: ['Inpatient Psych'] },
                    { name: "Warneford Hospital", departments: ['Highfield Unit (Adolescent)', 'Adult Inpatient'] },
                    { name: "Prospect Park Hospital (Reading)", departments: ['Inpatient Psych', 'Place of Safety (S136)'] },
                    { name: "Elmleigh (Havant)", departments: ['Inpatient Psych', 'Place of Safety (S136)'] },
                    { name: "Antelope House (Southampton)", departments: ['PICU', 'Acute Ward'] }
                ]
            },
            {
                name: 'Paediatric & Orthopaedic',
                hospitals: [
                    { name: "Great Ormond Street (GOSH)", departments: ['Paediatric Specialist'] },
                    { name: "Birmingham Children's Hospital", departments: ['Paeds MTC', 'Paeds PICU'] },
                    { name: "Alder Hey Children's Hospital", departments: ['Paeds MTC'] },
                    { name: "Sheffield Children's Hospital", departments: ['Paeds MTC'] },
                    { name: "Royal National Orthopaedic (Stanmore)", departments: ['Spinal Injuries', 'Bone Tumours'] }
                ]
            }
        ]
    }
];
