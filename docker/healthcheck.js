const http = require('node:http');
const port = process.env.PORT || 3000;
const req = http.request(
  { host: '127.0.0.1', port, path: '/api/health', method: 'GET', timeout: 4000 },
  (res) => process.exit(res.statusCode === 200 ? 0 : 1),
);
req.on('error', () => process.exit(1));
req.on('timeout', () => process.exit(1));
req.end();
