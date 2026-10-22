const mongoose = require('mongoose');
require('dotenv').config();

const Hospital = require('./src/models/Hospital');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blood-donation';

async function updateHospitalLocation() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find test hospital
    const hospital = await Hospital.findOne({ registrationNumber: 'TEST-HOSP-001' });
    
    if (!hospital) {
      console.log('❌ Test hospital not found');
      return;
    }

    console.log('Found hospital:', hospital.hospitalName);
    console.log('Current location:', hospital.location);

    // Update with Bangalore Indiranagar coordinates (example hospital location)
    // Indiranagar, Bangalore coordinates: 12.9716, 77.6412
    hospital.location = {
      type: 'Point',
      coordinates: [77.6412, 12.9716] // [longitude, latitude]
    };
    hospital.city = 'Bangalore';
    hospital.address = '100 Hospital Road, Indiranagar, Bangalore';

    await hospital.save();

    console.log('✅ Updated hospital location successfully!');
    console.log('New location:', hospital.location);
    console.log('New address:', hospital.address);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

updateHospitalLocation();
