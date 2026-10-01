/**
 * Saints Gaming — Asset Ingestion & Normalization Pipeline
 * Cross-platform (Debian/Linux and Windows compatible)
 *
 * Ingests and normalizes purchased 3D character packages:
 * 1. Boy (Stylized Humanoid): Binds Texture.png, normalizes Y-offset (+0.957m), copies animations.
 * 2. Girl (Adventurer): Scales to 1.65m height, converts FBX animations to standalone GLB clips.
 * 3. Asian Girl (Modular Heroine): Converts FBX with 36 modular submeshes to GLB, exports Katana weapon prop.
 * 4. Leoverse (Heroic Statue): Normalized static hero prop.
 * 5. Citizens (42 Low-Poly Townspeople): Extracts, centers, and scales all 42 individual characters to GLB.
 */

const fs = require('fs');
const path = require('path');
const THREE = require('three');
const { OBJLoader, FBXLoader, GLTFExporter } = require('three-stdlib');
const sharp = require('sharp');

// Headless DOM mock for Three.js loaders
function createMockElement() {
  return {
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: () => ({
      drawImage: () => {},
      getImageData: () => ({ data: [] }),
    }),
    width: 1,
    height: 1,
    style: {},
  };
}
global.window = global;
global.document = {
  createElement: createMockElement,
  createElementNS: createMockElement,
};
global.HTMLCanvasElement = class {};
global.Image = createMockElement;

const SOURCE_ARGUMENT = process.env.QUICK_ASSETS_SOURCE || process.argv[2];
const SOURCE_BASE = SOURCE_ARGUMENT ? path.resolve(SOURCE_ARGUMENT) : null;
const TARGET_BASE = path.resolve(__dirname, '../public/game-assets/models/humanoids');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper to export Three.js object to GLB buffer
function exportToGlb(object, options = {}) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      object,
      (glb) => resolve(Buffer.from(glb)),
      (err) => reject(err),
      { binary: true, ...options }
    );
  });
}

// Helper to embed a JPEG/PNG buffer into a GLB buffer as its diffuse texture
function embedTextureBuffer(glbBuf, texBuf, mimeType = 'image/jpeg') {
  const jsonLen = glbBuf.readUInt32LE(12);
  const json = JSON.parse(glbBuf.slice(20, 20 + jsonLen).toString('utf8'));
  const binHeaderOffset = 20 + jsonLen;
  const binLen = glbBuf.readUInt32LE(binHeaderOffset);
  let binBuf = glbBuf.slice(binHeaderOffset + 8, binHeaderOffset + 8 + binLen);

  const padLen = (4 - (binBuf.length % 4)) % 4;
  if (padLen > 0) binBuf = Buffer.concat([binBuf, Buffer.alloc(padLen)]);

  const imgOffset = binBuf.length;
  const imgLength = texBuf.length;
  binBuf = Buffer.concat([binBuf, texBuf]);

  const bvIdx = json.bufferViews.length;
  json.bufferViews.push({ buffer: 0, byteOffset: imgOffset, byteLength: imgLength });

  json.images = json.images || [];
  const imgIdx = json.images.length;
  json.images.push({ bufferView: bvIdx, mimeType, name: 'DiffuseTexture' });

  json.samplers = json.samplers || [];
  const samplerIdx = json.samplers.length;
  json.samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 });

  json.textures = json.textures || [];
  const texIdx = json.textures.length;
  json.textures.push({ sampler: samplerIdx, source: imgIdx });

  if (json.materials && json.materials[0]) {
    json.materials[0].pbrMetallicRoughness = json.materials[0].pbrMetallicRoughness || {};
    json.materials[0].pbrMetallicRoughness.baseColorTexture = { index: texIdx };
    json.materials[0].pbrMetallicRoughness.roughnessFactor = 0.8;
    json.materials[0].pbrMetallicRoughness.metallicFactor = 0.05;
  }
  json.buffers[0].byteLength = binBuf.length;

  const newJsonStr = JSON.stringify(json);
  const newJsonBuf = Buffer.from(newJsonStr, 'utf8');
  const jsonPad = (4 - (newJsonBuf.length % 4)) % 4;
  const paddedJsonBuf = jsonPad > 0 ? Buffer.concat([newJsonBuf, Buffer.alloc(jsonPad, 0x20)]) : newJsonBuf;

  const binPad = (4 - (binBuf.length % 4)) % 4;
  const paddedBinBuf = binPad > 0 ? Buffer.concat([binBuf, Buffer.alloc(binPad, 0x00)]) : binBuf;

  const totalLen = 12 + 8 + paddedJsonBuf.length + 8 + paddedBinBuf.length;
  const finalGlb = Buffer.alloc(totalLen);

  finalGlb.writeUInt32LE(0x46546C67, 0);
  finalGlb.writeUInt32LE(2, 4);
  finalGlb.writeUInt32LE(totalLen, 8);

  finalGlb.writeUInt32LE(paddedJsonBuf.length, 12);
  finalGlb.writeUInt32LE(0x4E4F534A, 16);
  paddedJsonBuf.copy(finalGlb, 20);

  const binStart = 20 + paddedJsonBuf.length;
  finalGlb.writeUInt32LE(paddedBinBuf.length, binStart);
  finalGlb.writeUInt32LE(0x004E4942, binStart + 4);
  paddedBinBuf.copy(finalGlb, binStart + 8);

  return finalGlb;
}

