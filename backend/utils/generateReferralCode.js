const crypto = require('crypto');

/**
 * Generates a short, unique, human-friendly referral code.
 * e.g. "NX7F3A2K"
 */
function generateReferralCode(prefix = 'NX') {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${random}`;
}

module.exports = generateReferralCode;
