import axios from 'axios';

async function testDashboardAPI() {
  try {
    console.log('=== Testing Dashboard API ===');
    
    // First, let's check if the server is running
    const healthCheck = await axios.get('http://localhost:2000');
    console.log('✅ Server health check:', healthCheck.status);
    
    // Create a user with phone number 0743537398 if not exists
    console.log('\n=== Creating Test User ===');
    const createUserResponse = await axios.post('http://localhost:2000/auth/register', {
      fullName: 'Test User',
      email: 'test@example.com',
      phoneNumber: '0743537398',
      password: 'password123'
    });
    console.log('✅ User created:', createUserResponse.data);
    
    // Login to get token
    console.log('\n=== Logging In ===');
    const loginResponse = await axios.post('http://localhost:2000/auth/login', {
      phoneNumber: '0743537398',
      password: 'password123'
    });
    console.log('✅ Login successful');
    
    const token = loginResponse.data.access_token;
    
    // Test dashboard endpoint
    console.log('\n=== Testing Dashboard ===');
    const dashboardResponse = await axios.get('http://localhost:2000/users/dashboard', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ Dashboard response received');
    console.log('📊 Statistics:', dashboardResponse.data.statistics);
    console.log('👛 Wallet:', dashboardResponse.data.wallet);
    console.log('📱 Linked Routers:', dashboardResponse.data.linkedRouters);
    console.log('🎟️  Currently Running Tokens:', dashboardResponse.data.currentlyRunningTokens);
    
    if (dashboardResponse.data.linkedRouters.length === 0) {
      console.log('\n⚠️  No routers linked to this phone number yet');
    }
    
    if (dashboardResponse.data.currentlyRunningTokens.length === 0) {
      console.log('⚠️  No currently running tokens');
    }
    
    console.log('\n=== Dashboard API test completed successfully ===');
    
  } catch (error) {
    console.error('❌ Error testing dashboard API:', error.response?.data || error.message);
  }
}

testDashboardAPI();