// pm2: `pm2 start ecosystem.config.cjs` rồi `pm2 save`.
// Biến môi trường nạp bằng `node --env-file=.env` (Node >= 20.6) nên pm2 không
// cần plugin dotenv nào, và .env nằm cạnh file này.
module.exports = {
  apps: [
    {
      name: 'pe-python-runner',
      script: 'dist/server.js',
      cwd: __dirname,
      node_args: '--env-file=.env',
      instances: 1, // KHÔNG tăng: bộ đếm đồng thời nằm trong bộ nhớ từng tiến trình
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      kill_timeout: 45000, // chờ các bài đang dở xong: tối đa PY_RUN_QUEUE_TIMEOUT_MS (30 s xếp hàng) + PY_RUN_TIMEOUT_MS (10 s chạy)
      max_memory_restart: '300M',
    },
  ],
};
