const fs = require('fs');
const path = require('path');

const serverDir = path.join(__dirname, '..', 'src', 'server');
const files = fs.readdirSync(serverDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(serverDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix: .on("something", (data) =>
  content = content.replace(/\.on\("([^"]+)", \((data)\) =>/g, '.on("$1", ($2: any) =>');
  
  // Fix: .on("something", ({ accountId, socketId }) =>
  // Match any destructured argument without types
  content = content.replace(/\.on\("([^"]+)", \(\{\s*([a-zA-Z0-9_,\s]+)\s*\}\) =>/g, '.on("$1", ({ $2 }: any) =>');
  
  // Fix: .on("something", (accountId) =>
  content = content.replace(/\.on\("([^"]+)", \((accountId)\) =>/g, '.on("$1", ($2: any) =>');

  // Fix SocketHandler: (socketId, event, data) =>
  content = content.replace(/\(socketId, event, data\) =>/g, '(socketId: any, event: any, data: any) =>');
  content = content.replace(/\(socketId, room\) =>/g, '(socketId: any, room: any) =>');
  
  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${file}`);
  }
}
