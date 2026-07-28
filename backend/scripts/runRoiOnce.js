/**
 * Standalone script to manually run the daily ROI job once, without waiting
 * for the cron schedule. Useful for testing.
 *
 * Usage:
 *   node scripts/runRoiOnce.js
 */
require('dotenv').config();
const connectDB = require('../config/db');
const { runRoiJobNow } = require('../jobs/roiCron');

(async () => {
  await connectDB();
  const result = await runRoiJobNow();
  console.log('Result:', result);
  process.exit(0);
})();
