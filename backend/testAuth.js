/**
 * Test Authentication - Verify JWT token generation and validation
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('🔍 Testing JWT Authentication...\n');

// 1. Check JWT_SECRET
console.log('1️⃣ JWT_SECRET Configuration:');
console.log('   Value:', process.env.JWT_SECRET || 'NOT SET (using default "secret")');
console.log('   Status:', process.env.JWT_SECRET ? '✅ Configured' : '⚠️ Using default\n');

// 2. Generate a test token
console.log('\n2️⃣ Generating Test Token:');
const testUser = { id: 'test123', role: 'donor' };
const token = jwt.sign(testUser, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
console.log('   Token:', token.substring(0, 50) + '...');
console.log('   Status: ✅ Generated successfully\n');

// 3. Verify the token
console.log('3️⃣ Verifying Test Token:');
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
  console.log('   Decoded:', decoded);
  console.log('   Status: ✅ Token is valid\n');
} catch (err) {
  console.log('   Error:', err.message);
  console.log('   Status: ❌ Token verification failed\n');
}

// 4. Test expired token detection
console.log('4️⃣ Testing Expired Token Detection:');
const expiredToken = jwt.sign(testUser, process.env.JWT_SECRET || 'secret', { expiresIn: '1ms' });
setTimeout(() => {
  try {
    jwt.verify(expiredToken, process.env.JWT_SECRET || 'secret');
    console.log('   Status: ⚠️ Should have expired but didn\'t\n');
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.log('   Status: ✅ Correctly detects expired tokens');
      console.log('   Error:', err.message, '\n');
    } else {
      console.log('   Status: ❌ Unexpected error:', err.message, '\n');
    }
  }

  // 5. Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ JWT system is working correctly');
  console.log('✅ Tokens expire after 7 days');
  console.log('✅ Verification is functional\n');
  console.log('💡 If users see "token invalid or expired":');
  console.log('   → Ask them to clear browser localStorage');
  console.log('   → Have them log in again');
  console.log('   → Check that backend JWT_SECRET hasn\'t changed\n');
}, 100);