function embedTexturesByMaterialName(glbBuf, bindings) {
  const jsonLen = glbBuf.readUInt32LE(12);
  const json = JSON.parse(glbBuf.slice(20, 20 + jsonLen).toString('utf8'));
  const binHeaderOffset = 20 + jsonLen;
  let binBuf = glbBuf.slice(binHeaderOffset + 8, binHeaderOffset + 8 + glbBuf.readUInt32LE(binHeaderOffset));

  for (const binding of bindings) {
    const materialIndices = json.materials
      .map((material, index) => material.name?.includes(binding.materialName) ? index : -1)
      .filter((index) => index >= 0);
    if (materialIndices.length === 0) {
      throw new Error(`No GLB material matched texture binding '${binding.materialName}'`);
    }

    const textureBuffer = fs.readFileSync(binding.texturePath);
    const padLen = (4 - (binBuf.length % 4)) % 4;
    if (padLen > 0) binBuf = Buffer.concat([binBuf, Buffer.alloc(padLen)]);
    const bufferViewIndex = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: binBuf.length, byteLength: textureBuffer.length });
    binBuf = Buffer.concat([binBuf, textureBuffer]);

    json.images = json.images || [];
    const imageIndex = json.images.length;
    json.images.push({ bufferView: bufferViewIndex, mimeType: binding.mimeType, name: path.basename(binding.texturePath) });
    json.samplers = json.samplers || [];
    const samplerIndex = json.samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }) - 1;
    json.textures = json.textures || [];
    const textureIndex = json.textures.push({ sampler: samplerIndex, source: imageIndex }) - 1;

    for (const index of materialIndices) {
      const material = json.materials[index];
      material.pbrMetallicRoughness = material.pbrMetallicRoughness || {};
      if (binding.normalTexture) material.normalTexture = { index: textureIndex, scale: binding.normalScale ?? 1 };
      else material.pbrMetallicRoughness.baseColorTexture = { index: textureIndex };
      if (binding.metallicFactor !== undefined) material.pbrMetallicRoughness.metallicFactor = binding.metallicFactor;
      if (binding.roughnessFactor !== undefined) material.pbrMetallicRoughness.roughnessFactor = binding.roughnessFactor;
    }
  }

  json.buffers[0].byteLength = binBuf.length;
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = (4 - (jsonBuffer.length % 4)) % 4;
  const paddedJson = jsonPad ? Buffer.concat([jsonBuffer, Buffer.alloc(jsonPad, 0x20)]) : jsonBuffer;
  const binPad = (4 - (binBuf.length % 4)) % 4;
  const paddedBin = binPad ? Buffer.concat([binBuf, Buffer.alloc(binPad)]) : binBuf;
  const totalLength = 12 + 8 + paddedJson.length + 8 + paddedBin.length;
  const output = Buffer.alloc(totalLength);
  output.writeUInt32LE(0x46546C67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(totalLength, 8);
  output.writeUInt32LE(paddedJson.length, 12);
  output.writeUInt32LE(0x4E4F534A, 16);
  paddedJson.copy(output, 20);
  const binStart = 20 + paddedJson.length;
  output.writeUInt32LE(paddedBin.length, binStart);
  output.writeUInt32LE(0x004E4942, binStart + 4);
  paddedBin.copy(output, binStart + 8);
  return output;
}

async function createMetallicRoughnessTexture(metallicPath, roughnessPath) {
  const metallic = await sharp(metallicPath).resize(1024, 1024).removeAlpha().greyscale().raw().toBuffer();
  const roughness = await sharp(roughnessPath).resize(1024, 1024).removeAlpha().greyscale().raw().toBuffer();
  const packed = Buffer.alloc(1024 * 1024 * 4, 255);
  for (let i = 0; i < metallic.length; i++) {
    packed[i * 4 + 1] = roughness[i];
    packed[i * 4 + 2] = metallic[i];
  }
  return sharp(packed, { raw: { width: 1024, height: 1024, channels: 4 } }).png().toBuffer();
}

