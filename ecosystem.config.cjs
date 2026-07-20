module.exports = {
  apps: [
    {
      name: "griffy-store-web",
      script: "src/server/public.js",
      cwd: "/var/www/griffy-store",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        APP_PORT: "3789",
      },
      max_memory_restart: "300M",
      time: true,
    },
  ],
};
