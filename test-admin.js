const url = 'http://localhost:24001/api/dev/setup-admin';
require('fs').readFile('.env', 'utf8', (err, data) => {
  const match = data.match(/^AUTH_SECRET=(.*)$/m);
  if (match) {
    const secret = match[1].replace(/\"/g, '').trim();
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + secret },
      body: JSON.stringify({ username: 'AdminTest', password: 'password123', email: 'test@example.com' })
    }).then(r => r.json().then(j => console.log(r.status, j))).catch(console.error);
  }
});
