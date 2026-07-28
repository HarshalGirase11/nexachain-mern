const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Investment amount is required'],
      min: [1, 'Investment amount must be greater than 0'],
    },
    plan: {
      name: { type: String, required: true }, // e.g. "Silver", "Gold", "Platinum"
      durationInDays: { type: Number, required: true },
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    dailyRoiPercentage: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Cancelled'],
      default: 'Active',
      index: true,
    },
    lastRoiCreditedDate: {
      // used by the cron job to avoid double-crediting ROI on the same day
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index: fast lookup of a user's active investments
investmentSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Investment', investmentSchema);
