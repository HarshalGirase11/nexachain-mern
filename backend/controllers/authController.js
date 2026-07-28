const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateReferralCode = require('../utils/generateReferralCode');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 * body: { fullName, email, mobileNumber, password, referralCode? }
 */
const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, mobileNumber, password, referralCode } = req.body;

  if (!fullName || !email || !mobileNumber || !password) {
    res.status(400);
    throw new Error('Please provide fullName, email, mobileNumber and password');
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { mobileNumber }],
  });

  if (existingUser) {
    res.status(400);
    throw new Error('User already exists with this email or mobile number');
  }

  // Resolve the referring (parent) user, if a referral code was supplied
  let referredBy = null;
  if (referralCode) {
    const parentUser = await User.findOne({ referralCode });
    if (!parentUser) {
      res.status(400);
      throw new Error('Invalid referral code');
    }
    referredBy = parentUser._id;
  }

  // Generate a unique referral code for the new user (retry on rare collision)
  let newReferralCode;
  let isUnique = false;
  while (!isUnique) {
    newReferralCode = generateReferralCode();
    // eslint-disable-next-line no-await-in-loop
    const clash = await User.findOne({ referralCode: newReferralCode });
    if (!clash) isUnique = true;
  }

  const user = await User.create({
    fullName,
    email,
    mobileNumber,
    password,
    referralCode: newReferralCode,
    referredBy,
  });

  res.status(201).json({
    success: true,
    data: {
      user,
      token: generateToken(user._id),
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 * body: { email, password }
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (user.accountStatus !== 'active') {
    res.status(403);
    throw new Error('Account is not active. Please contact support.');
  }

  res.status(200).json({
    success: true,
    data: {
      user,
      token: generateToken(user._id),
    },
  });
});

/**
 * @desc    Get logged-in user's profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

module.exports = { registerUser, loginUser, getMe };
