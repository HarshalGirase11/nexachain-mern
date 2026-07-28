const express = require('express');
const { createInvestment, getMyInvestments } = require('../controllers/investmentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // all investment routes are private

router.post('/', createInvestment);
router.get('/', getMyInvestments);

module.exports = router;
