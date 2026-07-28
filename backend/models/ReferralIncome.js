const mongoose = require('mongoose');

const referralIncomeSchema = new mongoose.Schema(
  {
    beneficiary: {
      // user who RECEIVES the income
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sourceUser: {
      // user who GENERATED the income (the one who invested)
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sourceInvestment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
      required: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
    },
    incomeAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

referralIncomeSchema.index({ beneficiary: 1, date: -1 });
// Prevent crediting the same investment+level+beneficiary twice
referralIncomeSchema.index(
  { beneficiary: 1, sourceInvestment: 1, level: 1 },
  { unique: true }
);

module.exports = mongoose.model('ReferralIncome', referralIncomeSchema);
