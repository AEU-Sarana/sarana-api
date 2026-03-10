const http = require('http');

const data = JSON.stringify({
  username: 'admin',
  password: 'password'
});

const req = http.request({
  hostname: 'localhost',
  port: 8088,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const resp = JSON.parse(body);
      const token = resp.data.access_token;
      console.log("Logged in");
      
      const payload = JSON.stringify({ reason: "Testing close" });
      const req2 = http.request({
        hostname: 'localhost',
        port: 8088,
        path: '/api/v1/super-admin/subscriptions/4/close',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Length': payload.length
        }
      }, (res2) => {
        let body2 = '';
        res2.on('data', d => body2 += d);
        res2.on('end', () => console.log(body2));
      });
      req2.write(payload);
      req2.end();
    } catch(e) { console.error("Login failed or parsing failed:", body) }
  });
});
req.write(data);
req.end();
