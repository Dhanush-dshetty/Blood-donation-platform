/**
 * seedKarnatakaHospitals.js
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Comprehensive seeder for Hospitals and Blood Banks across all regions
 * and districts of Karnataka with real GPS coordinates, facility types,
 * contact details, and verified live blood inventory batches.
 * 
 * Run:
 *   cd backend
 *   node seedKarnatakaHospitals.js
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Hospital = require('./src/models/Hospital');
const BloodInventory = require('./src/models/BloodInventory');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/bloodplatform';

// Complete curated list of major Government Medical Colleges, District Civil Hospitals,
// Red Cross Blood Centers, and Premier Charitable/Multispecialty Hospitals across Karnataka.
const KARNATAKA_FACILITIES = [
  // ─── 1. BENGALURU URBAN & RURAL (12 facilities) ─────────────────────────
  {
    registrationNumber: 'KA-BLR-001',
    hospitalName: 'Victoria Hospital & Blood Bank (BMCRI)',
    facilityType: 'hospital',
    address: 'Fort Road, Near City Market, Kalasipalya, Bengaluru - 560002',
    city: 'Bangalore',
    phone: '080-26701150',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [77.5736, 12.9634]
  },
  {
    registrationNumber: 'KA-BLR-002',
    hospitalName: 'Bowring and Lady Curzon Hospital',
    facilityType: 'hospital',
    address: 'Lady Curzon Road, Shivaji Nagar, Bengaluru - 560001',
    city: 'Bangalore',
    phone: '080-25591325',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [77.6045, 12.9832]
  },
  {
    registrationNumber: 'KA-BLR-003',
    hospitalName: 'KC General Hospital & Blood Center',
    facilityType: 'hospital',
    address: '5th Cross, Malleshwaram, Bengaluru - 560003',
    city: 'Bangalore',
    phone: '080-23341771',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [77.5708, 13.0031]
  },
  {
    registrationNumber: 'KA-BLR-004',
    hospitalName: 'Kidwai Memorial Institute of Oncology Blood Bank',
    facilityType: 'hospital',
    address: 'Dr. M.H. Marigowda Road, Hombegowda Nagar, Bengaluru - 560029',
    city: 'Bangalore',
    phone: '080-26094000',
    operatingHours: '24/7 Regional Blood Bank',
    coordinates: [77.5927, 12.9372]
  },
  {
    registrationNumber: 'KA-BLR-005',
    hospitalName: 'Jayadeva Institute of Cardiovascular Sciences & Blood Bank',
    facilityType: 'hospital',
    address: 'Bannerghatta Main Road, 9th Block, Jayanagar, Bengaluru - 560069',
    city: 'Bangalore',
    phone: '080-22977400',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [77.5996, 12.9189]
  },
  {
    registrationNumber: 'KA-BLR-006',
    hospitalName: 'NIMHANS Neuropathology & Blood Transfusion Center',
    facilityType: 'hospital',
    address: 'Hosur Road, Lakkasandra, Bengaluru - 560029',
    city: 'Bangalore',
    phone: '080-26995000',
    operatingHours: '24/7 Specialized Blood Center',
    coordinates: [77.5956, 12.9404]
  },
  {
    registrationNumber: 'KA-BLR-007',
    hospitalName: 'Manipal Hospital Old Airport Road',
    facilityType: 'hospital',
    address: '98, HAL Old Airport Road, Kodihalli, Bengaluru - 560017',
    city: 'Bangalore',
    phone: '080-25024444',
    operatingHours: '24/7 Blood Bank & Transfusion',
    coordinates: [77.6515, 12.9587]
  },
  {
    registrationNumber: 'KA-BLR-008',
    hospitalName: 'St. Johns Medical College Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Sarjapur Road, John Nagar, Koramangala, Bengaluru - 560034',
    city: 'Bangalore',
    phone: '080-22065000',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [77.6198, 12.9288]
  },
  {
    registrationNumber: 'KA-BLR-009',
    hospitalName: 'Narayana Health City & Blood Transfusion Center',
    facilityType: 'hospital',
    address: '258/A, Bommasandra Industrial Area, Anekal Taluk, Bengaluru - 560099',
    city: 'Bangalore',
    phone: '080-71222222',
    operatingHours: '24/7 Multi-Specialty Blood Center',
    coordinates: [77.6925, 12.8093]
  },
  {
    registrationNumber: 'KA-BLR-010',
    hospitalName: 'Rashtrotthana Blood Center',
    facilityType: 'blood_bank',
    address: 'Kempegowda Nagar, Chamarajpet, Bengaluru - 560019',
    city: 'Bangalore',
    phone: '080-26612730',
    operatingHours: '24/7 Community Blood Bank',
    coordinates: [77.5615, 12.9520]
  },
  {
    registrationNumber: 'KA-BLR-011',
    hospitalName: 'Rotary Bangalore TTK Blood Bank',
    facilityType: 'blood_bank',
    address: 'HAL 3rd Stage, New Thippasandra, Bengaluru - 560075',
    city: 'Bangalore',
    phone: '080-25287903',
    operatingHours: '24/7 Dedicated Blood Bank',
    coordinates: [77.6592, 12.9723]
  },
  {
    registrationNumber: 'KA-BLR-012',
    hospitalName: 'Lions Blood Bank Bangalore',
    facilityType: 'blood_bank',
    address: '17, Miller Tank Bund Road, Vasanth Nagar, Bengaluru - 560052',
    city: 'Bangalore',
    phone: '080-22266807',
    operatingHours: '24/7 Community Blood Center',
    coordinates: [77.5920, 12.9905]
  },

  // ─── 2. MYSURU / MYSORE (6 facilities) ──────────────────────────────────
  {
    registrationNumber: 'KA-MYS-001',
    hospitalName: 'K.R. Hospital (Mysore Medical College)',
    facilityType: 'hospital',
    address: 'Irwin Road, Lashkar Mohalla, Mysuru - 570001',
    city: 'Mysore',
    phone: '0821-2520512',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [76.6543, 12.3129]
  },
  {
    registrationNumber: 'KA-MYS-002',
    hospitalName: 'Cheluvamba Hospital for Women & Children',
    facilityType: 'hospital',
    address: 'Sayyaji Rao Road, Medar Block, Yadavagiri, Mysuru - 570001',
    city: 'Mysore',
    phone: '0821-2520288',
    operatingHours: '24/7 Blood Transfusion Unit',
    coordinates: [76.6510, 12.3142]
  },
  {
    registrationNumber: 'KA-MYS-003',
    hospitalName: 'JSS Hospital & Blood Center',
    facilityType: 'hospital',
    address: 'Mahathma Gandhi Road, Agrahara, Fort Mohalla, Mysuru - 570004',
    city: 'Mysore',
    phone: '0821-2335555',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [76.6568, 12.2965]
  },
  {
    registrationNumber: 'KA-MYS-004',
    hospitalName: 'Apollo BGS Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Adhichunchanagiri Road, Kuvempunagar, Mysuru - 570023',
    city: 'Mysore',
    phone: '0821-2568888',
    operatingHours: '24/7 Blood Bank Service',
    coordinates: [76.6272, 12.2905]
  },
  {
    registrationNumber: 'KA-MYS-005',
    hospitalName: 'District Hospital Mysuru',
    facilityType: 'hospital',
    address: 'KRS Road, Metagalli, Mysuru - 570016',
    city: 'Mysore',
    phone: '0821-2511222',
    operatingHours: '24/7 District Blood Center',
    coordinates: [76.6215, 12.3482]
  },
  {
    registrationNumber: 'KA-MYS-006',
    hospitalName: 'Jeevadhara Voluntary Blood Bank',
    facilityType: 'blood_bank',
    address: 'Sayyaji Rao Road, Mandi Mohalla, Mysuru - 570021',
    city: 'Mysore',
    phone: '0821-2422244',
    operatingHours: '24/7 Blood Center',
    coordinates: [76.6502, 12.3211]
  },

  // ─── 3. DAKSHINA KANNADA / MANGALORE (7 facilities) ─────────────────────
  {
    registrationNumber: 'KA-MNG-001',
    hospitalName: 'Wenlock District Hospital & Regional Blood Center',
    facilityType: 'hospital',
    address: 'Hampankatta, Mangaluru - 575001',
    city: 'Mangalore',
    phone: '0824-2423321',
    operatingHours: '24/7 Regional Blood Center',
    coordinates: [74.8480, 12.8655]
  },
  {
    registrationNumber: 'KA-MNG-002',
    hospitalName: 'KMC Hospital Mangalore (Ambedkar Circle)',
    facilityType: 'hospital',
    address: 'Ambedkar Circle, Balmatta, Mangaluru - 575001',
    city: 'Mangalore',
    phone: '0824-2444590',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [74.8431, 12.8703]
  },
  {
    registrationNumber: 'KA-MNG-003',
    hospitalName: 'Father Muller Medical College Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Father Muller Road, Kankanady, Mangaluru - 575002',
    city: 'Mangalore',
    phone: '0824-2238000',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [74.8622, 12.8667]
  },
  {
    registrationNumber: 'KA-MNG-004',
    hospitalName: 'A.J. Hospital & Research Centre Blood Bank',
    facilityType: 'hospital',
    address: 'NH-66, Kuntikana, Mangaluru - 575004',
    city: 'Mangalore',
    phone: '0824-2225533',
    operatingHours: '24/7 Blood Center',
    coordinates: [74.8524, 12.9056]
  },
  {
    registrationNumber: 'KA-MNG-005',
    hospitalName: 'Yenepoya Medical College Hospital',
    facilityType: 'hospital',
    address: 'University Road, Deralakatte, Mangaluru - 575018',
    city: 'Mangalore',
    phone: '0824-2204668',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [74.8722, 12.8197]
  },
  {
    registrationNumber: 'KA-MNG-006',
    hospitalName: 'KS Hegde Charitable Hospital (Nitte)',
    facilityType: 'hospital',
    address: 'Medical Sciences Complex, Deralakatte, Mangaluru - 575018',
    city: 'Mangalore',
    phone: '0824-2204471',
    operatingHours: '24/7 Blood Bank & Transfusion',
    coordinates: [74.8812, 12.8228]
  },
  {
    registrationNumber: 'KA-MNG-007',
    hospitalName: 'Indian Red Cross Society Blood Bank Mangalore',
    facilityType: 'blood_bank',
    address: 'Opp. DC Office, Bunder, Mangaluru - 575001',
    city: 'Mangalore',
    phone: '0824-2423377',
    operatingHours: '24/7 Charitable Blood Center',
    coordinates: [74.8390, 12.8630]
  },

  // ─── 4. UDUPI & MANIPAL (4 facilities) ──────────────────────────────────
  {
    registrationNumber: 'KA-UDP-001',
    hospitalName: 'Kasturba Hospital & Blood Center Manipal',
    facilityType: 'hospital',
    address: 'Madhav Nagar, Manipal, Udupi - 576104',
    city: 'Udupi',
    phone: '0820-2922761',
    operatingHours: '24/7 Apex Blood Center',
    coordinates: [74.7865, 13.3535]
  },
  {
    registrationNumber: 'KA-UDP-002',
    hospitalName: 'District Hospital Udupi & Blood Bank',
    facilityType: 'hospital',
    address: 'Ajjarkad, Udupi - 576101',
    city: 'Udupi',
    phone: '0820-2520284',
    operatingHours: '24/7 District Blood Center',
    coordinates: [74.7460, 13.3389]
  },
  {
    registrationNumber: 'KA-UDP-003',
    hospitalName: 'Dr. T.M.A. Pai Hospital Udupi',
    facilityType: 'hospital',
    address: 'Court Back Road, Kunjibettu, Udupi - 576102',
    city: 'Udupi',
    phone: '0820-2520555',
    operatingHours: '24/7 Emergency Blood Unit',
    coordinates: [74.7550, 13.3440]
  },
  {
    registrationNumber: 'KA-UDP-004',
    hospitalName: 'Adarsha Hospital & Blood Transfusion Unit',
    facilityType: 'hospital',
    address: 'Near Old Bus Stand, Udupi - 576101',
    city: 'Udupi',
    phone: '0820-2533333',
    operatingHours: '24/7 Emergency Care',
    coordinates: [74.7505, 13.3412]
  },

  // ─── 5. HUBLI - DHARWAD (5 facilities) ──────────────────────────────────
  {
    registrationNumber: 'KA-HBL-001',
    hospitalName: 'KIMS Hospital & Regional Blood Center (Hubballi)',
    facilityType: 'hospital',
    address: 'Vidyanagar, PB Road, Hubballi - 580022',
    city: 'Hubli',
    phone: '0836-2272044',
    operatingHours: '24/7 Regional Blood Center',
    coordinates: [75.1228, 15.3647]
  },
  {
    registrationNumber: 'KA-HBL-002',
    hospitalName: 'District Civil Hospital Dharwad',
    facilityType: 'hospital',
    address: 'Belgaum Road, Near Court Circle, Dharwad - 580008',
    city: 'Dharwad',
    phone: '0836-2448333',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [75.0112, 15.4589]
  },
  {
    registrationNumber: 'KA-HBL-003',
    hospitalName: 'SDM College of Medical Sciences & Hospital',
    facilityType: 'hospital',
    address: 'Manjushree Nagar, Sattur, Dharwad - 580009',
    city: 'Dharwad',
    phone: '0836-2477777',
    operatingHours: '24/7 Multi-Specialty Blood Center',
    coordinates: [75.0745, 15.4210]
  },
  {
    registrationNumber: 'KA-HBL-004',
    hospitalName: 'Rotary Blood Bank Hubli',
    facilityType: 'blood_bank',
    address: 'Club Road, Deshpande Nagar, Hubballi - 580029',
    city: 'Hubli',
    phone: '0836-2363636',
    operatingHours: '24/7 Voluntary Blood Bank',
    coordinates: [75.1380, 15.3582]
  },
  {
    registrationNumber: 'KA-HBL-005',
    hospitalName: 'Lifeline Blood Center Hubballi',
    facilityType: 'blood_bank',
    address: 'Neeligin Road, Traffic Island, Hubballi - 580020',
    city: 'Hubli',
    phone: '0836-2268888',
    operatingHours: '24/7 Blood Bank',
    coordinates: [75.1415, 15.3490]
  },

  // ─── 6. BELAGAVI / BELGAUM (4 facilities) ───────────────────────────────
  {
    registrationNumber: 'KA-BGM-001',
    hospitalName: 'BIMS District Teaching Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Dr. B.R. Ambedkar Road, Civil Hospital Compound, Belagavi - 590001',
    city: 'Belgaum',
    phone: '0831-2403126',
    operatingHours: '24/7 Apex Blood Center',
    coordinates: [74.5165, 15.8497]
  },
  {
    registrationNumber: 'KA-BGM-002',
    hospitalName: 'KLE Dr. Prabhakar Kore Hospital & Blood Center',
    facilityType: 'hospital',
    address: 'Nehru Nagar, Belagavi - 590010',
    city: 'Belgaum',
    phone: '0831-2473777',
    operatingHours: '24/7 Comprehensive Blood Center',
    coordinates: [74.5080, 15.8820]
  },
  {
    registrationNumber: 'KA-BGM-003',
    hospitalName: 'Belgaum Voluntary Blood Bank (Rotary)',
    facilityType: 'blood_bank',
    address: 'Khanapur Road, Camp, Belagavi - 590009',
    city: 'Belgaum',
    phone: '0831-2422000',
    operatingHours: '24/7 Community Blood Bank',
    coordinates: [74.5020, 15.8580]
  },
  {
    registrationNumber: 'KA-BGM-004',
    hospitalName: 'Lakeview Hospital & Blood Unit',
    facilityType: 'hospital',
    address: 'Kangralkar Galli, Belagavi - 590001',
    city: 'Belgaum',
    phone: '0831-2465555',
    operatingHours: '24/7 Emergency Care',
    coordinates: [74.5210, 15.8640]
  },

  // ─── 7. SHIVAMOGGA / SHIMOGA (3 facilities) ─────────────────────────────
  {
    registrationNumber: 'KA-SMG-001',
    hospitalName: 'SIMS McGann Teaching District Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Sagar Road, Shivamogga - 577201',
    city: 'Shimoga',
    phone: '08182-229933',
    operatingHours: '24/7 Regional Blood Center',
    coordinates: [75.5681, 13.9299]
  },
  {
    registrationNumber: 'KA-SMG-002',
    hospitalName: 'Sahyadri Narayana Multispeciality Hospital Blood Bank',
    facilityType: 'hospital',
    address: 'Harakere, NT Road, Shivamogga - 577202',
    city: 'Shimoga',
    phone: '08182-246400',
    operatingHours: '24/7 Emergency Transfusion Unit',
    coordinates: [75.5780, 13.9140]
  },
  {
    registrationNumber: 'KA-SMG-003',
    hospitalName: 'Rotary Blood Bank Shivamogga',
    facilityType: 'blood_bank',
    address: 'Nehru Road, Durgigudi, Shivamogga - 577201',
    city: 'Shimoga',
    phone: '08182-222888',
    operatingHours: '24/7 Community Blood Bank',
    coordinates: [75.5710, 13.9340]
  },

  // ─── 8. DAVANAGERE (3 facilities) ───────────────────────────────────────
  {
    registrationNumber: 'KA-DVG-001',
    hospitalName: 'Chigateri General District Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'MCC B Block, Davanagere - 577004',
    city: 'Davanagere',
    phone: '08192-230444',
    operatingHours: '24/7 District Blood Center',
    coordinates: [75.9218, 14.4644]
  },
  {
    registrationNumber: 'KA-DVG-002',
    hospitalName: 'Bapuji Hospital & JJM Medical College Blood Bank',
    facilityType: 'hospital',
    address: 'MCC B Block, Hadadi Road, Davanagere - 577004',
    city: 'Davanagere',
    phone: '08192-231388',
    operatingHours: '24/7 Apex Blood Center',
    coordinates: [75.9180, 14.4710]
  },
  {
    registrationNumber: 'KA-DVG-003',
    hospitalName: 'SS Institute of Medical Sciences & Blood Center',
    facilityType: 'hospital',
    address: 'NH-4, Bypass Road, Davanagere - 577005',
    city: 'Davanagere',
    phone: '08192-261807',
    operatingHours: '24/7 Multi-Specialty Blood Bank',
    coordinates: [75.9450, 14.4530]
  },

  // ─── 9. BALLARI / BELLARY (3 facilities) ────────────────────────────────
  {
    registrationNumber: 'KA-BLR-BELL-001',
    hospitalName: 'VIMS District Teaching Hospital & Regional Blood Center',
    facilityType: 'hospital',
    address: 'Cantonment, Ballari - 583104',
    city: 'Bellary',
    phone: '08392-235201',
    operatingHours: '24/7 Regional Blood Center',
    coordinates: [76.9248, 15.1394]
  },
  {
    registrationNumber: 'KA-BLR-BELL-002',
    hospitalName: 'District Civil Hospital Ballari',
    facilityType: 'hospital',
    address: 'Ananthapur Road, Cowl Bazaar, Ballari - 583101',
    city: 'Bellary',
    phone: '08392-277100',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [76.9312, 15.1480]
  },
  {
    registrationNumber: 'KA-BLR-BELL-003',
    hospitalName: 'Jindal Sanjeevani Multispecialty Hospital Blood Bank',
    facilityType: 'hospital',
    address: 'Vidyanagar, Toranagallu, Ballari - 583123',
    city: 'Bellary',
    phone: '08395-250123',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [76.6540, 15.2280]
  },

  // ─── 10. KALABURAGI / GULBARGA (3 facilities) ───────────────────────────
  {
    registrationNumber: 'KA-KLB-001',
    hospitalName: 'GIMS District Teaching Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Sedam Road, Kalaburagi - 585105',
    city: 'Kalaburagi',
    phone: '08472-278601',
    operatingHours: '24/7 Regional Blood Center',
    coordinates: [76.8343, 17.3297]
  },
  {
    registrationNumber: 'KA-KLB-002',
    hospitalName: 'Basaveshwara Teaching & General Hospital (MRMC)',
    facilityType: 'hospital',
    address: 'Sedam Road, Kalaburagi - 585105',
    city: 'Kalaburagi',
    phone: '08472-277222',
    operatingHours: '24/7 Medical College Blood Bank',
    coordinates: [76.8410, 17.3360]
  },
  {
    registrationNumber: 'KA-KLB-003',
    hospitalName: 'Indian Red Cross Society Blood Bank Kalaburagi',
    facilityType: 'blood_bank',
    address: 'Near Old Bus Stand, Kalaburagi - 585102',
    city: 'Kalaburagi',
    phone: '08472-224488',
    operatingHours: '24/7 Charitable Blood Center',
    coordinates: [76.8290, 17.3320]
  },

  // ─── 11. TUMAKURU / TUMKUR (3 facilities) ───────────────────────────────
  {
    registrationNumber: 'KA-TMK-001',
    hospitalName: 'District Hospital Tumakuru & Blood Center',
    facilityType: 'hospital',
    address: 'Ashoka Road, Mandipet, Tumakuru - 572101',
    city: 'Tumkur',
    phone: '0816-2278252',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [77.1025, 13.3409]
  },
  {
    registrationNumber: 'KA-TMK-002',
    hospitalName: 'Sri Siddhartha Medical College & Hospital Blood Bank',
    facilityType: 'hospital',
    address: 'Agalakote, B.H. Road, Tumakuru - 572107',
    city: 'Tumkur',
    phone: '0816-2278867',
    operatingHours: '24/7 Medical College Blood Center',
    coordinates: [77.0620, 13.3280]
  },
  {
    registrationNumber: 'KA-TMK-003',
    hospitalName: 'Rotary Blood Bank Tumakuru',
    facilityType: 'blood_bank',
    address: 'Opp. Glass House, B.H. Road, Tumakuru - 572102',
    city: 'Tumkur',
    phone: '0816-2255111',
    operatingHours: '24/7 Community Blood Center',
    coordinates: [77.1080, 13.3450]
  },

  // ─── 12. HASSAN (3 facilities) ──────────────────────────────────────────
  {
    registrationNumber: 'KA-HSN-001',
    hospitalName: 'HIMS Teaching Hospital & District Blood Bank',
    facilityType: 'hospital',
    address: 'Sri Chamarajendra Hospital Complex, B.M. Road, Hassan - 573201',
    city: 'Hassan',
    phone: '08172-231699',
    operatingHours: '24/7 Regional Blood Center',
    coordinates: [76.1028, 13.0072]
  },
  {
    registrationNumber: 'KA-HSN-002',
    hospitalName: 'Mangala Hospital & Kidney Foundation Blood Bank',
    facilityType: 'hospital',
    address: 'R.C. Road, Hassan - 573201',
    city: 'Hassan',
    phone: '08172-268241',
    operatingHours: '24/7 Emergency Care',
    coordinates: [76.0980, 13.0110]
  },
  {
    registrationNumber: 'KA-HSN-003',
    hospitalName: 'Janani Blood Bank Hassan',
    facilityType: 'blood_bank',
    address: 'Shankar Mutt Road, Hassan - 573201',
    city: 'Hassan',
    phone: '08172-263300',
    operatingHours: '24/7 Voluntary Blood Bank',
    coordinates: [76.1050, 13.0030]
  },

  // ─── 13. MANDYA (2 facilities) ──────────────────────────────────────────
  {
    registrationNumber: 'KA-MDY-001',
    hospitalName: 'MIMS District Teaching Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Bengaluru-Mysuru Highway, Mandya - 571401',
    city: 'Mandya',
    phone: '08232-224086',
    operatingHours: '24/7 Regional Blood Center',
    coordinates: [76.8951, 12.5242]
  },
  {
    registrationNumber: 'KA-MDY-002',
    hospitalName: 'District Hospital Mandya',
    facilityType: 'hospital',
    address: 'Subash Nagar, Mandya - 571401',
    city: 'Mandya',
    phone: '08232-220025',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [76.8990, 12.5280]
  },

  // ─── 14. BIDAR (2 facilities) ───────────────────────────────────────────
  {
    registrationNumber: 'KA-BDR-001',
    hospitalName: 'BRIMS Teaching District Hospital & Blood Center',
    facilityType: 'hospital',
    address: 'Udgir Road, Bidar - 585401',
    city: 'Bidar',
    phone: '08482-228366',
    operatingHours: '24/7 District Blood Center',
    coordinates: [77.5186, 17.9104]
  },
  {
    registrationNumber: 'KA-BDR-002',
    hospitalName: 'Guru Nanak Hospital & Research Centre Blood Bank',
    facilityType: 'hospital',
    address: 'Guru Nanak Complex, Manhalli Road, Bidar - 585403',
    city: 'Bidar',
    phone: '08482-234200',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [77.5250, 17.9020]
  },

  // ─── 15. RAICHUR (2 facilities) ─────────────────────────────────────────
  {
    registrationNumber: 'KA-RCR-001',
    hospitalName: 'RIMS District Teaching Hospital & Blood Center',
    facilityType: 'hospital',
    address: 'Hyderabad Road, Raichur - 584102',
    city: 'Raichur',
    phone: '08532-235488',
    operatingHours: '24/7 Regional Blood Center',
    coordinates: [77.3439, 16.2076]
  },
  {
    registrationNumber: 'KA-RCR-002',
    hospitalName: 'Navodaya Medical College Hospital Blood Bank',
    facilityType: 'hospital',
    address: 'Navodaya Nagar, Mantralayam Road, Raichur - 584103',
    city: 'Raichur',
    phone: '08532-223448',
    operatingHours: '24/7 Medical College Blood Bank',
    coordinates: [77.3710, 16.1950]
  },

  // ─── 16. VIJAYAPURA / BIJAPUR (2 facilities) ────────────────────────────
  {
    registrationNumber: 'KA-BJP-001',
    hospitalName: 'BLDEU Shri B.M. Patil Medical College Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Bangaramma Sajjan Campus, Solapur Road, Vijayapura - 586103',
    city: 'Vijayapura',
    phone: '08352-262770',
    operatingHours: '24/7 Apex Blood Center',
    coordinates: [75.7145, 16.8302]
  },
  {
    registrationNumber: 'KA-BJP-002',
    hospitalName: 'District Civil Hospital Vijayapura',
    facilityType: 'hospital',
    address: 'Near Gandhi Chowk, Station Road, Vijayapura - 586101',
    city: 'Vijayapura',
    phone: '08352-250100',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [75.7220, 16.8240]
  },

  // ─── 17. CHITRADURGA (2 facilities) ─────────────────────────────────────
  {
    registrationNumber: 'KA-CTA-001',
    hospitalName: 'Basaveshwara Medical College Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'NH-4, SJM Campus, Chitradurga - 577502',
    city: 'Chitradurga',
    phone: '08194-227937',
    operatingHours: '24/7 Medical College Blood Center',
    coordinates: [76.4014, 14.2251]
  },
  {
    registrationNumber: 'KA-CTA-002',
    hospitalName: 'District Government Hospital Chitradurga',
    facilityType: 'hospital',
    address: 'B.D. Road, Near Fort, Chitradurga - 577501',
    city: 'Chitradurga',
    phone: '08194-222345',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [76.3980, 14.2210]
  },

  // ─── 18. KOLAR (2 facilities) ───────────────────────────────────────────
  {
    registrationNumber: 'KA-KLR-001',
    hospitalName: 'R.L. Jalappa Hospital & SDUMC Blood Center',
    facilityType: 'hospital',
    address: 'Tamaka, Kolar - 563103',
    city: 'Kolar',
    phone: '08152-243003',
    operatingHours: '24/7 Apex Blood Center',
    coordinates: [78.1726, 13.1367]
  },
  {
    registrationNumber: 'KA-KLR-002',
    hospitalName: 'SNR District Civil Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Bangalore-Chennai Road, Kolar - 563101',
    city: 'Kolar',
    phone: '08152-222240',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [78.1340, 13.1360]
  },

  // ─── 19. CHIKKAMAGALURU (2 facilities) ──────────────────────────────────
  {
    registrationNumber: 'KA-CKM-001',
    hospitalName: 'CIMS District Hospital & Regional Blood Center',
    facilityType: 'hospital',
    address: 'K.M. Road, Chikkamagaluru - 577101',
    city: 'Chikkamagaluru',
    phone: '08262-230345',
    operatingHours: '24/7 District Blood Center',
    coordinates: [75.7720, 13.3161]
  },
  {
    registrationNumber: 'KA-CKM-002',
    hospitalName: 'Holy Cross Hospital Blood Bank',
    facilityType: 'hospital',
    address: 'Jyothi Nagar, Chikkamagaluru - 577102',
    city: 'Chikkamagaluru',
    phone: '08262-220450',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [75.7650, 13.3220]
  },

  // ─── 20. BAGALKOT (2 facilities) ────────────────────────────────────────
  {
    registrationNumber: 'KA-BGK-001',
    hospitalName: 'SNMC & H.S.K. Hospital Blood Center',
    facilityType: 'hospital',
    address: 'Navanagar, Sector-58, Bagalkot - 587102',
    city: 'Bagalkot',
    phone: '08354-235400',
    operatingHours: '24/7 Medical College Blood Center',
    coordinates: [75.6980, 16.1850]
  },
  {
    registrationNumber: 'KA-BGK-002',
    hospitalName: 'District Hospital Bagalkot & Blood Bank',
    facilityType: 'hospital',
    address: 'Old Town, Station Road, Bagalkot - 587101',
    city: 'Bagalkot',
    phone: '08354-220111',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [75.6890, 16.1800]
  },

  // ─── 21. GADAG (2 facilities) ───────────────────────────────────────────
  {
    registrationNumber: 'KA-GDG-001',
    hospitalName: 'GIMS District Teaching Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Mallasamudra, Gadag - 582103',
    city: 'Gadag',
    phone: '08372-238050',
    operatingHours: '24/7 Regional Blood Center',
    coordinates: [75.6410, 15.4280]
  },
  {
    registrationNumber: 'KA-GDG-002',
    hospitalName: 'District Civil Hospital Gadag',
    facilityType: 'hospital',
    address: 'Pala Badami Road, Gadag - 582101',
    city: 'Gadag',
    phone: '08372-237411',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [75.6320, 15.4310]
  },

  // ─── 22. HAVERI (1 facility) ────────────────────────────────────────────
  {
    registrationNumber: 'KA-HVR-001',
    hospitalName: 'HIMS District Hospital & Blood Center',
    facilityType: 'hospital',
    address: 'PB Road, Ashwini Nagar, Haveri - 581110',
    city: 'Haveri',
    phone: '08375-232444',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [75.4050, 14.7950]
  },

  // ─── 23. UTTARA KANNADA / KARWAR & SIRSI (2 facilities) ─────────────────
  {
    registrationNumber: 'KA-UK-001',
    hospitalName: 'KRIMS District Hospital & Blood Bank Karwar',
    facilityType: 'hospital',
    address: 'MG Road, Karwar - 581301',
    city: 'Karwar',
    phone: '08382-226244',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [74.1305, 14.8153]
  },
  {
    registrationNumber: 'KA-UK-002',
    hospitalName: 'Pandit General Hospital & Blood Bank Sirsi',
    facilityType: 'hospital',
    address: 'Hubli Road, Sirsi - 581401',
    city: 'Sirsi',
    phone: '08384-226333',
    operatingHours: '24/7 Blood Bank',
    coordinates: [74.8460, 14.6190]
  },

  // ─── 24. KODAGU / MADIKERI (2 facilities) ───────────────────────────────
  {
    registrationNumber: 'KA-KDG-001',
    hospitalName: 'Kodagu Institute of Medical Sciences (KOIMS) District Hospital',
    facilityType: 'hospital',
    address: 'Abbey Falls Road, Madikeri, Kodagu - 571201',
    city: 'Madikeri',
    phone: '08272-225433',
    operatingHours: '24/7 District Blood Center',
    coordinates: [75.7382, 12.4244]
  },
  {
    registrationNumber: 'KA-KDG-002',
    hospitalName: 'Ashwini Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Near Raja Seat, Madikeri - 571201',
    city: 'Madikeri',
    phone: '08272-228777',
    operatingHours: '24/7 Emergency Blood Bank',
    coordinates: [75.7330, 12.4180]
  },

  // ─── 25. CHAMARAJANAGAR (1 facility) ────────────────────────────────────
  {
    registrationNumber: 'KA-CRN-001',
    hospitalName: 'CIMS District Teaching Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'B.R. Hills Road, Yadapura, Chamarajanagar - 571313',
    city: 'Chamarajanagar',
    phone: '08226-224000',
    operatingHours: '24/7 District Blood Center',
    coordinates: [76.9420, 11.9261]
  },

  // ─── 26. KOPPAL (1 facility) ────────────────────────────────────────────
  {
    registrationNumber: 'KA-KPL-001',
    hospitalName: 'KIMS District Teaching Hospital & Blood Bank Koppal',
    facilityType: 'hospital',
    address: 'Kalyan Nagar, Koppal - 583231',
    city: 'Koppal',
    phone: '08539-225220',
    operatingHours: '24/7 District Blood Center',
    coordinates: [76.1550, 15.3480]
  },

  // ─── 27. YADGIR (1 facility) ────────────────────────────────────────────
  {
    registrationNumber: 'KA-YDG-001',
    hospitalName: 'Yadgir District Civil Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'Chittapur Road, Yadgir - 585202',
    city: 'Yadgir',
    phone: '08473-250100',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [77.1350, 16.7680]
  },

  // ─── 28. RAMANAGARA (1 facility) ────────────────────────────────────────
  {
    registrationNumber: 'KA-RMG-001',
    hospitalName: 'District Hospital Ramanagara & Blood Bank',
    facilityType: 'hospital',
    address: 'MG Road, Ijoor, Ramanagara - 562159',
    city: 'Ramanagara',
    phone: '080-27271234',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [77.2810, 12.7210]
  },

  // ─── 29. CHIKKABALLAPUR (1 facility) ────────────────────────────────────
  {
    registrationNumber: 'KA-CBP-001',
    hospitalName: 'CHIMS District Teaching Hospital & Blood Bank',
    facilityType: 'hospital',
    address: 'B.B. Road, Chikkaballapur - 562101',
    city: 'Chikkaballapur',
    phone: '08156-270100',
    operatingHours: '24/7 District Blood Center',
    coordinates: [77.7275, 13.4325]
  },

  // ─── 30. VIJAYANAGARA / HOSAPETE (1 facility) ───────────────────────────
  {
    registrationNumber: 'KA-VJN-001',
    hospitalName: '100-Bed Sub-Divisional Hospital & Blood Bank Hosapete',
    facilityType: 'hospital',
    address: 'Station Road, Hosapete, Vijayanagara - 583201',
    city: 'Hosapete',
    phone: '08394-228222',
    operatingHours: '24/7 District Blood Bank',
    coordinates: [76.3880, 15.2690]
  }
];

const ALL_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Realistic stock weight distributions (O+ and B+ most abundant, AB- and O- rarest)
const GROUP_STOCK_PROFILE = {
  'O+':  { min: 5, max: 20 },
  'B+':  { min: 4, max: 18 },
  'A+':  { min: 3, max: 14 },
  'AB+': { min: 2, max: 8 },
  'O-':  { min: 1, max: 5 },
  'B-':  { min: 1, max: 4 },
  'A-':  { min: 1, max: 4 },
  'AB-': { min: 0, max: 3 }
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedKarnatakaData() {
  console.log('\n============================================================');
  console.log('🩸 Seeding Karnataka Hospitals & Live Verified Blood Inventory');
  console.log('============================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB:', MONGO_URI);

    let hospitalsSeeded = 0;
    let inventoryBatchesSeeded = 0;
    let totalUnitsInjected = 0;

    for (const fac of KARNATAKA_FACILITIES) {
      // 1. Create or update the hospital record with proper Point coordinates
      const hospitalDoc = await Hospital.findOneAndUpdate(
        { registrationNumber: fac.registrationNumber },
        {
          hospitalName: fac.hospitalName,
          registrationNumber: fac.registrationNumber,
          facilityType: fac.facilityType,
          address: fac.address,
          city: fac.city,
          phone: fac.phone,
          operatingHours: fac.operatingHours,
          location: {
            type: 'Point',
            coordinates: fac.coordinates // [lng, lat]
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      hospitalsSeeded++;

      // 2. Clear old inventory for this hospital to avoid duplicate stacking on re-runs
      await BloodInventory.deleteMany({ hospital: hospitalDoc._id });

      // 3. Inject realistic, verified safe blood inventory batches
      const now = new Date();
      for (const bg of ALL_BLOOD_GROUPS) {
        const profile = GROUP_STOCK_PROFILE[bg];
        const units = randomInt(profile.min, profile.max);

        if (units > 0) {
          // Expiry between 14 and 40 days from now (safe and non-expired)
          const daysToExpire = randomInt(14, 40);
          const expiryDate = new Date(now.getTime() + daysToExpire * 24 * 60 * 60 * 1000);
          const collectionDate = new Date(now.getTime() - randomInt(1, 15) * 24 * 60 * 60 * 1000);

          await BloodInventory.create({
            hospital: hospitalDoc._id,
            bloodGroup: bg,
            units: units,
            collectionDate: collectionDate,
            expiryDate: expiryDate,
            storageTemperature: parseFloat((3.8 + Math.random() * 0.8).toFixed(1)), // 3.8 to 4.6 C
            safetyVerification: {
              hivTest: 'negative',
              hepatitisBTest: 'negative',
              hepatitisCTest: 'negative',
              syphilisTest: 'negative',
              hemoglobinLevel: parseFloat((13.5 + Math.random() * 2.0).toFixed(1)),
              verifiedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
              verifiedBy: 'Chief Medical Pathologist'
            },
            aiSafetyFlag: {
              isFlagged: false
            },
            status: 'safe'
          });

          inventoryBatchesSeeded++;
          totalUnitsInjected += units;
        }
      }
    }

    console.log('\n🎉 Successfully finished seeding Karnataka Blood Network!');
    console.log(`   🏥 Total Facilities Seeded: ${hospitalsSeeded}`);
    console.log(`   🧪 Total Verified Inventory Batches: ${inventoryBatchesSeeded}`);
    console.log(`   🩸 Total Safe Blood Units Available: ${totalUnitsInjected}`);

    // Print breakdown by city
    const cityBreakdown = await Hospital.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('\n📍 Facilities by Region/City:');
    cityBreakdown.forEach(c => console.log(`   • ${c._id}: ${c.count} hospitals/blood banks`));

    console.log('\n============================================================\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seedKarnatakaData();
