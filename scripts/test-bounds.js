import * as BABYLON from "@babylonjs/core";

const engine = new BABYLON.NullEngine();
const scene = new BABYLON.Scene(engine);

const mesh = BABYLON.MeshBuilder.CreateBox("box", {size: 1000}, scene);
mesh.position.y = 500; // bottom is at 0, top at 1000

const modelWrapper = new BABYLON.TransformNode("wrapper", scene);
mesh.parent = modelWrapper;

modelWrapper.scaling = new BABYLON.Vector3(0.003, 0.003, 0.003);

// Emulate EntityRenderer logic
modelWrapper.computeWorldMatrix(true);
mesh.computeWorldMatrix(true);
mesh.refreshBoundingInfo({ applySkeleton: true });

const bi = mesh.getBoundingInfo();
console.log("MinY:", bi.boundingBox.minimumWorld.y);
console.log("MaxY:", bi.boundingBox.maximumWorld.y);

// Wait! Does getChildMeshes include the root?
const allMeshes = modelWrapper.getChildMeshes(false);
let localMaxY = 0;
allMeshes.forEach(m => {
  m.computeWorldMatrix(true);
  if (m.refreshBoundingInfo) m.refreshBoundingInfo();
  const box = m.getBoundingInfo().boundingBox;
  console.log("Child MaxY:", box.maximumWorld.y, "MinY:", box.minimumWorld.y);
});
