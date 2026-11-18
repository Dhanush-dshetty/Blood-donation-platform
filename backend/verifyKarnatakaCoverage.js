const mongoose = require('mongoose');
require('dotenv').config();

const Hospital = require('./src/models/Hospital');
const BloodInventory = require('./src/models/BloodInventory');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/bloodplatform';

async function testCoverage() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const testPoints = [
    { name: 'Bangalore Center', coords: [77.5946, 12.9716] },
    { name: 'Hubli - Dharwad', coords: [75.1228, 15.3647] },
    { name: 'Belgaum (Belagavi)', coords: [74.5165, 15.8497] },
    { name: 'Mysore (Mysuru)', coords: [76.6543, 12.3129] },
    { name: 'Kalaburagi (Gulbarga)', coords: [76.8343, 17.3297] },
    { name: 'Ballari (Bellary)', coords: [76.9248, 15.1394] },
    { name: 'Shimoga (Shivamogga)', coords: [75.5681, 13.9299] },
    { name: 'Davanagere', coords: [75.9218, 14.4644] },
    { name: 'Mangalore & Coast', coords: [74.8431, 12.8703] },
  ];

  for (const pt of testPoints) {
    const list = await Hospital.find({
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: pt.coords },
          $maxDistance: 100000 // 100km
        }
      }
    }).select('hospitalName city');
    console.log(`📍 ${pt.name} (100km radius): found ${list.length} hospitals`);
  }

  const totalHospitals = await Hospital.countDocuments();
  const totalSafeBatches = await BloodInventory.countDocuments({ status: 'safe' });
  console.log(`\nTotal Hospitals in DB: ${totalHospitals}`);
  console.log(`Total Safe Inventory Batches: ${totalSafeBatches}`);

  await mongoose.disconnect();
}

testCoverage();
