const Investment = require('../models/Investment');
const RoiHistory = require('../models/RoiHistory');
const User = require('../models/User');
const { distributeLevelIncome } = require('./referralService');

/**
 * Normalize a date down to midnight UTC so ROI is tracked "per calendar day",
 * regardless of what time the cron job actually runs at.
 */
function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Processes daily ROI for a single active investment:
 *  1. Calculates the ROI amount for today.
 *  2. Writes a RoiHistory record (idempotent via unique index on investment+date).
 *  3. Credits the user's wallet balance + totalROIEarned.
 *  4. Triggers referral/level income distribution based on the ROI generated.
 *  5. Marks the investment Completed if it has passed its endDate.
 *
 * Idempotency: if this function is called twice for the same investment on the
 * same day, the RoiHistory unique index (investment + date) throws a duplicate
 * key error on the second attempt, which we catch and treat as "already processed" —
 * so wallet balance is never credited twice for the same day.
 */
async function processInvestmentRoi(investment, forDate = new Date()) {
  const today = startOfDay(forDate);

  if (investment.status !== 'Active') {
    return { skipped: true, reason: `Investment status is ${investment.status}` };
  }

  if (today > startOfDay(investment.endDate)) {
    // Investment period has ended - mark completed and skip ROI
    investment.status = 'Completed';
    await investment.save();
    return { skipped: true, reason: 'Investment period ended' };
  }

  const roiAmount = Number(
    ((investment.amount * investment.dailyRoiPercentage) / 100).toFixed(2)
  );

  try {
    // This insert is the idempotency guard - unique on (investment, date)
    await RoiHistory.create({
      user: investment.user,
      investment: investment._id,
      roiAmount,
      date: today,
      status: 'Credited',
    });
  } catch (err) {
    if (err.code === 11000) {
      // Already processed for this investment today - do nothing further
      return { skipped: true, reason: 'ROI already credited for today' };
    }
    throw err;
  }

  // Credit the investing user's wallet
  await User.findByIdAndUpdate(investment.user, {
    $inc: { walletBalance: roiAmount, totalROIEarned: roiAmount },
  });

  investment.lastRoiCreditedDate = today;
  await investment.save();

  // Distribute level/referral income up the chain based on this ROI payout
  await distributeLevelIncome({
    sourceUserId: investment.user,
    investmentId: investment._id,
    baseAmount: roiAmount,
  });

  return { skipped: false, roiAmount };
}

/**
 * Runs ROI processing for ALL active investments in the system.
 * Used by the daily cron job. Processes investments sequentially in batches
 * to avoid overwhelming the DB connection pool.
 */
async function processAllActiveInvestments(forDate = new Date()) {
  const BATCH_SIZE = 100;
  let processed = 0;
  let credited = 0;
  let skipped = 0;
  let failed = 0;

  const cursor = Investment.find({ status: 'Active' }).cursor();

  let batch = [];
  const runBatch = async () => {
    const results = await Promise.allSettled(
      batch.map((inv) => processInvestmentRoi(inv, forDate))
    );
    results.forEach((r) => {
      processed += 1;
      if (r.status === 'fulfilled') {
        if (r.value.skipped) skipped += 1;
        else credited += 1;
      } else {
        failed += 1;
        console.error('ROI processing failed for an investment:', r.reason);
      }
    });
    batch = [];
  };

  // eslint-disable-next-line no-restricted-syntax
  for await (const investment of cursor) {
    batch.push(investment);
    if (batch.length >= BATCH_SIZE) {
      // eslint-disable-next-line no-await-in-loop
      await runBatch();
    }
  }
  if (batch.length) await runBatch();

  return { processed, credited, skipped, failed };
}

module.exports = { processInvestmentRoi, processAllActiveInvestments, startOfDay };
