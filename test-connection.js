const dns = require('dns');
const net = require('net');

const host = 'db.fjiroseuldiqicbcobxq.supabase.co';
const port = 5432;

console.log('Testing DNS resolution for:', host);

dns.lookup(host, { family: 4 }, (err, address, family) => {
  if (err) {
    console.error('DNS resolution failed (IPv4):', err);
    
    // Try IPv6
    dns.lookup(host, { family: 6 }, (err6, address6, family6) => {
      if (err6) {
        console.error('DNS resolution failed (IPv6):', err6);
        console.error('No DNS resolution available');
      } else {
        console.log('IPv6 address:', address6);
        testConnection(address6, port);
      }
    });
  } else {
    console.log('IPv4 address:', address);
    testConnection(address, port);
  }
});

function testConnection(host, port) {
  console.log('Testing TCP connection to:', host, port);
  
  const socket = new net.Socket();
  const timeout = setTimeout(() => {
    socket.destroy();
    console.error('Connection timeout');
  }, 10000);
  
  socket.connect(port, host, () => {
    clearTimeout(timeout);
    console.log('Connection successful');
    socket.destroy();
  });
  
  socket.on('error', (err) => {
    clearTimeout(timeout);
    console.error('Connection error:', err);
  });
}
