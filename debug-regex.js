const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const regex = new RegExp(`^(\\s*description\\s+String\\s*[^\\n\\/]*?)(\\s*\\/\\/.*)?$`, 'gm');

schema = schema.replace(regex, (match, p1, p2) => {
    return `${p1.trimRight()} @db.Text${p2 || ''}`;
});

fs.writeFileSync('prisma/schema.prisma.debug', schema);
console.log("Done");
