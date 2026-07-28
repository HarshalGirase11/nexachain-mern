const asyncHandler = require('express-async-handler');
const Investment = require('../models/Investment');
const RoiHistory = require('../models/RoiHistory');
const ReferralIncome = require('../models/ReferralIncome');
const { startOfDay } = require('../services/roiService');

/**
 * @desc    Get summary stats for the logged-in user's dashboard
 * @route   GET /api/dashboard/summary
 * @access  Private
 */
const getDashboardSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const today = startOfDay();

  const [investmentAgg, todaysRoi, user] = await Promise.all([
    Investment.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalInvestments: { $sum: '$amount' },
          activeInvestments: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] },
          },
          investmentCount: { $sum: 1 },
        },
      },
    ]),
    RoiHistory.aggregate([
      { $match: { user: userId, date: today } },
      { $group: { _id: null, dailyRoi: { $sum: '$roiAmount' } } },
    ]),
    req.user, // already fetched by protect middleware
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalInvestments: investmentAgg[0]?.totalInvestments || 0,
      activeInvestmentCount: investmentAgg[0]?.activeInvestments || 0,
      totalInvestmentCount: investmentAgg[0]?.investmentCount || 0,
      dailyRoi: todaysRoi[0]?.dailyRoi || 0,
      totalROIEarned: user.totalROIEarned,
      totalLevelIncomeEarned: user.totalLevelIncomeEarned,
      walletBalance: user.walletBalance,
    },
  });
});

/**
 * @desc    Get ROI history for the logged-in user (paginated)
 * @route   GET /api/dashboard/roi-history?page=1&limit=20
 * @access  Private
 */
const getRoiHistory = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };

  const [records, total] = await Promise.all([
    RoiHistory.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('investment', 'plan amount')
      .lean(),
    RoiHistory.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: records,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

/**
 * @desc    Get referral/level income history for the logged-in user
 * @route   GET /api/dashboard/referral-income-history?page=1&limit=20
 * @access  Private
 */
const getReferralIncomeHistory = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = { beneficiary: req.user._id };

  const [records, total] = await Promise.all([
    ReferralIncome.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sourceUser', 'fullName email')
      .lean(),
    ReferralIncome.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: records,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

module.exports = { getDashboardSummary, getRoiHistory, getReferralIncomeHistory };
