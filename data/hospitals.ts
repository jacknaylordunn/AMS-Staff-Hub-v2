
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
    'Urgent Treatment Centre (UTC)',
    'Minor Injuries Unit (MIU)',
    'Eye Casualty',
    'Burns Centre',
    'Spinal Injuries Centre'
];

export const HOSPITAL_DATA: HospitalTrust[] = [
    {
        name: 'South Central (SCAS)',
        regions: [
            {
                name: 'Oxfordshire',
                hospitals: [
                    { name: "John Radcliffe (Oxford)", departments: ['ED', 'Resus', 'EAU', 'HASU', 'PPCI', 'CCU', 'Paeds ED', 'Eye Casualty', 'Neuro ICU', 'SEU', 'AAU', 'Maternity', 'Other'] },
                    { name: "Horton General (Banbury)", departments: ['ED', 'Resus', 'Maternity', 'Other'] },
                    { name: "Wycombe General", departments: ['HASU', 'PPCI', 'CCU', 'MIU', 'Other'] },
                    { name: "Churchill Hospital", departments: ['Oncology', 'Transplant', 'Renal', 'Other'] },
                    { name: "Abingdon Community", departments: ['MIU', 'Other'] },
                    { name: "Witney Community", departments: ['MIU', 'Other'] },
                    { name: "Henley (Townlands)", departments: ['RACU', 'Other'] },
                    { name: "Bicester Community", departments: ['FAV', 'Other'] },
                    { name: "Wallingford Community", departments: ['FAV', 'Other'] }
                ]
            },
            {
                name: 'Buckinghamshire',
                hospitals: [
                    { name: "Stoke Mandeville", departments: ['ED', 'Resus', 'National Spinal Centre', 'Burns', 'Plastics', 'Other'] },
                    { name: "Milton Keynes University", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Paeds ED', 'Other'] },
                    { name: "Buckingham Community", departments: ['MIU', 'Minor Injuries ', 'Other'] },
                    { name: "Marlow Community", departments: ['Hub', 'Outpatient/Rehab', 'Other'] }
                ]
            },
            {
                name: 'Berkshire',
                hospitals: [
                    { name: "Royal Berkshire (Reading)", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Battle Block', 'Other'] },
                    { name: "Wexham Park (Slough)", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Hand Surgery', 'Other'] },
                    { name: "West Berkshire (Newbury)", departments: ['MIU', 'Other'] },
                    { name: "Bracknell Healthspace", departments: ['UTC', 'X-ray', 'Other'] },
                    { name: "St Mark's (Maidenhead)", departments: ['UTC', 'Other'] },
                    { name: "Heatherwood (Ascot)", departments: ['Elective', 'Planned Surgery Hub', 'Other'] }
                ]
            },
            {
                name: 'Hampshire',
                hospitals: [
                    { name: "Southampton General (UHS)", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Paeds ED', 'Neuro', 'Cardiac Thoracic', 'Other'] },
                    { name: "Queen Alexandra (Portsmouth)", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Renal', 'Military (MDHU)', 'Other'] },
                    { name: "Basingstoke & North Hants", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Liver Specialist', 'Other'] },
                    { name: "Royal Hampshire (Winchester)", departments: ['LEH', 'ED', 'Resus', 'HASU', 'Other'] },
                    { name: "St Mary's (Isle of Wight)", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Gosport War Memorial", departments: ['MIU', 'Other'] },
                    { name: "Petersfield Community", departments: ['UTC', 'Other'] },
                    { name: "Lymington New Forest", departments: ['UTC', 'Other'] },
                    { name: "St Mary's (Portsmouth)", departments: ['UTC', 'Other'] }
                ]
            }
        ]
    },
    {
        name: 'London (LAS)',
        regions: [
            {
                name: 'North West Sector',
                hospitals: [
                    { name: "St Mary's (Paddington)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Major Trauma', 'Vascular', 'Other'] },
                    { name: "Charing Cross", departments: ['ED', 'Resus', 'HASU', 'Neuro', 'Oncology', 'Other'] },
                    { name: "Chelsea & Westminster", departments: ['ED', 'Resus', 'Burns', 'Paeds ED', 'Other'] },
                    { name: "Northwick Park", departments: ['ED', 'Resus', 'HASU', 'Infectious Diseases', 'Other'] },
                    { name: "Hillingdon", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Harefield", departments: ['PPCI', 'CCU', 'Other'] },
                    { name: "Central Middlesex", departments: ['UTC', 'UCC', 'Other'] },
                    { name: "Mount Vernon", departments: ['MIU', 'Cancer', 'Other'] },
                    { name: "Ealing Hospital", departments: ['ED', 'Resus', 'Other'] }
                ]
            },
            {
                name: 'North Central Sector',
                hospitals: [
                    { name: "Royal Free", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'High Level Isolation Unit', 'Other'] },
                    { name: "UCLH (Euston)", departments: ['ED', 'Resus', 'HASU', 'Haematology', 'Tropical Diseases', 'Other'] },
                    { name: "Barnet General", departments: ['ED', 'Resus', 'Other'] },
                    { name: "North Middlesex", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Whittington", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Finchley Memorial", departments: ['MIU', 'Other'] },
                    { name: "Edgware Community", departments: ['MIU', 'Other'] }
                ]
            },
            {
                name: 'North East Sector',
                hospitals: [
                    { name: "The Royal London", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "St Barts", departments: ['PPCI', 'CCU', 'Other'] },
                    { name: "Queen's (Romford)", departments: ['ED', 'Resus', 'HASU', 'Neuro', 'Other'] },
                    { name: "Homerton", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Whipps Cross", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Newham", departments: ['ED', 'Resus', 'Other'] },
                    { name: "King George (Ilford)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Harold Wood", departments: ['UTC', 'Polyclinic', 'Other'] },
                    { name: "Barking Hospital", departments: ['UTC', 'Other'] }
                ]
            },
            {
                name: 'South East Sector',
                hospitals: [
                    { name: "King's College (Denmark Hill)", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Liver', 'Neuro', 'Other'] },
                    { name: "St Thomas'", departments: ['ED', 'Resus', 'PPCI', 'CCU', "Evelina Children's Hospital"] },
                    { name: "Princess Royal (PRUH)", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Queen Elizabeth (Woolwich)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Lewisham", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Guy's Hospital", departments: ['UTC', 'Urgent Care ', 'Other'] },
                    { name: "Queen Mary's (Sidcup)", departments: ['UTC', 'Other'] },
                    { name: "Erith & District", departments: ['UTC', 'Other'] },
                    { name: "Beckenham Beacon", departments: ['UTC', 'Other'] }
                ]
            },
            {
                name: 'South West Sector',
                hospitals: [
                    { name: "St George's (Tooting)", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Other'] },
                    { name: "Kingston", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Croydon University", departments: ['ED', 'Resus', 'Other'] },
                    { name: "St Helier", departments: ['ED', 'Resus', 'Renal', 'Other'] },
                    { name: "Epsom Hospital", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Queen Mary's (Roehampton)", departments: ['MIU', 'Amputee Rehab', 'Other'] },
                    { name: "Teddington Memorial", departments: ['UTC', 'Other'] }
                ]
            }
        ]
    },
    {
        name: 'South East Coast (SECAmb)',
        regions: [
            {
                name: 'Kent',
                hospitals: [
                    { name: "William Harvey (Ashford)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Acting MTC', 'Other'] },
                    { name: "QEQM (Margate)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Medway Maritime", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Tunbridge Wells (Pembury)", departments: ['ED', 'Resus', 'Trauma Receiving', 'Other'] },
                    { name: "Darent Valley", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Kent & Canterbury", departments: ['UTC', 'UTC', 'Renal', 'Vascular Inpatients', 'Other'] },
                    { name: "Maidstone", departments: ['UTC', 'Oncology', 'Other'] },
                    { name: "Folkestone (Royal Victoria)", departments: ['UTC', 'Other'] },
                    { name: "Deal Hospital", departments: ['MIU', 'Other'] },
                    { name: "Sevenoaks", departments: ['UTC', 'Other'] },
                    { name: "Sittingbourne Memorial", departments: ['MIU', 'Other'] },
                    { name: "Sheppey Community", departments: ['MIU', 'Other'] },
                    { name: "Gravesham Community", departments: ['UTC', 'Other'] }
                ]
            },
            {
                name: 'Sussex',
                hospitals: [
                    { name: "Royal Sussex (Brighton)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Neuro', 'Other'] },
                    { name: "Worthing", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Other'] },
                    { name: "St Richard's (Chichester)", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Eastbourne DGH", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Conquest (Hastings)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Other'] },
                    { name: "Princess Royal (Haywards Heath)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Lewes Victoria", departments: ['UTC', 'Other'] },
                    { name: "Bognor Regis War Memorial", departments: ['MIU', 'Other'] },
                    { name: "Crawley Hospital", departments: ['UTC', 'Other'] },
                    { name: "Horsham", departments: ['MIU', 'Other'] },
                    { name: "Uckfield Community", departments: ['MIU', 'Other'] }
                ]
            },
            {
                name: 'Surrey (SECAmb Sector)',
                hospitals: [
                    { name: "Royal Surrey (Guildford)", departments: ['ED', 'Resus', 'Oncology', 'Other'] },
                    { name: "East Surrey (Redhill)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Other'] },
                    { name: "St Peter's (Chertsey)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'NICU', 'Other'] },
                    { name: "Frimley Park", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Other'] },
                    { name: "Woking Community", departments: ['UTC', 'Other'] },
                    { name: "Haslemere", departments: ['MIU', 'Other'] }
                ]
            }
        ]
    },
    {
        name: 'South Western (SWASFT)',
        regions: [
            {
                name: 'Bristol, Gloucs & Somerset',
                hospitals: [
                    { name: "Southmead (Bristol)", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Neuro', 'Burns', 'Other'] },
                    { name: "Bristol Royal Infirmary", departments: ['ED', 'Resus', 'PPCI', 'CCU', "Paeds MTC"] },
                    { name: "Gloucestershire Royal", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Cheltenham General", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Oncology', 'Other'] },
                    { name: "Musgrove Park (Taunton)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Yeovil District", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Weston General (WsM)", departments: ['ED/UTC', 'Other'] },
                    { name: "Yate", departments: ['MIU', 'Other'] },
                    { name: "Clevedon", departments: ['MIU', 'Other'] },
                    { name: "Paulton Memorial", departments: ['MIU', 'Other'] },
                    { name: "Bridgwater", departments: ['MIU', 'Other'] },
                    { name: "Minehead", departments: ['MIU', 'Other'] },
                    { name: "Frome", departments: ['MIU', 'Other'] },
                    { name: "Glastonbury (West Mendip)", departments: ['MIU', 'Other'] },
                    { name: "Shepton Mallet", departments: ['MIU', 'Other'] },
                    { name: "Cirencester", departments: ['MIU', 'Other'] },
                    { name: "Stroud General", departments: ['MIU', 'Other'] }
                ]
            },
            {
                name: 'Devon & Cornwall',
                hospitals: [
                    { name: "Derriford (Plymouth)", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Neuro', 'Other'] },
                    { name: "Royal Devon & Exeter", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Torbay", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "North Devon (Barnstaple)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Royal Cornwall (Treliske)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "West Cornwall (Penzance)", departments: ['UTC', 'Other'] },
                    { name: "Newton Abbot", departments: ['MIU', 'Other'] },
                    { name: "Totnes", departments: ['MIU', 'Other'] },
                    { name: "Dawlish", departments: ['MIU', 'Other'] },
                    { name: "Exmouth", departments: ['MIU', 'Other'] },
                    { name: "Honiton", departments: ['MIU', 'Other'] },
                    { name: "Tiverton", departments: ['UTC', 'Other'] },
                    { name: "Camborne Redruth", departments: ['MIU', 'Other'] },
                    { name: "St Austell", departments: ['MIU', 'Other'] },
                    { name: "Bodmin", departments: ['MIU', 'Other'] },
                    { name: "Newquay", departments: ['MIU', 'Other'] }
                ]
            },
            {
                name: 'Dorset & Wiltshire',
                hospitals: [
                    { name: "Royal Bournemouth", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Other'] },
                    { name: "Poole", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Dorset County (Dorchester)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Great Western (Swindon)", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Other'] },
                    { name: "Salisbury District", departments: ['ED', 'Resus', 'Burns', 'Other'] },
                    { name: "Chippenham", departments: ['MIU', 'Other'] },
                    { name: "Trowbridge", departments: ['MIU', 'Other'] },
                    { name: "Warminster", departments: ['MIU', 'Other'] },
                    { name: "Swanage", departments: ['MIU', 'Other'] },
                    { name: "Victoria (Wimborne)", departments: ['MIU', 'Other'] },
                    { name: "Weymouth", departments: ['UTC', 'Other'] }
                ]
            }
        ]
    },
    {
        name: 'East of England (EEAST)',
        regions: [
            {
                name: 'Cambs, Norfolk & Suffolk',
                hospitals: [
                    { name: "Addenbrooke's (Cambs)", departments: ['ED', 'Resus', 'HASU', 'PPCI', 'CCU', 'Transplant', 'Other'] },
                    { name: "Peterborough City", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Hinchingbrooke", departments: ['LEH', 'ED', 'Resus', 'Other'] },
                    { name: "Norfolk & Norwich", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "James Paget (Gt Yarmouth)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Queen Elizabeth (Kings Lynn)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Ipswich", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "West Suffolk (Bury)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Ely (Princess of Wales)", departments: ['MIU', 'Other'] },
                    { name: "Doddington", departments: ['MIU', 'Other'] },
                    { name: "North Cambridgeshire (Wisbech)", departments: ['MIU', 'Other'] },
                    { name: "Cromer", departments: ['MIU', 'Other'] },
                    { name: "Beccles", departments: ['MIU', 'Other'] }
                ]
            },
            {
                name: 'Essex, Beds & Herts',
                hospitals: [
                    { name: "Basildon University", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Cardiothoracic', 'Other'] },
                    { name: "Southend", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Broomfield (Chelmsford)", departments: ['ED', 'Resus', 'Burns', 'Other'] },
                    { name: "Colchester", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Princess Alexandra (Harlow)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Luton & Dunstable", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Bedford", departments: ['LEH', 'ED', 'Resus', 'Other'] },
                    { name: "Lister (Stevenage)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Watford General", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "New QEII (Welwyn)", departments: ['UTC', 'Other'] },
                    { name: "St Albans City", departments: ['MIU', 'Other'] },
                    { name: "Hemel Hempstead", departments: ['UTC', 'Other'] },
                    { name: "Clacton", departments: ['UTC', 'Other'] },
                    { name: "Harwich", departments: ['MIU', 'Other'] },
                    { name: "Braintree", departments: ['MIU', 'Other'] },
                    { name: "Orsett", departments: ['MIU', 'Other'] }
                ]
            }
        ]
    },
    {
        name: 'West Midlands (WMAS)',
        regions: [
            {
                name: 'Birmingham & Black Country',
                hospitals: [
                    { name: "Queen Elizabeth (QE)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Neuro', 'Military', 'Other'] },
                    { name: "Birmingham Children's", departments: ['Paeds ED', 'PICU', 'Other'] },
                    { name: "Heartlands", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Other'] },
                    { name: "Good Hope (Sutton Coldfield)", departments: ['LEH', 'ED', 'Resus', 'Other'] },
                    { name: "City Hospital (Sandwell)", departments: ['LEH', 'ED', 'Resus', 'Eye Centre', 'Other'] },
                    { name: "Solihull", departments: ['MIU', 'MIU ', 'Other'] },
                    { name: "New Cross (Wolverhampton)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Russells Hall (Dudley)", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Walsall Manor", departments: ['LEH', 'ED', 'Resus', 'Other'] }
                ]
            },
            {
                name: 'Cov/Warks & Staffs',
                hospitals: [
                    { name: "University Hosp Coventry", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Warwick", departments: ['LEH', 'ED', 'Resus', 'Other'] },
                    { name: "George Eliot (Nuneaton)", departments: ['LEH', 'ED', 'Resus', 'Other'] },
                    { name: "St Cross (Rugby)", departments: ['UTC', 'Other'] },
                    { name: "Stratford-upon-Avon", departments: ['MIU', 'Other'] },
                    { name: "Royal Stoke", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Neuro', 'Other'] },
                    { name: "County (Stafford)", departments: ['LEH', 'ED', 'Resus', 'Other'] },
                    { name: "Queen's (Burton)", departments: ['LEH', 'ED', 'Resus', 'Other'] },
                    { name: "Cannock Chase", departments: ['MIU', 'Other'] },
                    { name: "Leek Moorlands", departments: ['MIU', 'Other'] }
                ]
            },
            {
                name: 'Shrops/Worcs',
                hospitals: [
                    { name: "Royal Shrewsbury", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Princess Royal (Telford)", departments: ['LEH', 'ED', 'Resus', 'Women & Children', 'Other'] },
                    { name: "Worcestershire Royal", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Alexandra (Redditch)", departments: ['LEH', 'ED', 'Resus', 'Other'] },
                    { name: "Hereford County", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Kidderminster", departments: ['UTC', 'Other'] },
                    { name: "Ludlow / Bridgnorth", departments: ['MIU', 'Other'] }
                ]
            }
        ]
    },
    {
        name: 'East Midlands (EMAS)',
        regions: [
            {
                name: 'Notts & Derby',
                hospitals: [
                    { name: "Queen's Medical Centre", departments: ['ED', 'Resus', 'Neuro', 'Other'] },
                    { name: "Nottingham City", departments: ['PPCI', 'CCU', 'Burns', 'Other'] },
                    { name: "King's Mill", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Newark", departments: ['UTC', 'Other'] },
                    { name: "Royal Derby", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Other'] },
                    { name: "Chesterfield Royal", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Ilkeston / Ripley", departments: ['MIU', 'Other'] }
                ]
            },
            {
                name: 'Leics/Northants & Lincs',
                hospitals: [
                    { name: "Leicester Royal Infirmary", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Kettering General", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Other'] },
                    { name: "Northampton General", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Corby", departments: ['UTC', 'Other'] },
                    { name: "Loughborough", departments: ['UTC', 'Other'] },
                    { name: "Lincoln County", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Pilgrim (Boston)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Grantham & District", departments: ['UTC', 'Other'] },
                    { name: "Louth", departments: ['UTC', 'Other'] },
                    { name: "Skegness", departments: ['UTC', 'Other'] }
                ]
            }
        ]
    },
    {
        name: 'North West (NWAS)',
        regions: [
            {
                name: 'Manchester',
                hospitals: [
                    { name: "Manchester Royal (MRI)", departments: ['ED', 'Resus', 'Renal', 'Other'] },
                    { name: "Salford Royal", departments: ['ED', 'Resus', 'HASU', 'Neuro', 'Other'] },
                    { name: "Wythenshawe", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Transplant', 'Burns', 'Other'] },
                    { name: "Royal Manchester Children's", departments: ['Paeds ED', 'PICU', 'Other'] },
                    { name: "Royal Oldham", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Fairfield (Bury)", departments: ['HASU', 'Other'] },
                    { name: "Rochdale Infirmary", departments: ['UTC', 'Other'] },
                    { name: "Trafford General", departments: ['UTC', 'Other'] },
                    { name: "Stepping Hill", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Royal Bolton", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Wigan Infirmary", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Leigh Infirmary", departments: ['UTC', 'Other'] }
                ]
            },
            {
                name: 'Merseyside',
                hospitals: [
                    { name: "Aintree", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Royal Liverpool", departments: ['ED', 'Resus', 'Vascular', 'Other'] },
                    { name: "Arrowe Park (Wirral)", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Whiston", departments: ['ED', 'Resus', 'Burns', 'Other'] },
                    { name: "Southport & Formby", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Ormskirk", departments: ['Paeds ED', 'Other'] },
                    { name: "St Helens", departments: ['UTC', 'Other'] }
                ]
            },
            {
                name: 'Lancs/Cumbria',
                hospitals: [
                    { name: "Royal Preston", departments: ['ED', 'Resus', 'Neuro', 'PPCI', 'CCU', 'Other'] },
                    { name: "Royal Blackburn", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Blackpool Victoria", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Royal Lancaster", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Burnley General", departments: ['UTC', 'Other'] },
                    { name: "Chorley & South Ribble", departments: ['UTC', 'Other'] },
                    { name: "Accrington Victoria", departments: ['MIU', 'Other'] },
                    { name: "Cumberland Infirmary (Carlisle)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "West Cumberland (Whitehaven)", departments: ['LEH', 'ED', 'Resus', 'Other'] },
                    { name: "Penrith", departments: ['MIU', 'Other'] }
                ]
            }
        ]
    },
    {
        name: 'North East & Yorkshire (NEAS / YAS)',
        regions: [
            {
                name: 'NEAS',
                hospitals: [
                    { name: "RVI (Newcastle)", departments: ['ED', 'Resus', 'Neuro', 'Burns', 'Paeds ED', 'Other'] },
                    { name: "James Cook (Middlesbrough)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Neuro', 'Other'] },
                    { name: "NSECH (Cramlington)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Emergency Care', 'Other'] },
                    { name: "Sunderland Royal", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Other'] },
                    { name: "Queen Elizabeth (Gateshead)", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "University Hosp N. Durham", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Darlington Memorial", departments: ['ED', 'Resus', 'Other'] },
                    { name: "North Tyneside (Rake Lane)", departments: ['UTC', 'Other'] },
                    { name: "Wansbeck", departments: ['UTC', 'Other'] },
                    { name: "Hartlepool", departments: ['UTC', 'Other'] },
                    { name: "Bishop Auckland", departments: ['UTC', 'Other'] },
                    { name: "Peterlee", departments: ['UTC', 'Other'] }
                ]
            },
            {
                name: 'YAS',
                hospitals: [
                    { name: "Leeds General (LGI)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'HASU', 'Neuro', 'Other'] },
                    { name: "St James (Leeds)", departments: ['Walk-in', 'Oncology', 'Renal', 'Other'] },
                    { name: "Northern General (Sheffield)", departments: ['ED', 'Resus', 'PPCI', 'CCU', 'Other'] },
                    { name: "Sheffield Children's", departments: ['Paeds ED', 'Other'] },
                    { name: "Hull Royal Infirmary", departments: ['ED', 'Resus', 'Neuro', 'Other'] },
                    { name: "Bradford Royal", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Pinderfields (Wakefield)", departments: ['ED', 'Resus', 'Burns', 'Other'] },
                    { name: "Calderdale Royal (Halifax)", departments: ['LEH', 'ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Huddersfield Royal", departments: ['LEH', 'ED', 'Resus', 'Other'] },
                    { name: "York Hospital", departments: ['ED', 'Resus', 'HASU', 'Other'] },
                    { name: "Harrogate District", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Scarborough", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Rotherham", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Barnsley", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Doncaster Royal", departments: ['ED', 'Resus', 'Other'] },
                    { name: "Bassetlaw (Worksop)", departments: ['LEH', 'ED', 'Resus', 'Other'] },
                    { name: "Dewsbury", departments: ['ED/UTC', 'Other'] },
                    { name: "Pontefract", departments: ['UTC', 'Other'] },
                    { name: "Goole", departments: ['MIU', 'Other'] },
                    { name: "Wharfedale", departments: ['MIU', 'Other'] },
                    { name: "Beverley", departments: ['UTC', 'Other'] }
                ]
            }
        ]
    },
    {
        name: 'Specialist & Mental Health',
        regions: [
            {
                name: 'Mental Health - Secure',
                hospitals: [
                    { name: "Broadmoor (Crowthorne)", departments: ['High Secure', 'Other'] },
                    { name: "Rampton (Notts)", departments: ['High Secure', 'Other'] },
                    { name: "Ashworth (Merseyside)", departments: ['High Secure', 'Other'] },
                    { name: "The Maudsley (London)", departments: ['National Specialist (SLaM)', 'Other'] },
                    { name: "The Spinney (Manchester)", departments: ['Medium Secure', 'Other'] },
                    { name: "Arnold Lodge (Leicester)", departments: ['Medium Secure', 'Other'] },
                    { name: "Trevor Gibbens Unit (Maidstone)", departments: ['Medium Secure', 'Other'] },
                    { name: "Ravenswood House (Fareham)", departments: ['Medium Secure', 'Other'] },
                    { name: "Bluebird House (Southampton)", departments: ['Adolescent Secure', 'Other'] }
                ]
            },
            {
                name: 'Orthopaedic Specialist',
                hospitals: [
                    { name: "RNOH (Stanmore)", departments: ['Spinal/Tumours', 'Other'] },
                    { name: "ROH (Birmingham)", departments: ['Specialist Ortho', 'Other'] },
                    { name: "NOC (Oxford)", departments: ['Infection/Revision', 'Other'] },
                    { name: "RJAH (Oswestry)", departments: ['Spinal/Disorders', 'Other'] },
                    { name: "Wrightington Hospital (Lancs)", departments: ['Specialist Ortho', 'Other'] }
                ]
            }
        ]
    }
];
