import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getAnimationProfile, resolveAnimationClipPath } from './animationProfiles';

const PUBLIC_ROOT = path.resolve(process.cwd(), 'public');
const HUMANOID_ROOT = path.join(PUBLIC_ROOT, 'game-assets/models/humanoids');

function readGlbJson(relativePath: string): any {
  const bytes = fs.readFileSync(path.join(PUBLIC_ROOT, relativePath));
  let offset = 12;
  while (offset < bytes.length) {
	const chunkLength = bytes.readUInt32LE(offset);
	const chunkType = bytes.readUInt32LE(offset + 4);
	if (chunkType === 0x4e4f534a) {
	  return JSON.parse(bytes.toString('utf8', offset + 8, offset + 8 + chunkLength));
	}
	offset += 8 + chunkLength;
  }
  throw new Error(`Missing JSON chunk in ${relativePath}`);
}

describe('bundled humanoid asset coverage', () => {
  it('includes one skinned Boy and Girl model and links all registered native clips', () => {
	const models = [
	  ['boy/boy.glb', 'boy_native'],
	  ['girl/girl.glb', 'girl_native'],
	] as const;

	for (const [modelPath, profileId] of models) {
	  const model = readGlbJson(`game-assets/models/humanoids/${modelPath}`);
	  expect(model.skins?.length, modelPath).toBeGreaterThan(0);

	  const profile = getAnimationProfile(profileId)!;
	  for (const clip of profile.availableClips) {
		const mapped = Object.values(profile.slotMap).find((entry) => entry?.clip === clip);
		expect(mapped, `${profileId} missing slot for ${clip}`).toBeDefined();
		const url = resolveAnimationClipPath(profile.basePath, mapped!.clip);
		expect(fs.existsSync(path.join(PUBLIC_ROOT, decodeURIComponent(url.replace(/^\//, '')))), url).toBe(true);
		expect(readGlbJson(url.replace(/^\//, '').replace(/%20/g, ' ')).animations?.length, url).toBeGreaterThan(0);
	  }
	}
  });

  it('keeps the 42 Result characters as individual uniquely textured canonical GLBs', () => {
	const modelsDir = path.join(HUMANOID_ROOT, 'citizens/glb');
	const texturesDir = path.join(HUMANOID_ROOT, 'citizens/textures');
	const models = fs.readdirSync(modelsDir).filter((name) => name.endsWith('.glb'));
	const textures = fs.readdirSync(texturesDir).filter((name) => /_Texture_Color\.jpg$/i.test(name));

	expect(models).toHaveLength(42);
	expect(textures).toHaveLength(42);
	expect(new Set(models.map((name) => name.toLowerCase())).size).toBe(42);
	expect(new Set(textures.map((name) => name.toLowerCase())).size).toBe(42);

	for (const modelFile of models) {
	  const modelId = modelFile.replace(/\.glb$/i, '');
	  const glb = readGlbJson(`game-assets/models/humanoids/citizens/glb/${modelFile}`);
	  expect(glb.images?.length, modelFile).toBe(1);
	  expect(glb.textures?.length, modelFile).toBe(1);
	  expect(glb.materials?.some((material: any) => material.pbrMetallicRoughness?.baseColorTexture?.index === 0), modelFile).toBe(true);
		const imageName = String(glb.images[0].name || '').toLowerCase();
	  expect(imageName, modelFile).toBe('diffusetexture');
		expect(modelFile.replace(/\.glb$/i, '').toLowerCase()).toBe(modelId.toLowerCase());
	}
  });

  it('keeps source-backed Asian Girl textures beside the model without advertising unavailable animations', () => {
	const asianGirl = readGlbJson('game-assets/models/humanoids/asian_girl/asian_girl.glb');
	const textureDir = path.join(HUMANOID_ROOT, 'asian_girl/textures');
	const textureFiles = new Set(fs.readdirSync(textureDir));
	const sourceMaterialMap = new Map<string, { base?: string; normal?: string; alpha?: string; alphaMode?: string }>([
	  ['4_Arms_0.1_0_0.005', { base: 'LING G8F_G8F ARM_1_D02.jpg' }],
	  ['4_Face_0.1_0_0.001', { base: 'LING G8F_G8F FACE_1_D02.png' }],
	  ['4_Legs_0.1_0_0.005', { base: 'LING G8F_G8F LEG_1_D02.jpg' }],
	  ['4_Body_0.1_0_0', { base: 'Body.png' }],
	  ['4_+Shirt.1_0.1_0_0', { base: 'Denim_Base 2.png', normal: 'Denim_N.jpg', alpha: 'Denim_Base 2.png', alphaMode: 'BLEND' }],
	  ['6_Eyelashes_0.1_0_0', { base: 'EYELASH.png', alpha: 'EYELASH.png', alphaMode: 'BLEND' }],
	  ['4_+Skirt.1_0.1_0_0', { base: 'Denim_Base.jpg' }],
	  ['4_+Shoes_0.1_0_0.002', { base: 'sneakers_shoes_colorout.jpg', normal: 'sneakers_shoes_normalout.jpg' }],
	]);

	expect(asianGirl.skins?.length).toBeGreaterThan(0);
	expect(asianGirl.animations || []).toHaveLength(0);
	expect([...textureFiles].filter((name) => /\.(png|jpe?g)$/i.test(name))).toHaveLength(47);
	expect(asianGirl.images).toHaveLength(43);
	expect(asianGirl.images?.filter((image: any) => image.uri)).toHaveLength(40);
	for (const image of asianGirl.images || []) {
	  if (image.uri) {
		const relativePath = decodeURIComponent(image.uri).replace(/\\/g, '/');
		expect(fs.existsSync(path.join(HUMANOID_ROOT, 'asian_girl', relativePath)), image.uri).toBe(true);
	  }
	}
	for (const material of asianGirl.materials || []) {
	  const colorTexture = material.pbrMetallicRoughness?.baseColorTexture;
	  const normalTexture = material.normalTexture;
	  if (colorTexture) expect(asianGirl.textures?.[colorTexture.index]).toBeDefined();
	  if (normalTexture) expect(asianGirl.textures?.[normalTexture.index]).toBeDefined();
	}
	for (const [materialName, expected] of sourceMaterialMap) {
	  const material = asianGirl.materials?.find((entry: any) => entry.name === materialName);
	  expect(material, materialName).toBeDefined();
	  for (const [slot, filename] of [['baseColorTexture', expected.base], ['normalTexture', expected.normal]] as const) {
		if (!filename) continue;
		const textureInfo = slot === 'baseColorTexture'
		  ? material.pbrMetallicRoughness?.baseColorTexture
		  : material.normalTexture;
		const texture = asianGirl.textures?.[textureInfo?.index ?? -1];
		const image = texture && asianGirl.images?.[texture.source];
		expect(image?.name, `${materialName} ${slot}`).toBe(filename);
	  }
	  if (expected.alphaMode) expect(material.alphaMode, materialName).toBe(expected.alphaMode);
	}
	expect(asianGirl.materials?.filter((material: any) => material.pbrMetallicRoughness?.baseColorTexture || material.normalTexture)).toHaveLength(43);
	expect(fs.existsSync(path.join(HUMANOID_ROOT, 'asian_girl/katana.glb'))).toBe(true);
  });

  it('keeps Red Runner as the exact static source prop with PBR maps, not a playable rig', () => {
	const prop = readGlbJson('game-assets/models/humanoids/props/leoverse_statue.glb');
	expect(prop.skins || []).toHaveLength(0);
	expect(prop.animations || []).toHaveLength(0);
	expect(prop.extensionsUsed).toContain('EXT_texture_webp');
	expect(prop.materials?.[0]?.normalTexture).toBeDefined();
	expect(prop.materials?.[0]?.pbrMetallicRoughness?.baseColorTexture).toBeDefined();
	expect(prop.materials?.[0]?.pbrMetallicRoughness?.metallicRoughnessTexture).toBeDefined();
  });
});