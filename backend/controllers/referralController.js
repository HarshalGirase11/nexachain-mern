const asyncHandler = require('express-async-handler');
const { getDirectReferrals, getReferralTree } = require('../services/referralService');

/**
 * @desc    Get the logged-in user's direct (level 1) referrals
 * @route   GET /api/referrals/direct
 * @access  Private
 */
const fetchDirectReferrals = asyncHandler(async (req, res) => {
  const referrals = await getDirectReferrals(req.user._id);
  res.status(200).json({ success: true, count: referrals.length, data: referrals });
});

/**
 * @desc    Get the logged-in user's complete referral tree (nested)
 * @route   GET /api/referrals/tree
 * @access  Private
 */
const fetchReferralTree = asyncHandler(async (req, res) => {
  const tree = await getReferralTree(req.user._id);
  res.status(200).json({ success: true, data: tree });
});

module.exports = { fetchDirectReferrals, fetchReferralTree };
