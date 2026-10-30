const mongoose = require('mongoose');
require('dotenv').config();

const Hospital = require('./src/models/Hospital');
const DonationCamp = require('./src/models/DonationCamp');
const Donor = require('./src/models/Donor');
const User = require('./src/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bloodplatform';

const HOSPITALS_AND_BLOOD_BANKS = [
  // ── Mangalore ──────────────────────────────────────────────────────────
  {
    hospitalName: 'KMC Hospital Mangalore',
    registrationNumber: 'HOSP-MNG-001',
    facilityType: 'hospital',
    operatingHours: '24/7 Emergency',
    city: 'Mangalore',
    address: 'Ambedkar Circle, Balmatta, Mangalore, Karnataka 575001',
    phone: '0824-2444590',
    contactPerson: 'Dr. Ramesh Rao',
    location: { type: 'Point', coordinates: [74.8431, 12.8703] } // [lng, lat]
  },
  {
    hospitalName: 'Wenlock District Hospital & Blood Bank',
    registrationNumber: 'HOSP-MNG-002',
    facilityType: 'hospital',
    operatingHours: '24/7 Emergency',
    city: 'Mangalore',
    address: 'Hampankatta, Mangalore, Karnataka 575001',
    phone: '0824-2423321',
    contactPerson: 'Dr. Rajeshwari Devi',
    location: { type: 'Point', coordinates: [74.8480, 12.8655] }
  },
  {
    hospitalName: 'Father Muller Medical College Hospital',
    registrationNumber: 'HOSP-MNG-003',
    facilityType: 'hospital',
    operatingHours: '24/7 Emergency',
    city: 'Mangalore',
    address: 'Father Muller Road, Kankanady, Mangalore, Karnataka 575002',
    phone: '0824-2238000',
    contactPerson: 'Fr. Richard Coelho',
    location: { type: 'Point', coordinates: [74.8622, 12.8667] }
  },
  {
    hospitalName: 'Indian Red Cross Society Blood Bank',
    registrationNumber: 'BB-MNG-001',
    facilityType: 'blood_bank',
    operatingHours: '24 Hours Blood Storage & Component Separation',
    city: 'Mangalore',
    address: 'Behind DC Office, Bunder, Mangalore, Karnataka 575001',
    phone: '0824-2428800',
    contactPerson: 'Suresh Kumar (Incharge)',
    location: { type: 'Point', coordinates: [74.8390, 12.8630] }
  },
  {
    hospitalName: 'Rotary Blood Bank Mangalore',
    registrationNumber: 'BB-MNG-002',
    facilityType: 'blood_bank',
    operatingHours: '8:00 AM - 10:00 PM',
    city: 'Mangalore',
    address: 'Kadri Hills, Kadri, Mangalore, Karnataka 575004',
    phone: '0824-2211990',
    contactPerson: 'Rtn. Santhosh Shetty',
    location: { type: 'Point', coordinates: [74.8580, 12.8850] }
  },

  // ── Bangalore ──────────────────────────────────────────────────────────
  {
    hospitalName: 'Victoria Hospital & Blood Bank',
    registrationNumber: 'HOSP-BLR-001',
    facilityType: 'hospital',
    operatingHours: '24/7 Emergency',
    city: 'Bangalore',
    address: 'Fort Road, Near City Market, Bangalore, Karnataka 560002',
    phone: '080-26701150',
    contactPerson: 'Dr. C. R. Jayanthi',
    location: { type: 'Point', coordinates: [77.5736, 12.9634] }
  },
  {
    hospitalName: 'Manipal Hospital Old Airport Road',
    registrationNumber: 'HOSP-BLR-002',
    facilityType: 'hospital',
    operatingHours: '24/7 Emergency',
    city: 'Bangalore',
    address: '98, HAL Old Airport Rd, Kodihalli, Bangalore, Karnataka 560017',
    phone: '080-25024444',
    contactPerson: 'Dr. Sudarshan Ballal',
    location: { type: 'Point', coordinates: [77.6515, 12.9587] }
  },
  {
    hospitalName: 'Lions Blood Bank Bangalore',
    registrationNumber: 'BB-BLR-001',
    facilityType: 'blood_bank',
    operatingHours: '24 Hours All Blood Components Available',
    city: 'Bangalore',
    address: 'Lady Curzon Rd, Shivaji Nagar, Bangalore, Karnataka 560001',
    phone: '080-22866766',
    contactPerson: 'Ln. Ashok Kumar',
    location: { type: 'Point', coordinates: [77.6010, 12.9840] }
  },
  {
    hospitalName: 'Rashtrotthana Blood Center',
    registrationNumber: 'BB-BLR-002',
    facilityType: 'blood_bank',
    operatingHours: '24/7 Service',
    city: 'Bangalore',
    address: 'Kempegowda Nagar, Chamarajpet, Bangalore, Karnataka 560019',
    phone: '080-26612730',
    contactPerson: 'N. Narayana Rao',
    location: { type: 'Point', coordinates: [77.5615, 12.9520] }
  },

  // ── Udupi ──────────────────────────────────────────────────────────────
  {
    hospitalName: 'Kasturba Hospital & Blood Center Manipal',
    registrationNumber: 'HOSP-UDP-001',
    facilityType: 'hospital',
    operatingHours: '24/7 Regional Blood Center',
    city: 'Udupi',
    address: 'Madhav Nagar, Manipal, Udupi, Karnataka 576104',
    phone: '0820-2922761',
    contactPerson: 'Dr. Avinash Shetty',
    location: { type: 'Point', coordinates: [74.7865, 13.3535] }
  },
  {
    hospitalName: 'District Hospital Udupi Blood Bank',
    registrationNumber: 'BB-UDP-001',
    facilityType: 'blood_bank',
    operatingHours: '24/7 Government Blood Bank',
    city: 'Udupi',
    address: 'Court Road, Ajjarkad, Udupi, Karnataka 576101',
    phone: '0820-2520555',
    contactPerson: 'Dr. Veena Kumari',
    location: { type: 'Point', coordinates: [74.7460, 13.3389] }
  }
];

const CAMPS = [
  {
    campName: 'Mega Life Saver Blood Donation Drive',
    organizer: 'Red Cross Youth Wing & Mangalore University',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // In 3 days
    startTime: '09:00 AM',
    endTime: '04:00 PM',
    venue: 'Mangalore Town Hall, Hampankatta',
    address: 'Town Hall Compound, Hampankatta, Mangalore',
    city: 'Mangalore',
    contactPhone: '9845012345',
    targetUnits: 150,
    registeredDonorsCount: 42,
    status: 'upcoming',
    location: { type: 'Point', coordinates: [74.8465, 12.8680] }
  },
  {
    campName: 'City Centre Voluntary Blood Drive',
    organizer: 'Lions Club Mangalore & Wenlock Hospital',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // In 7 days
    startTime: '10:00 AM',
    endTime: '06:00 PM',
    venue: 'City Centre Mall 3rd Floor Atrium',
    address: 'K.S. Rao Road, Mangalore, Karnataka 575001',
    city: 'Mangalore',
    contactPhone: '9480123456',
    targetUnits: 100,
    registeredDonorsCount: 28,
    status: 'upcoming',
    location: { type: 'Point', coordinates: [74.8420, 12.8710] }
  },
  {
    campName: 'IT Corridor Techies Blood Donation Drive',
    organizer: 'Rashtrotthana Blood Bank & Manyata Tech Park',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    startTime: '09:30 AM',
    endTime: '05:00 PM',
    venue: 'Clubhouse Arena, Manyata Tech Park, Hebbal',
    address: 'Outer Ring Road, Hebbal, Bangalore',
    city: 'Bangalore',
    contactPhone: '9886011223',
    targetUnits: 200,
    registeredDonorsCount: 75,
    status: 'upcoming',
    location: { type: 'Point', coordinates: [77.6200, 13.0480] }
  },
  {
    campName: 'Rotary Community Youth Blood Camp',
    organizer: 'Rotary Club of Udupi & Kasturba Blood Center',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    startTime: '08:30 AM',
    endTime: '03:30 PM',
    venue: 'Town Lions Seva Bhavan, Ajjarkad',
    address: 'Near Brahmagiri Circle, Udupi',
    city: 'Udupi',
    contactPhone: '9740567890',
    targetUnits: 80,
    registeredDonorsCount: 31,
    status: 'upcoming',
    location: { type: 'Point', coordinates: [74.7470, 13.3420] }
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Upsert Hospitals and Blood Banks
    for (const h of HOSPITALS_AND_BLOOD_BANKS) {
      await Hospital.findOneAndUpdate(
        { registrationNumber: h.registrationNumber },
        { $set: h },
        { upsert: true, new: true }
      );
      console.log(`🏥 [${h.facilityType.toUpperCase()}] ${h.hospitalName} (${h.city})`);
    }

    // Upsert Donation Camps
    for (const c of CAMPS) {
      await DonationCamp.findOneAndUpdate(
        { campName: c.campName, city: c.city },
        { $set: c },
        { upsert: true, new: true }
      );
      console.log(`🎪 [CAMP] ${c.campName} (${c.city})`);
    }

    console.log('\n🎉 Successfully seeded Hospitals, Blood Banks, and Donation Camps!');
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
