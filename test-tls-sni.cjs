const tls = require('tls');
const net = require('net');

async function run() {
  const host = '54.255.219.82'; // Pooler IPv4
  const port = 6543;
  const servername = 'db.oxtjlhcwibieeuwbhnyj.supabase.co';

  console.log(`Connecting to TCP ${host}:${port}...`);
  const socket = net.connect(port, host, () => {
    console.log('TCP Connected! Sending PG SSLRequest...');
    // Correct SSL magic number: 0x04D22D2D -> [0, 0, 0, 8, 4, 210, 45, 45]
    const sslRequest = Buffer.from([0, 0, 0, 8, 4, 210, 45, 45]);
    socket.write(sslRequest);
  });

  socket.once('data', (data) => {
    const responseByte = data.toString('utf8');
    console.log('Received response byte to SSLRequest:', responseByte);
    
    if (responseByte === 'S') {
      console.log('SSL supported! Upgrading to TLS with SNI:', servername);
      
      const tlsSocket = tls.connect({
        socket: socket,
        servername: servername,
        rejectUnauthorized: false
      }, () => {
        console.log('TLS Handshake Successful!');
        console.log('Cipher:', tlsSocket.getCipher());
        
        // Send StartupMessage
        const user = 'postgres';
        const database = 'postgres';
        const payload = Buffer.concat([
          Buffer.from([0, 3, 0, 0]), // protocol version 3.0
          Buffer.from('user\0'),
          Buffer.from(user + '\0'),
          Buffer.from('database\0'),
          Buffer.from(database + '\0'),
          Buffer.from('\0')
        ]);
        const lengthBuf = Buffer.alloc(4);
        lengthBuf.writeInt32BE(payload.length + 4);
        const msg = Buffer.concat([lengthBuf, payload]);
        
        console.log('Sending Postgres StartupMessage...');
        tlsSocket.write(msg);
      });

      tlsSocket.on('data', (data) => {
        console.log('Received TLS data from server:', data.toString('utf8'), data);
      });

      tlsSocket.on('error', (err) => {
        console.error('TLS Socket Error:', err.message);
      });
    } else {
      console.error('SSL NOT supported by server! Got:', data);
    }
  });

  socket.on('error', (err) => {
    console.error('TCP Socket Error:', err.message);
  });
}

run();
