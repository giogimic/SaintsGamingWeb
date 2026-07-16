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
  ],
};
