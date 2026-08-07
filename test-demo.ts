import { ensureStudioMapFoundation } from "./src/server/DemoBootstrap";

async function run() {
  const result = await ensureStudioMapFoundation();
  console.log("Result:", result);
}
run();
