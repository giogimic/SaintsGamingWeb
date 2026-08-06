/**
 * PM2 process file — single custom server (Next + Socket.io + GameEngine).
 * Do not run plain `next start` or legacy game-server.js; both break lobby
 * (/socket.io 404, empty maps / grass-only world).
 */
module.exports = {
  apps: [
    {
      name: "saints-gaming-web",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "server.ts",
      // One process owns Socket.io + GameEngine. Scale horizontally only with REDIS_URL.
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
