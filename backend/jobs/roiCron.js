const cron = require('node-cron');
const { processAllActiveInvestments } = require('../services/roiService');

/**
 * Schedules the daily ROI job.
 * Default: runs every day at 12:00 AM server time (configurable via CRON_SCHEDULE).
 *
 * Idempotency is enforced at the data layer (RoiHistory unique index on
 * investment+date), so even if this job is triggered twice (e.g. server
 * restarted twice in the same day, or manually re-run), ROI will NOT be
 * credited twice for the same investment on the same day.
 */
function scheduleDailyRoiJob() {
  const schedule = process.env.CRON_SCHEDULE || '0 0 * * *';

  if (process.env.ENABLE_CRON === 'false') {
    console.log('Cron job disabled via ENABLE_CRON=false');
    return;
  }

  cron.schedule(schedule, async () => {
    console.log(`[CRON] Starting daily ROI processing at ${new Date().toISOString()}`);
    try {
      const result = await processAllActiveInvestments();
      console.log('[CRON] Daily ROI processing complete:', result);
    } catch (err) {
      console.error('[CRON] Daily ROI processing failed:', err);
    }
  });

  console.log(`Daily ROI cron scheduled with pattern: "${schedule}"`);
}

/**
 * Allows manually triggering the job once (useful for testing without
 * waiting for midnight, or for an admin "run now" endpoint/script).
 */
async function runRoiJobNow() {
  console.log(`[MANUAL RUN] Starting ROI processing at ${new Date().toISOString()}`);
  const result = await processAllActiveInvestments();
  console.log('[MANUAL RUN] ROI processing complete:', result);
  return result;
}

module.exports = { scheduleDailyRoiJob, runRoiJobNow };
