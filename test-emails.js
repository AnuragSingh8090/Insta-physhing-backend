// Test script for email functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/instagram';

async function testOTPEmail() {
  console.log('\n=== Testing OTP Email ===');
  try {
    const response = await axios.post(`${BASE_URL}/otp/send`, {
      email: 'test@example.com'
    });
    console.log('✓ OTP Email Response:', response.data);
  } catch (error) {
    console.error('✗ OTP Email Failed:', error.response?.data || error.message);
  }
}

async function testPasswordChangeEmail() {
  console.log('\n=== Testing Password Change Email ===');
  try {
    // First, submit a password change request
    const response = await axios.post(`${BASE_URL}/changepassword`, {
      email: 'test@example.com',
      username: 'testuser',
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      source: 'test',
      path: '/changepassword-test'
    });
    console.log('✓ Password Change Response:', response.data);
  } catch (error) {
    console.error('✗ Password Change Failed:', error.response?.data || error.message);
  }
}

async function testPasswordChangeWithoutUsername() {
  console.log('\n=== Testing Password Change Email (No Username) ===');
  try {
    const response = await axios.post(`${BASE_URL}/changepassword`, {
      email: 'test2@example.com',
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      source: 'test',
      path: '/changepassword-test'
    });
    console.log('✓ Password Change (No Username) Response:', response.data);
  } catch (error) {
    console.error('✗ Password Change (No Username) Failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('Starting Email Tests...');
  console.log('Make sure backend is running on port 5000');
  
  await testOTPEmail();
  await testPasswordChangeEmail();
  await testPasswordChangeWithoutUsername();
  
  console.log('\n=== Tests Complete ===');
  console.log('Check your email inbox for:');
  console.log('1. OTP email with Instagram logo (S3)');
  console.log('2. Password changed email with username (S3)');
  console.log('3. Password changed email without username (S3)');
}

runTests();
