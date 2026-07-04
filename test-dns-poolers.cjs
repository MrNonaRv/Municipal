const dns = require('dns');

const hosts = [
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'ap-southeast-1.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.co',
  'pooler.supabase.com'
];

for (const h of hosts) {
  dns.resolve4(h, (err, addresses) => {
    if (err) {
      console.log(`${h}: FAILED (${err.message})`);
    } else {
      console.log(`${h}: SUCCESS (${addresses.join(', ')})`);
    }
  });
}
