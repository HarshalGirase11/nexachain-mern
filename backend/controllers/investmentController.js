const asyncHandler = require('express-async-handler');
const Investment = require('../models/Investment');

/**
 * @desc    Create a new investment for the logged-in user
 * @route   POST /api/investments
 * @access  Private
 * body: { amount, planName, durationInDays, dailyRoiPercentage? }
 */
const createInvestment = asyncHandler(async (req, res) => {
  const { amount, planName, durationInDays, dailyRoiPercentage } = req.body;

  if (!amount || !planName || !durationInDays) {
    res.status(400);
    throw new Error('Please provide amount, planName and durationInDays');
  }

  if (amount <= 0) {
    res.status(400);
    throw new Error('Investment amount must be greater than 0');
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Number(durationInDays));

  const investment = await Investment.create({
    user: req.user._id,
    amount,
    plan: { name: planName, durationInDays },
    startDate,
    endDate,
    dailyRoiPercentage:
      dailyRoiPercentage ?? Number(process.env.DEFAULT_DAILY_ROI_PERCENT || 1),
    status: 'Active',
  });

  res.status(201).json({ success: true, data: investment });
});

/**
 * @desc    Get all investments for the logged-in user (paginated)
 * @route   GET /api/investments?page=1&limit=10&status=Active
 * @access  Private
 */
const getMyInvestments = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [investments, total] = await Promise.all([
    Investment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Investment.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: investments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

module.exports = { createInvestment, getMyInvestments };
