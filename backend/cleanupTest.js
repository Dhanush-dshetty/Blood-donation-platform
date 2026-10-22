const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Donor = require('./src/models/Donor');
const Hospital = require('./src/models/Hospital');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blood-donation';

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const testEmails = ['donor@test.com', 'hospital@test.com', 'admin@test.com'];
    
    // Get user IDs
    const users = await User.find({ email: { $in: testEmails } });
    const userIds = users.map(u => u._id);

    // Delete from all collections
    await Donor.deleteMany({ user: { $in: userIds } });
    await Hospital.deleteMany({ user: { $in: userIds } });
    await User.deleteMany({ email: { $in: testEmails } });

    console.log('🗑️  Cleaned up all test accounts');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

cleanup();
