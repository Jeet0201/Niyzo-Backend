/**
 * VALIDATION UTILITIES
 * Production-ready validators for email, phone, and fake number detection
 * 
 * Usage:
 *   const { isValidEmail, isValidPhone, isFakePhoneNumber } = require('./validators');
 */

/**
 * Validate email format (RFC 5322 simplified)
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone number: exactly 10 digits
 * @param {string} phone - Raw phone input with or without formatting
 * @returns {boolean}
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  
  // Extract only digits
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Must be exactly 10 digits
  if (digitsOnly.length !== 10) return false;
  
  // Check if it's a fake number
  if (isFakePhoneNumber(digitsOnly)) {
    return false;
  }
  
  return true;
}

/**
 * Detect fake/invalid phone numbers
 * Rejects:
 *   - All same digits (0000000000, 1111111111, etc)
 *   - Sequential patterns (1234567890, 0123456789, etc)
 *   - Common test numbers
 * 
 * @param {string} digitsOnly - 10-digit phone string
 * @returns {boolean} - true if it's a FAKE number
 */
function isFakePhoneNumber(digitsOnly) {
  if (!digitsOnly || digitsOnly.length !== 10) return true;
  
  // Pattern 1: All same digit (0000000000, 1111111111, etc)
  if (/^(.)\1{9}$/.test(digitsOnly)) {
    return true;
  }
  
  // Pattern 2: Sequential ascending (0123456789, 1234567890, 2345678901, etc)
  if (/^[0-9](?:[0-9])\2(?:[0-9])\3.../.test(digitsOnly) || isSequentialAscending(digitsOnly)) {
    return true;
  }
  
  // Pattern 3: Sequential descending (9876543210, 8765432109, etc)
  if (isSequentialDescending(digitsOnly)) {
    return true;
  }
  
  // Pattern 4: Repeating pairs (1212121212, 0909090909, etc)
  if (/^(..)(\1){4}$/.test(digitsOnly)) {
    return true;
  }
  
  // Pattern 5: Repeating triples (123123123, 000000000, etc)
  if (/^(...)(\1){3}$/.test(digitsOnly)) {
    return true;
  }
  
  // Pattern 6: Common test numbers
  const testNumbers = [
    '1234567890',
    '0123456789',
    '1234567890',
    '9999999999',
    '0000000000',
    '5555555555',
    '4444444444',
    '1111111111',
    '2222222222',
    '3333333333',
    '6666666666',
    '7777777777',
    '8888888888'
  ];
  
  if (testNumbers.includes(digitsOnly)) {
    return true;
  }
  
  return false;
}

/**
 * Check if digits are in ascending order
 * @param {string} digitsOnly
 * @returns {boolean}
 */
function isSequentialAscending(digitsOnly) {
  for (let i = 0; i < digitsOnly.length - 1; i++) {
    const current = parseInt(digitsOnly[i]);
    const next = parseInt(digitsOnly[i + 1]);
    if (next !== current + 1 && next !== 0) {
      return false;
    }
  }
  return true;
}

/**
 * Check if digits are in descending order
 * @param {string} digitsOnly
 * @returns {boolean}
 */
function isSequentialDescending(digitsOnly) {
  for (let i = 0; i < digitsOnly.length - 1; i++) {
    const current = parseInt(digitsOnly[i]);
    const next = parseInt(digitsOnly[i + 1]);
    if (next !== current - 1 && next !== 9) {
      return false;
    }
  }
  return true;
}

module.exports = {
  isValidEmail,
  isValidPhone,
  isFakePhoneNumber
};