// =========================================================================
// 1. BOY INGESTION
// =========================================================================
async function ingestBoy() {
  console.log('\n--- Ingesting Boy ---');
  const boyTarget = path.join(TARGET_BASE, 'boy');
  const animsTarget = path.join(boyTarget, 'anims');
  ensureDir(boyTarget);
  ensureDir(animsTarget);

  const tposeGlbPath = path.join(SOURCE_BASE, 'boy/unpacked_glb/glb/T-Pose.glb');
  const texturePngPath = path.join(SOURCE_BASE, 'boy/unpacked_texture/Texture.png');

  if (fs.existsSync(tposeGlbPath)) {
    console.log('Embedding Texture.png and normalizing origin for boy.glb...');
    const glbBuf = fs.readFileSync(tposeGlbPath);
    const textureBuf = fs.existsSync(texturePngPath) ? fs.readFileSync(texturePngPath) : null;

    // Parse GLB chunks
    const jsonLen = glbBuf.readUInt32LE(12);
    const json = JSON.parse(glbBuf.slice(20, 20 + jsonLen).toString('utf8'));
    const binHeaderOffset = 20 + jsonLen;
    const binLen = glbBuf.readUInt32LE(binHeaderOffset);
    let binBuf = glbBuf.slice(binHeaderOffset + 8, binHeaderOffset + 8 + binLen);

    // Add root offset node so feet are planted at Y = 0.000m
    const originalRootNodes = [...json.scenes[0].nodes];
    const wrapperNodeIdx = json.nodes.length;
    json.nodes.push({
      name: 'RootWrapper',
      translation: [0, 0.957, 0],
      children: originalRootNodes,
    });
    json.scenes[0].nodes = [wrapperNodeIdx];

    // Embed Texture.png into binary chunk if available
    if (textureBuf) {
      // 4-byte align the current binary buffer
      const padLen = (4 - (binBuf.length % 4)) % 4;
      if (padLen > 0) {
        binBuf = Buffer.concat([binBuf, Buffer.alloc(padLen)]);
      }

      const imgOffset = binBuf.length;
      const imgLength = textureBuf.length;
      binBuf = Buffer.concat([binBuf, textureBuf]);

      // Add bufferView for image
      const bvIdx = json.bufferViews.length;
      json.bufferViews.push({
        buffer: 0,
        byteOffset: imgOffset,
        byteLength: imgLength,
      });

      // Add image, sampler, texture
      json.images = json.images || [];
      const imgIdx = json.images.length;
      json.images.push({
        bufferView: bvIdx,
        mimeType: 'image/png',
        name: 'Boy_Texture',
      });

      json.samplers = json.samplers || [];
      const samplerIdx = json.samplers.length;
      json.samplers.push({
        magFilter: 9729,
        minFilter: 9987,
        wrapS: 10497,
        wrapT: 10497,
      });

      json.textures = json.textures || [];
      const texIdx = json.textures.length;
      json.textures.push({
        sampler: samplerIdx,
        source: imgIdx,
      });

      // Bind to material
      if (json.materials && json.materials[0]) {
        json.materials[0].pbrMetallicRoughness = json.materials[0].pbrMetallicRoughness || {};
        json.materials[0].pbrMetallicRoughness.baseColorTexture = { index: texIdx };
        json.materials[0].pbrMetallicRoughness.roughnessFactor = 0.6;
        json.materials[0].pbrMetallicRoughness.metallicFactor = 0.1;
      }
      json.buffers[0].byteLength = binBuf.length;
    }

    // Serialize modified GLB
    const newJsonStr = JSON.stringify(json);
    const newJsonBuf = Buffer.from(newJsonStr, 'utf8');
    const jsonPad = (4 - (newJsonBuf.length % 4)) % 4;
    const paddedJsonBuf = jsonPad > 0 ? Buffer.concat([newJsonBuf, Buffer.alloc(jsonPad, 0x20)]) : newJsonBuf;

    const binPad = (4 - (binBuf.length % 4)) % 4;
    const paddedBinBuf = binPad > 0 ? Buffer.concat([binBuf, Buffer.alloc(binPad, 0x00)]) : binBuf;

    const totalLen = 12 + 8 + paddedJsonBuf.length + 8 + paddedBinBuf.length;
    const finalGlb = Buffer.alloc(totalLen);

    // Header
    finalGlb.writeUInt32LE(0x46546C67, 0); // glTF
    finalGlb.writeUInt32LE(2, 4); // version 2
    finalGlb.writeUInt32LE(totalLen, 8);

    // Chunk 0 (JSON)
    finalGlb.writeUInt32LE(paddedJsonBuf.length, 12);
    finalGlb.writeUInt32LE(0x4E4F534A, 16); // JSON
    paddedJsonBuf.copy(finalGlb, 20);

    // Chunk 1 (BIN)
    const binStart = 20 + paddedJsonBuf.length;
    finalGlb.writeUInt32LE(paddedBinBuf.length, binStart);
    finalGlb.writeUInt32LE(0x004E4942, binStart + 4); // BIN\0
    paddedBinBuf.copy(finalGlb, binStart + 8);

    const outPath = path.join(boyTarget, 'boy.glb');
    fs.writeFileSync(outPath, finalGlb);
    console.log(`Saved ${outPath} (${(finalGlb.length / 1024 / 1024).toFixed(2)} MB)`);
  }

  // Copy animations
  const boyAnims = ['Breathing Idle.glb', 'Walking.glb', 'Running.glb', 'Sitting.glb'];
  for (const animName of boyAnims) {
    const srcAnim = path.join(SOURCE_BASE, 'boy/unpacked_glb/glb', animName);
    const dstAnim = path.join(animsTarget, animName);
    if (fs.existsSync(srcAnim)) {
      fs.copyFileSync(srcAnim, dstAnim);
      console.log(`Copied boy anim: ${animName}`);
    }
  }
}

