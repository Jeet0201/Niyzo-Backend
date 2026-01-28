/**
 * BACKEND VALIDATION MIDDLEWARE & UTILITIES
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Server-side validation for contact field (email or mobile)
 * Use as Express middleware or in route handlers
 * 
 * Usage as middleware:
 *   app.post('/api/questions', validateContactField, async (req, res) => { ... })
 * 
 * Usage in handler:
 *   const validation = validateContactInput(req.body.contact);
 *   if (!validation.isValid) return res.status(400).json(validation);
 */

/**
 * Validate if input is a valid email
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate if input is a valid Indian mobile number
 * @param {string} mobile - Can contain formatting
 * @returns {boolean}
 */
function isValidMobileNumber(mobile) {
  if (!mobile || typeof mobile !== 'string') return false;

  const digitsOnly = mobile.replace(/\D/g, '');

  if (digitsOnly.length !== 10) return false;

  if (isFakeMobileNumber(digitsOnly)) {
    return false;
  }

  return true;
}

/**
 * Detect fake/invalid mobile numbers
 * @param {string} digitsOnly - 10-digit string
 * @returns {boolean} - true if FAKE
 */
function isFakeMobileNumber(digitsOnly) {
  if (!digitsOnly || digitsOnly.length !== 10) return true;

  // All same digit
  if (/^(.)\1{9}$/.test(digitsOnly)) {
    return true;
  }

  // Sequential ascending
  if (isSequentialAscending(digitsOnly)) {
    return true;
  }

  // Sequential descending
  if (isSequentialDescending(digitsOnly)) {
    return true;
  }

  // Repeating pairs
  if (/^(..)(\1){4}$/.test(digitsOnly)) {
    return true;
  }

  // Repeating triples
  if (/^(...)(\1){3}$/.test(digitsOnly)) {
    return true;
  }

  return false;
}

/**
 * Check if digits are sequential ascending
 * @param {string} digitsOnly
 * @returns {boolean}
 */
function isSequentialAscending(digitsOnly) {
  for (let i = 0; i < digitsOnly.length - 1; i++) {
    const current = parseInt(digitsOnly[i]);
    const next = parseInt(digitsOnly[i + 1]);
    const expectedNext = (current + 1) % 10;
    if (next !== expectedNext) {
      return false;
    }
  }
  return true;
}

/**
 * Check if digits are sequential descending
 * @param {string} digitsOnly
 * @returns {boolean}
 */
function isSequentialDescending(digitsOnly) {
  for (let i = 0; i < digitsOnly.length - 1; i++) {
    const current = parseInt(digitsOnly[i]);
    const next = parseInt(digitsOnly[i + 1]);
    const expectedNext = current === 0 ? 9 : current - 1;
    if (next !== expectedNext) {
      return false;
    }
  }
  return true;
}

/**
 * MAIN VALIDATION FUNCTION
 * Validates contact field (email or mobile)
 * 
 * @param {string} contact - Email or mobile number
 * @returns {Object} {
 *   isValid: boolean,
 *   type: 'email' | 'mobile' | 'invalid',
 *   value: string | null,
 *   error: string | null
 * }
 */
function validateContact(contact) {
  if (!contact || typeof contact !== 'string') {
    return {
      isValid: false,
      type: 'invalid',
      value: null,
      error: 'Contact information is required'
    };
  }

  const trimmed = contact.trim();

  // Check if it looks like email
  if (trimmed.includes('@')) {
    if (isValidEmail(trimmed)) {
      return {
        isValid: true,
        type: 'email',
        value: trimmed.toLowerCase(),
        error: null
      };
    } else {
      return {
        isValid: false,
        type: 'email',
        value: null,
        error: 'Invalid email format. Use: example@domain.com'
      };
    }
  }

  // Validate as mobile
  if (isValidMobileNumber(trimmed)) {
    const digitsOnly = trimmed.replace(/\D/g, '');
    return {
      isValid: true,
      type: 'mobile',
      value: digitsOnly,
      error: null
    };
  } else {
    const digitsOnly = trimmed.replace(/\D/g, '');

    if (digitsOnly.length === 0) {
      return {
        isValid: false,
        type: 'mobile',
        value: null,
        error: 'Please enter a valid email or 10-digit mobile number'
      };
    }

    if (digitsOnly.length !== 10) {
      return {
        isValid: false,
        type: 'mobile',
        value: null,
        error: `Mobile number must be exactly 10 digits (you entered ${digitsOnly.length})`
      };
    }

    if (/^(.)\1{9}$/.test(digitsOnly)) {
      return {
        isValid: false,
        type: 'mobile',
        value: null,
        error: 'Mobile number cannot have all same digits'
      };
    }

    if (isSequentialAscending(digitsOnly) || isSequentialDescending(digitsOnly)) {
      return {
        isValid: false,
        type: 'mobile',
        value: null,
        error: 'Mobile number cannot be sequential'
      };
    }

    return {
      isValid: false,
      type: 'mobile',
      value: null,
      error: 'Please enter a valid email or 10-digit mobile number'
    };
  }
}

/**
 * EXPRESS MIDDLEWARE: Validate contact field in request body
 * Usage: app.post('/api/route', validateContactField, handler)
 * 
 * Expects: req.body.contact
 * Rejects: Invalid contact with 400 status
 */
function validateContactField(req, res, next) {
  const contact = req.body?.contact;

  if (!contact) {
    return res.status(400).json({
      message: 'Contact information is required',
      error: 'MISSING_CONTACT'
    });
  }

  const validation = validateContact(contact);

  if (!validation.isValid) {
    return res.status(400).json({
      message: validation.error || 'Invalid contact information',
      error: 'INVALID_CONTACT',
      type: validation.type
    });
  }

  // Attach validated and normalized value to request
  req.body.contact = validation.value;
  req.body.contactType = validation.type;

  next();
}

/**
 * MIDDLEWARE: Alternative validation function to use in handlers
 * Returns validation result without sending response
 * 
 * Usage:
 *   const validation = validateContactInput(req.body.contact);
 *   if (!validation.isValid) {
 *     return res.status(400).json({ error: validation.error });
 *   }
 *   // Use validation.value (normalized)
 */
function validateContactInput(contact) {
  return validateContact(contact);
}

module.exports = {
  validateContact,
  validateContactField,
  validateContactInput,
  isValidEmail,
  isValidMobileNumber,
  isFakeMobileNumber
};
