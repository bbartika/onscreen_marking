// In-memory OTP store
const otpStore = new Map();

/**
 * Save OTP with expiry
 */
export const saveOtp = (email, otpHash, ttlMs) => {
  const expiresAt = Date.now() + ttlMs;

  otpStore.set(email, { otpHash, expiresAt });

  // Auto cleanup after expiry
  setTimeout(() => {
    otpStore.delete(email);
  }, ttlMs);
};

/**
 * Get stored OTP
 */
export const getOtp = (email) => {
  return otpStore.get(email);
};

/**
 * Delete OTP after successful verification
 */
export const deleteOtp = (email) => {
  otpStore.delete(email);
};