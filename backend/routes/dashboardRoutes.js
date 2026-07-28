const express = require('express');
const {
  getDashboardSummary,
  getRoiHistory,
  getReferralIncomeHistory,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/summary', getDashboardSummary);
router.get('/roi-history', getRoiHistory);
router.get('/referral-income-history', getReferralIncomeHistory);

module.exports = router;