// =========================================================================
// 2. GIRL INGESTION
// =========================================================================
async function ingestGirl() {
  console.log('\n--- Ingesting Girl ---');
  const girlTarget = path.join(TARGET_BASE, 'girl');
  const animsTarget = path.join(girlTarget, 'anims');
  ensureDir(girlTarget);
  ensureDir(animsTarget);

  const girlGlbSrc = path.join(SOURCE_BASE, 'girl/Girl+38.glb');
  if (fs.existsSync(girlGlbSrc)) {
    console.log('Packaging girl.glb with 1.65x scale...');
    const glbBuf = fs.readFileSync(girlGlbSrc);
    const jsonLen = glbBuf.readUInt32LE(12);
    const json = JSON.parse(glbBuf.slice(20, 20 + jsonLen).toString('utf8'));
    const binHeaderOffset = 20 + jsonLen;
    const binLen = glbBuf.readUInt32LE(binHeaderOffset);
    let binBuf = glbBuf.slice(binHeaderOffset + 8, binHeaderOffset + 8 + binLen);

    // Add root wrapper node with 1.65 scale to normalize height from 1.00m to 1.65m
    const originalRootNodes = [...json.scenes[0].nodes];
    const wrapperNodeIdx = json.nodes.length;
    json.nodes.push({
      name: 'ScaleWrapper',
      scale: [1.65, 1.65, 1.65],
      children: originalRootNodes,
    });
    json.scenes[0].nodes = [wrapperNodeIdx];

    const texturesDir = path.join(SOURCE_BASE, 'girl/Textures');
    const baseColorSrc = path.join(texturesDir, 'Girl 38 BaseColor.png');
    const normalSrc = path.join(texturesDir, 'Girl 38 Normal_Bake.png');
    const metallicSrc = path.join(texturesDir, 'Girl 38 metallic.PNG');
    const roughnessSrc = path.join(texturesDir, 'Girl 38 roughness.PNG');
    const pbrTextures = [];
    if (!fs.existsSync(baseColorSrc)) throw new Error(`Missing Girl base color texture: ${baseColorSrc}`);
    const baseColorBuf = fs.readFileSync(baseColorSrc);
    const basePad = (4 - (binBuf.length % 4)) % 4;
    if (basePad > 0) binBuf = Buffer.concat([binBuf, Buffer.alloc(basePad)]);
    const baseView = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: binBuf.length, byteLength: baseColorBuf.length });
    binBuf = Buffer.concat([binBuf, baseColorBuf]);
    const imageIndex = (json.images = json.images || []).push({ bufferView: baseView, mimeType: 'image/png', name: 'Girl 38 BaseColor Source' }) - 1;
    const samplerIndex = (json.samplers = json.samplers || []).length
      ? 0
      : json.samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }) - 1;
    const textureIndex = (json.textures = json.textures || []).push({ sampler: samplerIndex, source: imageIndex }) - 1;
    const baseMaterial = json.materials?.[0];
    if (baseMaterial) {
      baseMaterial.pbrMetallicRoughness = baseMaterial.pbrMetallicRoughness || {};
      baseMaterial.pbrMetallicRoughness.baseColorTexture = { index: textureIndex };
    }
    if (fs.existsSync(normalSrc)) pbrTextures.push({ name: 'Girl_Normal', file: fs.readFileSync(normalSrc), target: 'normalTexture' });
    if (fs.existsSync(metallicSrc) && fs.existsSync(roughnessSrc)) {
      pbrTextures.push({
        name: 'Girl_MetallicRoughness',
        file: await createMetallicRoughnessTexture(metallicSrc, roughnessSrc),
        target: 'metallicRoughnessTexture',
      });
    }

    for (const pbrTexture of pbrTextures) {
      const padLen = (4 - (binBuf.length % 4)) % 4;
      if (padLen > 0) binBuf = Buffer.concat([binBuf, Buffer.alloc(padLen)]);

      const nOffset = binBuf.length;
      binBuf = Buffer.concat([binBuf, pbrTexture.file]);

      const bvIdx = json.bufferViews.length;
      json.bufferViews.push({ buffer: 0, byteOffset: nOffset, byteLength: pbrTexture.file.length });

      json.images = json.images || [];
      const imgIdx = json.images.length;
      json.images.push({ bufferView: bvIdx, mimeType: 'image/png', name: pbrTexture.name });

      json.samplers = json.samplers || [];
      const samplerIdx = json.samplers.length ? 0 : json.samplers.push({ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }) - 1;

      json.textures = json.textures || [];
      const texIdx = json.textures.length;
      json.textures.push({ sampler: samplerIdx, source: imgIdx });

      if (json.materials && json.materials[0]) {
        if (pbrTexture.target === 'normalTexture') json.materials[0].normalTexture = { index: texIdx, scale: 1.0 };
        else {
          json.materials[0].pbrMetallicRoughness = json.materials[0].pbrMetallicRoughness || {};
          json.materials[0].pbrMetallicRoughness.metallicRoughnessTexture = { index: texIdx };
        }
      }
      json.buffers[0].byteLength = binBuf.length;
    }

    if (pbrTextures.length > 0) {
      if (json.materials && json.materials[0]) {
        json.materials[0].pbrMetallicRoughness.roughnessFactor = 0.5;
        json.materials[0].pbrMetallicRoughness.metallicFactor = 0.1;
      }
    }

    // Serialize
    const newJsonStr = JSON.stringify(json);
    const newJsonBuf = Buffer.from(newJsonStr, 'utf8');
    const jsonPad = (4 - (newJsonBuf.length % 4)) % 4;
    const paddedJsonBuf = jsonPad > 0 ? Buffer.concat([newJsonBuf, Buffer.alloc(jsonPad, 0x20)]) : newJsonBuf;

    const binPad = (4 - (binBuf.length % 4)) % 4;
    const paddedBinBuf = binPad > 0 ? Buffer.concat([binBuf, Buffer.alloc(binPad, 0x00)]) : binBuf;

    const totalLen = 12 + 8 + paddedJsonBuf.length + 8 + paddedBinBuf.length;
    const finalGlb = Buffer.alloc(totalLen);

    finalGlb.writeUInt32LE(0x46546C67, 0);
    finalGlb.writeUInt32LE(2, 4);
    finalGlb.writeUInt32LE(totalLen, 8);

    finalGlb.writeUInt32LE(paddedJsonBuf.length, 12);
    finalGlb.writeUInt32LE(0x4E4F534A, 16);
    paddedJsonBuf.copy(finalGlb, 20);

    const binStart = 20 + paddedJsonBuf.length;
    finalGlb.writeUInt32LE(paddedBinBuf.length, binStart);
    finalGlb.writeUInt32LE(0x004E4942, binStart + 4);
    paddedBinBuf.copy(finalGlb, binStart + 8);

    const outPath = path.join(girlTarget, 'girl.glb');
    fs.writeFileSync(outPath, finalGlb);
    console.log(`Saved ${outPath} (${(finalGlb.length / 1024 / 1024).toFixed(2)} MB)`);
  }

  // Convert FBX animations to GLB
  const fbxAnimFiles = [
    'Idle.fbx',
    'Walking.fbx',
    'Running.fbx',
    'Jumping.fbx',
    'Talking.fbx',
    'Sitting Idle.fbx',
  ];

  for (const fbxName of fbxAnimFiles) {
    const fbxPath = path.join(SOURCE_BASE, 'girl/unpacked_anims/Animations', fbxName);
    const glbOutName = fbxName.replace(/\.fbx$/i, '.glb');
    const glbOutPath = path.join(animsTarget, glbOutName);

    if (fs.existsSync(fbxPath)) {
      try {
        console.log(`Converting ${fbxName} -> ${glbOutName}...`);
        const fbxBuf = fs.readFileSync(fbxPath);
        const loader = new FBXLoader();
        const obj = loader.parse(fbxBuf.buffer.slice(fbxBuf.byteOffset, fbxBuf.byteOffset + fbxBuf.byteLength), '');
        obj.traverse((c) => {
          if (c.isMesh) c.material = new THREE.MeshBasicMaterial();
        });

        const glbBuffer = await exportToGlb(obj, { animations: obj.animations });
        fs.writeFileSync(glbOutPath, glbBuffer);
        console.log(`Saved ${glbOutPath} (${(glbBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
      } catch (err) {
        console.error(`Failed to convert ${fbxName}:`, err.message);
      }
    }
  }
}

// =========================================================================
// 3. ASIAN GIRL & KATANA INGESTION
// =========================================================================
async function ingestAsianGirl() {
  console.log('\n--- Ingesting Asian Girl ---');
  const agTarget = path.join(TARGET_BASE, 'asian_girl');
  const texturesTarget = path.join(agTarget, 'textures');
  ensureDir(agTarget);
  ensureDir(texturesTarget);

  // Copy textures
  const srcTexDir = path.join(SOURCE_BASE, 'asian girl/textures');
  if (fs.existsSync(srcTexDir)) {
    const texFiles = fs.readdirSync(srcTexDir);
    for (const f of texFiles) {
      fs.copyFileSync(path.join(srcTexDir, f), path.join(texturesTarget, f));
    }
    console.log(`Copied ${texFiles.length} textures to ${texturesTarget}`);
  }

  // Convert Katana.obj to katana.glb
  const katanaObjPath = path.join(SOURCE_BASE, 'asian girl/Katana.obj');
  const katanaGlbPath = path.join(agTarget, 'katana.glb');
  if (fs.existsSync(katanaObjPath)) {
    console.log('Converting Katana.obj to katana.glb...');
    const objText = fs.readFileSync(katanaObjPath, 'utf8');
    const loader = new OBJLoader();
    const obj = loader.parse(objText);
    obj.traverse((c) => {
      if (c.isMesh) {
        c.material = new THREE.MeshStandardMaterial({
          name: c.name || 'KatanaMat',
          roughness: 0.3,
          metalness: 0.8,
        });
      }
    });
    let glbBuffer = await exportToGlb(obj);
    glbBuffer = embedTexturesByMaterialName(glbBuffer, [
      {
        materialName: 'Holster.Scabbard',
        texturePath: path.join(srcTexDir, 'Holster_D.jpg'),
        mimeType: 'image/jpeg',
        metallicFactor: 0.1,
        roughnessFactor: 0.5,
      },
      {
        materialName: 'Katana|Holster',
        texturePath: path.join(srcTexDir, 'Katana_D.jpg'),
        mimeType: 'image/jpeg',
        metallicFactor: 0.9,
        roughnessFactor: 0.3,
      },
      {
        materialName: 'Holster.Scabbard',
        texturePath: path.join(srcTexDir, 'Holster_N.jpg'),
        mimeType: 'image/jpeg',
        normalTexture: true,
      },
      {
        materialName: 'Katana|Holster',
        texturePath: path.join(srcTexDir, 'Katana_N.jpg'),
        mimeType: 'image/jpeg',
        normalTexture: true,
      },
    ]);
    const katanaJsonLength = glbBuffer.readUInt32LE(12);
    const katanaJson = JSON.parse(glbBuffer.toString('utf8', 20, 20 + katanaJsonLength));
    const scabbardMaterial = katanaJson.materials?.find((material) => material.name?.includes('Holster.Scabbard'));
    const bladeMaterial = katanaJson.materials?.find((material) => material.name?.includes('Katana|Holster'));
    if (
      scabbardMaterial?.normalTexture?.index === undefined ||
      bladeMaterial?.normalTexture?.index === undefined
    ) {
      throw new Error('Katana normal textures were not embedded into the output GLB.');
    }
    fs.writeFileSync(katanaGlbPath, glbBuffer);
    console.log(`Saved ${katanaGlbPath} (${(glbBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
  }

  // Convert Asian+School+Girl.fbx to asian_girl.glb
  const fbxPath = path.join(SOURCE_BASE, 'asian girl/Asian+School+Girl.fbx');
  const agGlbPath = path.join(agTarget, 'asian_girl.glb');
  if (fs.existsSync(fbxPath)) {
    console.log('Converting Asian+School+Girl.fbx with 36 submeshes to GLB (this takes ~5s)...');
    const fbxBuf = fs.readFileSync(fbxPath);
    const loader = new FBXLoader();
    const obj = loader.parse(fbxBuf.buffer.slice(fbxBuf.byteOffset, fbxBuf.byteOffset + fbxBuf.byteLength), '');
    obj.traverse((c) => {
      if (!c.isMesh) return;
      const materials = (Array.isArray(c.material) ? c.material : [c.material]).map((material) => new THREE.MeshStandardMaterial({
        name: material?.name || c.name,
        color: material?.color?.clone() || new THREE.Color(1, 1, 1),
        roughness: 0.6,
        metalness: 0.1,
        transparent: material?.transparent || false,
        opacity: typeof material?.opacity === 'number' ? material.opacity : 1,
      }));
      c.material = Array.isArray(c.material) ? materials : materials[0];
    });

    const glbBuffer = await exportToGlb(obj);
    const embeddedByName = embedTexturesByMaterialName(glbBuffer, [
      {
        materialName: '24_-shuriken|2 blade.outfit b2',
        texturePath: path.join(srcTexDir, 'o-b_base.png'),
        mimeType: 'image/png',
      },
      {
        materialName: '24_-shuriken|2 blade.outfit b2',
        texturePath: path.join(srcTexDir, 'o-b_nrm.png'),
        mimeType: 'image/png',
        normalTexture: true,
      },
      {
        materialName: 'Material.002',
        texturePath: path.join(srcTexDir, 'pin accs.png'),
        mimeType: 'image/png',
      },
    ]);
    fs.writeFileSync(agGlbPath, embeddedByName);
    const resultJsonLength = embeddedByName.readUInt32LE(12);
    const resultJson = JSON.parse(embeddedByName.toString('utf8', 20, 20 + resultJsonLength));
    const shuriken = resultJson.materials?.find((material) => material.name?.includes('24_-shuriken|2 blade.outfit b2'));
    const accessories = resultJson.materials?.find((material) => material.name === 'Material.002');
    if (
      !resultJson.images?.length || resultJson.images.length < 3 ||
      shuriken?.pbrMetallicRoughness?.baseColorTexture?.index === undefined ||
      shuriken?.normalTexture?.index === undefined ||
      accessories?.pbrMetallicRoughness?.baseColorTexture?.index === undefined
    ) {
      throw new Error('Asian character FBX textures were not embedded into the output GLB.');
    }
    console.log(`Saved ${agGlbPath} with ${resultJson.images.length} embedded source/FBX images (${(embeddedByName.length / 1024 / 1024).toFixed(2)} MB)`);
  }
}

// =========================================================================
// 4. LEOVERSE STATUE INGESTION
// =========================================================================
async function ingestLeoverse() {
  console.log('\n--- Ingesting Leoverse Statue ---');
  const propsTarget = path.join(TARGET_BASE, 'props');
  ensureDir(propsTarget);

  const srcGlb = path.join(SOURCE_BASE, 'leoverse/leoverse.glb');
  const dstGlb = path.join(propsTarget, 'leoverse_statue.glb');
  if (fs.existsSync(srcGlb)) {
    fs.copyFileSync(srcGlb, dstGlb);
    console.log(`Copied ${dstGlb} (${(fs.statSync(dstGlb).size / 1024 / 1024).toFixed(2)} MB)`);
  }
}

// =========================================================================
// 5. CITIZEN PACK INGESTION (42 Valid Characters)
// =========================================================================
async function ingestCitizens() {
  console.log('\n--- Ingesting Citizen Pack (42 characters) ---');
  const citizensTarget = path.join(TARGET_BASE, 'citizens');
  const atlasesTarget = path.join(citizensTarget, 'atlases');
  const glbTarget = path.join(citizensTarget, 'glb');
  const texTarget = path.join(citizensTarget, 'textures');
  ensureDir(citizensTarget);
  ensureDir(atlasesTarget);
  ensureDir(glbTarget);
  ensureDir(texTarget);

  // Copy the 3 consolidated atlases
  const atlasNames = [
    'all_kids_Material__35_BaseColor.jpg',
    'All_Girls_Material__55_BaseColor.jpg',
    'All_Men_DefaultMaterial_BaseColor.jpg',
  ];
  for (const a of atlasNames) {
    const srcA = path.join(SOURCE_BASE, 'Result/Textures', a);
    const dstA = path.join(atlasesTarget, a);
    if (fs.existsSync(srcA)) {
      fs.copyFileSync(srcA, dstA);
      console.log(`Copied atlas: ${a}`);
    }
  }

  // Copy individual textures
  const srcTexDir = path.join(SOURCE_BASE, 'Result/Textures');
  if (fs.existsSync(srcTexDir)) {
    const files = fs.readdirSync(srcTexDir).filter((f) => f.endsWith('.jpg') || f.endsWith('.png'));
    for (const f of files) {
      fs.copyFileSync(path.join(srcTexDir, f), path.join(texTarget, f));
    }
    console.log(`Copied ${files.length} textures to ${texTarget}`);
  }

  // Parse People.obj and export each child mesh with its diffuse texture embedded
  const peopleObjPath = path.join(SOURCE_BASE, 'Result/Textures/People.obj');
  const MESH_TO_TEXTURE = {
    kid_1: 'kid_1__Texture_Color.jpg',
    kid_4: 'kid_4__Texture_Color.jpg',
    kid_5: 'kid_5__Texture_Color.jpg',
    kid_6: 'kid_6__Texture_Color.jpg',
    girl_1: 'girl_1_Texture_Color.jpg',
    girl_2: 'girl_2_Texture_Color.jpg',
    girl_4: 'girl_4_Texture_Color.jpg',
    girl_6: 'girl_6_Texture_Color.jpg',
    girl_7: 'girl_7_Texture_Color.jpg',
    girl_9: 'girl_9_Texture_Color.jpg',
    girl_10: 'girl_10__Texture_Color.jpg',
    girl_11: 'girl_11__Texture_Color.jpg',
    girl_12: 'girl_12__Texture_Color.jpg',
    girl_13: 'girl_13__Texture_Color.jpg',
    girl_14: 'girl_14__Texture_Color.jpg',
    girl_15: 'girl_15__Texture_Color.jpg',
    girl_16: 'girl_16__Texture_Color.jpg',
    man_1: 'man_1__Texture_Color.jpg',
    man_2: 'man_2__Texture_Color.jpg',
    man_3: 'man_3__Texture_Color.jpg',
    man_4: 'man_4__Texture_Color.jpg',
    man_5: 'man_5__Texture_Color.jpg',
    man_6: 'man_6__Texture_Color.jpg',
    man_7: 'man_7__Texture_Color.jpg',
    man_8: 'man_8__Texture_Color.jpg',
    man_9: 'man_9__Texture_Color.jpg',
    man_10: 'man_10___Texture_Color.jpg',
    man_11: 'man_11___Texture_Color.jpg',
    mn_1: 'mn_1_Texture_Color.jpg',
    mn_2: 'mn_2_Texture_Color.jpg',
    mn_3: 'mn_3_Texture_Color.jpg',
    mn_4: 'mn_4_Texture_Color.jpg',
    mn_k: 'mn_k_Texture_Color.jpg',
    m_3: 'm_3__Texture_Color.jpg',
    m_4: 'm_4__Texture_Color.jpg',
    q_1: 'q_1__Texture_Color.jpg',
    d_1: 'd_1__Texture_Color.jpg',
    h_1: 'h_1__Texture_Color.jpg',
    w1: 'w_1__Texture_Color.jpg',
    wgirl_3: 'wgirl_Texture_Color.jpg',
    wm_1: 'wm_1__Texture_Color.jpg',
    wm_3: 'wm_3__Texture_Color.jpg',
  };

  if (fs.existsSync(peopleObjPath)) {
    console.log('Parsing People.obj for 42 characters...');
    const text = fs.readFileSync(peopleObjPath, 'utf8');
    const loader = new OBJLoader();
    const obj = loader.parse(text);

    console.log(`Found ${obj.children.length} meshes in People.obj.`);
    if (obj.children.length !== Object.keys(MESH_TO_TEXTURE).length) {
      throw new Error(`Expected ${Object.keys(MESH_TO_TEXTURE).length} mapped citizen meshes, found ${obj.children.length}.`);
    }

    for (let i = 0; i < obj.children.length; i++) {
      const child = obj.children[i];
      const charName = child.name || `character_${i + 1}`;
      const texFileName = MESH_TO_TEXTURE[charName];
      if (!texFileName) throw new Error(`No citizen texture mapping exists for mesh '${charName}'.`);
      const texPath = path.join(SOURCE_BASE, 'Result/Textures', texFileName);
      if (!fs.existsSync(texPath)) throw new Error(`Missing citizen texture '${texFileName}' for mesh '${charName}'.`);

      const geom = child.geometry.clone();
      geom.computeBoundingBox();
      const bb = geom.boundingBox;
      if (!bb) continue;

      const cx = (bb.min.x + bb.max.x) / 2;
      const cz = (bb.min.z + bb.max.z) / 2;
      const my = bb.min.y;

      geom.translate(-cx, -my, -cz);
      geom.scale(0.001, 0.001, 0.001);

      const mat = new THREE.MeshStandardMaterial({
        name: `${charName}_Mat`,
        roughness: 0.8,
        metalness: 0.05,
      });

      const singleMesh = new THREE.Mesh(geom, mat);
      singleMesh.name = charName;

      let glbBuffer = await exportToGlb(singleMesh);

      const texBuf = fs.readFileSync(texPath);
      glbBuffer = embedTextureBuffer(glbBuffer, texBuf, 'image/jpeg');

      const outGlb = path.join(glbTarget, `${charName}.glb`);
      fs.writeFileSync(outGlb, glbBuffer);
      if (i % 10 === 0 || i === obj.children.length - 1) {
        console.log(`[${i + 1}/${obj.children.length}] Exported ${charName}.glb (${(glbBuffer.length / 1024).toFixed(1)} KB)`);
      }
    }
  }
}

// =========================================================================
// RUN ALL INGESTION PHASES
// =========================================================================
async function runAll() {
  if (!SOURCE_BASE || !fs.existsSync(SOURCE_BASE)) {
    throw new Error('Provide the quick-assets source directory via QUICK_ASSETS_SOURCE or as the first command-line argument.');
  }
  const requiredSources = [
    'boy/unpacked_glb/glb/T-Pose.glb',
    'boy/unpacked_texture/Texture.png',
    'boy/unpacked_glb/glb/Breathing Idle.glb',
    'boy/unpacked_glb/glb/Walking.glb',
    'boy/unpacked_glb/glb/Running.glb',
    'boy/unpacked_glb/glb/Sitting.glb',
    'girl/Girl+38.glb',
    'girl/Textures/Girl 38 BaseColor.png',
    'girl/Textures/Girl 38 Normal_Bake.png',
    'girl/Textures/Girl 38 metallic.PNG',
    'girl/Textures/Girl 38 roughness.PNG',
    'girl/unpacked_anims/Animations/Idle.fbx',
    'girl/unpacked_anims/Animations/Walking.fbx',
    'girl/unpacked_anims/Animations/Running.fbx',
    'girl/unpacked_anims/Animations/Jumping.fbx',
    'girl/unpacked_anims/Animations/Talking.fbx',
    'girl/unpacked_anims/Animations/Sitting Idle.fbx',
    'asian girl/Asian+School+Girl.fbx',
    'asian girl/Katana.obj',
    'asian girl/textures/o-b_base.png',
    'asian girl/textures/o-b_nrm.png',
    'asian girl/textures/pin accs.png',
    'asian girl/textures/Holster_D.jpg',
    'asian girl/textures/Holster_N.jpg',
    'asian girl/textures/Katana_D.jpg',
    'asian girl/textures/Katana_N.jpg',
    'leoverse/leoverse.glb',
    'Result/Textures/People.obj',
  ];
  const missingSources = requiredSources.filter((file) => !fs.existsSync(path.join(SOURCE_BASE, file)));
  if (missingSources.length > 0) {
    throw new Error(`Missing required source files:\n${missingSources.map((file) => `- ${file}`).join('\n')}`);
  }

  console.log('========================================================');
  console.log('Saints Gaming — Ingesting 3D Royalty-Free Humanoid Packages');
  console.log('========================================================');
  const start = Date.now();

  await ingestBoy();
  await ingestGirl();
  await ingestAsianGirl();
  await ingestLeoverse();
  await ingestCitizens();

  const sec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nAll 5 package ingestion phases completed in ${sec}s.`);
}

runAll().catch((err) => {
  console.error('\nIngestion failed:', err);
  process.exit(1);
});
