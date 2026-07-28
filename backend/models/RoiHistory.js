const mongoose = require('mongoose');

const roiHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    investment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
      required: true,
      index: true,
    },
    roiAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      // calendar date (normalized to midnight) this ROI was generated for
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Credited', 'Pending', 'Failed'],
      default: 'Credited',
    },
  },
  { timestamps: true }
);

// Idempotency: one ROI record per investment per calendar day
roiHistorySchema.index({ investment: 1, date: 1 }, { unique: true });
roiHistorySchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('RoiHistory', roiHistorySchema);
