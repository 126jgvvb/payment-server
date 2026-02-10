const axios = require('axios');
const jwt = require('jsonwebtoken');

const secret = 'system-daemons';
// Replace with actual userID from your database
const userId = '7331a991-c5e3-4e27-8e47-fca548f5a98e';

// Generate JWT token
const token = jwt.sign({ userId }, secret, { expiresIn: '1h' });
console.log('Generated JWT Token:', token);

// API endpoint URL
const url = 'http://localhost:2000/users/vouchers';

// Headers
const config = {
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
};

console.log('Requesting data from:', url);

axios.get(url, config)
  .then(response => {
    console.log('=== Success ===');
    console.log('Status Code:', response.status);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
  })
  .catch(error => {
    console.log('=== Error ===');
    if (error.response) {
      console.log('Status Code:', error.response.status);
      console.log('Response Headers:', JSON.stringify(error.response.headers, null, 2));
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received:', error.request);
    } else {
      console.log('Error making request:', error.message);
    }
    console.log('Error Stack:', error.stack);
  });
