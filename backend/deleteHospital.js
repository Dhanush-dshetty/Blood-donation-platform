const mongoose = require('mongoose');
require('dotenv').config();

const Hospital = require('./src/models/Hospital');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blood-donation';

async function deleteHospital() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const result = await Hospital.deleteMany({ registrationNumber: 'TEST-HOSP-001' });
    console.log(`🗑️  Deleted ${result.deletedCount} hospital(s)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

deleteHospital();
