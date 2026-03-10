module.exports = {
  apps: [
    {
      name: 'propertypilot',
      cwd: '/home/devuser/tenantcloud/app',
      script: 'node_modules/.bin/next',
      args: 'dev --port 3006',
      env: {
        NODE_ENV: 'development',
        PORT: 3006,
      },
      // Auto-restart on crash
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      // Watch for crashes but let Next.js handle HMR
      watch: false,
      // Logging
      error_file: '/home/devuser/.pm2/logs/propertypilot-error.log',
      out_file: '/home/devuser/.pm2/logs/propertypilot-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
