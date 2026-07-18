module.exports = {
  apps: [
    {
      name: "saints-gaming-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: "max", // Run across all CPU cores
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "saints-gaming-mmo",
      script: "game-server.js",
      instances: 1, // WebSockets need to be on a single instance unless using Redis adapter
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
