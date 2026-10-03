const fs = require('fs');
const data = fs.readFileSync('public/game-assets/models/humanoids/superheroes/Superhero_Male_FullBody.glb');
const str = data.toString('utf8');
const names = str.match(/"name":"([^"]+)"/g);
console.log(names ? Array.from(new Set(names)).slice(50, 100) : 'no matches');
