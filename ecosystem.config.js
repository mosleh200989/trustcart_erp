/**
 * pm2 process definitions for TrustCart.
 *
 * These processes were previously started by hand, which meant their only
 * record was pm2's own state file on the server. If that state were ever lost,
 * the exact commands would have had to be reconstructed from memory during an
 * outage. This file is that record.
 *
 * Apply after a deploy:
 *
 *     pm2 startOrRestart ecosystem.config.js
 *     pm2 save
 *
 * `pm2 save` writes the process list to ~/.pm2/dump.pm2, which the systemd unit
 * replays on boot. Skipping it means the changes do not survive a reboot.
 *
 * ── Note on fork vs cluster ────────────────────────────────────────────────
 * Both apps run in fork mode with a single instance, deliberately.
 *
 * The backend registers @nestjs/schedule cron jobs and holds Socket.IO
 * connections. Under cluster mode every worker would run its own copy of each
 * cron — sending reminders and running reconciliation several times over — and
 * websocket connections would need sticky sessions that nginx is not currently
 * configured for. Do not raise `instances` without addressing both.
 *
 * ── Note on the other processes on this server ─────────────────────────────
 * `assalamah-api` and `assalamah-web` also run under pm2 on this VPS. They are
 * a different product living in /var/www/assalamah and are deliberately not
 * managed from this repo. Their definitions are recorded in
 * docs/operations/deployment.md so they are not lost either.
 */

const path = require('path');

const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'nest-backend',
      cwd: path.join(ROOT, 'backend'),
      script: 'dist/main.js',

      exec_mode: 'fork',
      instances: 1,

      // Restart if the process leaks past a ceiling. It normally sits around
      // 270 MB; this is a backstop, not a target.
      max_memory_restart: '768M',

      // Give up after repeated instant crashes rather than restarting forever
      // — usually it means a bad build or a missing environment variable.
      autorestart: true,
      min_uptime: '30s',
      max_restarts: 10,
      restart_delay: 2000,

      env: {
        NODE_ENV: 'production',
        // PORT and every credential come from backend/.env, which pm2 does not
        // read. The app loads it itself via @nestjs/config.
      },

      time: true, // timestamp log lines
      merge_logs: true,
    },

    {
      name: 'next-frontend',
      cwd: path.join(ROOT, 'frontend'),

      // `npm start` runs `next start`. Invoking npm rather than next directly
      // matches how this has always run; changing it is not worth the risk.
      script: 'npm',
      args: 'start',

      exec_mode: 'fork',
      instances: 1,

      max_memory_restart: '512M',

      autorestart: true,
      min_uptime: '30s',
      max_restarts: 10,
      restart_delay: 2000,

      env: {
        NODE_ENV: 'production',
      },

      time: true,
      merge_logs: true,
    },
  ],
};
