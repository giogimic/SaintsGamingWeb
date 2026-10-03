const fs = require('fs');
const files = fs.readdirSync('C:/Users/Matth/OneDrive/Desktop/sg anims/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Modular Parts').filter(f => f.endsWith('.gltf'));
const legs = files.find(f => f.includes('Male_Ranger_Legs'));
if (legs) {
  const data = fs.readFileSync('C:/Users/Matth/OneDrive/Desktop/sg anims/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Modular Parts/' + legs);
  const str = data.toString('utf8');
  const names = str.match(/"name":"([^"]+)"/g);
  console.log(names ? Array.from(new Set(names)).slice(50, 100) : 'no matches');
}
