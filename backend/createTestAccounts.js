const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Donor = require('./src/models/Donor');
const Hospital = require('./src/models/Hospital');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bloodplatform';

// Test account credentials
const testAccounts = [
  {
    role: 'donor',
    email: 'donor@test.com',
    password: 'donor123',
    name: 'Test Donor',
    phone: '9876543210',
    bloodGroup: 'O+',
    age: 25,
    weight: 65,
    gender: 'Male',
    state: 'Karnataka',
    city: 'Bangalore',
    area: 'Koramangala',
    address: '123 Test Street, Koramangala',
    hub: 'Test Hub',
    hubType: 'residential',
    isAvailable: true
  },
  {
    role: 'hospital',
    email: 'hospital@test.com',
    password: 'hospital123',
    name: 'Test Hospital',
    hospitalName: 'Test Hospital',
    phone: '9876543211',
    city: 'Bangalore',
    area: 'Indiranagar',
    address: '456 Hospital Road, Indiranagar',
    registrationNumber: 'TEST-HOSP-001',
    contactPerson: 'Hospital Admin'
  },
  {
    role: 'admin',
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Test Admin',
    phone: '9876543212'
  }
];

// Coordinate mapping for locations
const CITY_COORDS = {
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 }
};

async function createTestAccounts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing test accounts
    await User.deleteMany({ email: { $in: testAccounts.map(a => a.email) } });
    await Donor.deleteMany({ email: { $in: testAccounts.map(a => a.email) } });
    await Hospital.deleteMany({ email: { $in: testAccounts.map(a => a.email) } });
    console.log('🗑️  Cleared existing test accounts');

    for (const account of testAccounts) {
      // Create User (password will be auto-hashed by the User model's pre-save hook)
      const user = await User.create({
        email: account.email,
        password: account.password, // Don't hash here - let the model do it
        role: account.role,
        name: account.name,
        phone: account.phone
      });

      // Get coordinates
      const coords = account.city ? CITY_COORDS[account.city] || { lat: 12.9716, lng: 77.5946 } : null;

      // Create role-specific profile
      if (account.role === 'donor') {
        await Donor.create({
          user: user._id,
          bloodGroup: account.bloodGroup,
          age: account.age,
          weight: account.weight,
          gender: account.gender,
          state: account.state,
          area: account.area,
          address: account.address,
          hub: account.hub,
          hubType: account.hubType,
          location: {
            type: 'Point',
            coordinates: [coords.lng, coords.lat]
          },
          isAvailable: account.isAvailable,
          lastDonationDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
          totalDonations: 3,
          responseRate: 95
        });
        console.log(`✅ Created DONOR account: ${account.email} / ${account.password}`);
      } else if (account.role === 'hospital') {
        await Hospital.create({
          user: user._id,
          hospitalName: account.hospitalName,
          registrationNumber: account.registrationNumber,
          city: account.city,
          address: account.address,
          contactPerson: account.contactPerson,
          phone: account.phone,
          location: {
            type: 'Point',
            coordinates: [coords.lng, coords.lat]
          }
        });
        console.log(`✅ Created HOSPITAL account: ${account.email} / ${account.password}`);
      } else if (account.role === 'admin') {
        console.log(`✅ Created ADMIN account: ${account.email} / ${account.password}`);
      }
    }

    console.log('\n🎉 All test accounts created successfully!\n');
    console.log('═══════════════════════════════════════════');
    console.log('TEST ACCOUNT CREDENTIALS:');
    console.log('═══════════════════════════════════════════');
    console.log('\n👤 DONOR ACCOUNT:');
    console.log('   Email: donor@test.com');
    console.log('   Password: donor123');
    console.log('\n🏥 HOSPITAL ACCOUNT:');
    console.log('   Email: hospital@test.com');
    console.log('   Password: hospital123');
    console.log('\n👨‍💼 ADMIN ACCOUNT:');
    console.log('   Email: admin@test.com');
    console.log('   Password: admin123');
    console.log('\n═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error creating test accounts:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestAccounts();
