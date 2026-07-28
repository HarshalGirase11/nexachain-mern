const User = require('../models/User');
const ReferralIncome = require('../models/ReferralIncome');

// e.g. "10,5,3,2,1" -> [10, 5, 3, 2, 1]  (percentage per level)
const LEVEL_PERCENTAGES = (process.env.LEVEL_INCOME_PERCENTAGES || '10,5,3,2,1')
  .split(',')
  .map((v) => parseFloat(v.trim()));

const MAX_LEVELS = parseInt(process.env.MAX_REFERRAL_LEVELS || `${LEVEL_PERCENTAGES.length}`, 10);

/**
 * Distributes level/referral income up the referral chain whenever a user's
 * investment generates ROI (or, equivalently, when an investment is created —
 * this project distributes level income based on the investment amount).
 *
 * Traverses the referral hierarchy starting from the investing user's parent,
 * crediting each ancestor according to the configured percentage for their level,
 * up to MAX_LEVELS deep or until the chain runs out.
 *
 * Idempotency: ReferralIncome has a unique index on
 * (beneficiary, sourceInvestment, level) so re-running this for the same
 * investment will not double-credit — duplicate inserts are caught and skipped.
 *
 * @param {Object} params
 * @param {String} params.sourceUserId   - the user who generated the income (invested)
 * @param {String} params.investmentId   - the investment that generated the income
 * @param {Number} params.baseAmount     - the amount level income is calculated from (e.g. ROI amount or investment amount)
 */
async function distributeLevelIncome({ sourceUserId, investmentId, baseAmount }) {
  let currentUser = await User.findById(sourceUserId).select('referredBy');
  let level = 1;
  const results = [];

  while (currentUser && currentUser.referredBy && level <= MAX_LEVELS) {
    const percentage = LEVEL_PERCENTAGES[level - 1];
    if (percentage === undefined) break;

    const beneficiaryId = currentUser.referredBy;
    const incomeAmount = Number(((baseAmount * percentage) / 100).toFixed(2));

    if (incomeAmount > 0) {
      try {
        const record = await ReferralIncome.create({
          beneficiary: beneficiaryId,
          sourceUser: sourceUserId,
          sourceInvestment: investmentId,
          level,
          incomeAmount,
        });

        await User.findByIdAndUpdate(beneficiaryId, {
          $inc: {
            walletBalance: incomeAmount,
            totalLevelIncomeEarned: incomeAmount,
          },
        });

        results.push(record);
      } catch (err) {
        // Duplicate key (11000) means this level income was already credited
        // for this investment — safe to skip (idempotency guard).
        if (err.code !== 11000) throw err;
      }
    }

    // Move up the chain
    // eslint-disable-next-line no-await-in-loop
    currentUser = await User.findById(beneficiaryId).select('referredBy');
    level += 1;
  }

  return results;
}

/**
 * Fetch a user's direct (level 1) referrals.
 */
async function getDirectReferrals(userId) {
  return User.find({ referredBy: userId }).select(
    'fullName email mobileNumber walletBalance accountStatus createdAt'
  );
}

/**
 * Recursively build the complete referral tree under a user.
 * NOTE: for very large/deep networks in production, prefer an aggregation
 * pipeline with $graphLookup instead of recursive queries.
 */
async function getReferralTree(userId, maxDepth = MAX_LEVELS) {
  async function buildNode(id, depth) {
    if (depth > maxDepth) return [];

    const children = await User.find({ referredBy: id }).select(
      'fullName email mobileNumber walletBalance createdAt'
    );

    return Promise.all(
      children.map(async (child) => ({
        _id: child._id,
        fullName: child.fullName,
        email: child.email,
        mobileNumber: child.mobileNumber,
        walletBalance: child.walletBalance,
        joinedAt: child.createdAt,
        children: await buildNode(child._id, depth + 1),
      }))
    );
  }

  return buildNode(userId, 1);
}

module.exports = { distributeLevelIncome, getDirectReferrals, getReferralTree };
