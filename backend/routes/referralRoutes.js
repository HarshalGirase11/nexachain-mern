const express = require('express');
const { fetchDirectReferrals, fetchReferralTree } = require('../controllers/referralController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/direct', fetchDirectReferrals);
router.get('/tree', fetchReferralTree);

module.exports = router;
