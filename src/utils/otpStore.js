/**
 * In-memory OTP store.
 *
 * Stores { otp, expiresAt } keyed by lowercased email.
 * OTPs expire after 5 minutes.
 * Verifying an OTP deletes it so it can't be reused.
 */

const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

const store = new Map();

/** Generate a cryptographically random 6-digit OTP string. */
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Save a fresh OTP for an email. Returns the generated OTP string. */
function createOtp(email) {
  const otp = generateOtp();
  store.set(email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + EXPIRY_MS,
  });
  return otp;
}

/**
 * Verify an OTP for an email.
 * Returns { valid: true } or { valid: false, reason: string }.
 * Deletes the entry on success so it can't be reused.
 */
function verifyOtp(email, candidate) {
  const key  = email.toLowerCase();
  const entry = store.get(key);

  if (!entry)                          return { valid: false, reason: 'Invalid code. Please request a new one.' };
  if (Date.now() > entry.expiresAt)  { store.delete(key); return { valid: false, reason: 'Invalid code. Please request a new one.' }; }
  if (entry.otp !== String(candidate)) return { valid: false, reason: 'Invalid code. Please check and try again.' };

  store.delete(key);
  return { valid: true };
}

module.exports = { createOtp, verifyOtp };
