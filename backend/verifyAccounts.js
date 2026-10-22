const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Donor = require('./src/models/Donor');
const Hospital = require('./src/models/Hospital');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blood-donation';

async function verifyAccounts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const testEmails = ['donor@test.com', 'hospital@test.com', 'admin@test.com'];

    for (const email of testEmails) {
      console.log(`Checking ${email}...`);
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log(`❌ User not found!\n`);
        continue;
      }

      console.log(`✅ User found:`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);

      // Check profile
      if (user.role === 'donor') {
        const donor = await Donor.findOne({ user: user._id });
        if (donor) {
          console.log(`   Donor Profile: ${donor.bloodGroup}, Age: ${donor.age}`);
        } else {
          console.log(`   ⚠️ Donor profile not found`);
        }
      } else if (user.role === 'hospital') {
        const hospital = await Hospital.findOne({ user: user._id });
        if (hospital) {
          console.log(`   Hospital Profile: ${hospital.hospitalName}`);
        } else {
          console.log(`   ⚠️ Hospital profile not found`);
        }
      }

      // Test password match
      const testPassword = email.includes('donor') ? 'donor123' : 
                          email.includes('hospital') ? 'hospital123' : 'admin123';
      const isMatch = await user.matchPassword(testPassword);
      console.log(`   Password Test: ${isMatch ? '✅ CORRECT' : '❌ WRONG'}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

verifyAccounts();
