const { Client } = require('pg');
require('dotenv').config({ path: './src/.env' });

console.log('Testing database connection...');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database:', process.env.DB_DATABASE);
console.log('Username:', process.env.DB_USERNAME);

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    await client.connect();
    console.log('✅ Connected to database successfully!');
    
    const res = await client.query('SELECT NOW()');
    console.log('Current time from DB:', res.rows[0].now);
    
    await client.end();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Also test DNS resolution separately
const dns = require('dns').promises;
async function testDns() {
  try {
    console.log('\nTesting DNS resolution...');
    const addresses = await dns.resolve4(process.env.DB_HOST);
    console.log('IPv4 addresses:', addresses);
    
    const ipv6Addresses = await dns.resolve6(process.env.DB_HOST);
    console.log('IPv6 addresses:', ipv6Addresses);
  } catch (error) {
    console.error('\n❌ DNS resolution failed:');
    console.error('Error:', error.message);
  }
}

Promise.all([testDns(), testConnection()]);