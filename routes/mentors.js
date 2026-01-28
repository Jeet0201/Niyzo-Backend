/**
 * CORRECTED MENTOR CRUD ROUTES
 * 
 * Key fixes:
 * 1. Proper email validation with required field
 * 2. Comprehensive error handling for duplicate key errors
 * 3. await keyword on all MongoDB operations
 * 4. Proper HTTP status codes
 * 5. Input sanitization and validation
 */

const express = require('express');
const router = express.Router();
const Mentor = require('../models/Mentor'); // Mongoose model
const requireAuth = require('../middleware/requireAuth'); // Auth middleware

// Helper function to handle duplicate key errors
const handleDuplicateKeyError = (error) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    return new Error(`${field} "${value}" is already registered. Please use a different email.`);
  }
  return error;
};

/**
 * CREATE a new mentor
 * POST /api/mentors
 * 
 * Required fields: name, subject, email
 * Optional fields: university, status, password
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, subject, email, password, university = 'Not specified', status = 'Available' } = req.body;

    // ← FIX #1: Validate all required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        message: 'Name is required and cannot be empty' 
      });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ 
        message: 'Subject is required and cannot be empty' 
      });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ 
        message: 'Email is required' 
      });
    }

    // ← FIX #2: Validate email format
    const emailRegex = /.+@.+\..+/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Please provide a valid email address' 
      });
    }

    // ← FIX #3: Ensure password exists
    if (!password || !password.trim()) {
      return res.status(400).json({ 
        message: 'Password is required' 
      });
    }

    // ← FIX #4: Calculate initials
    const initials = name
      .split(' ')
      .map(word => word[0]?.toUpperCase())
      .filter(Boolean)
      .join('');

    // ← FIX #5: Use await - this is crucial!
    const mentor = await Mentor.create({
      name: name.trim(),
      subject: subject.trim(),
      email: email.trim().toLowerCase(),
      password, // In production, hash this with bcrypt!
      university: university.trim(),
      status,
      initials
    });

    // ← FIX #6: Return the created document with 201 status
    res.status(201).json({ 
      message: 'Mentor created successfully',
      user: {
        id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        subject: mentor.subject,
        university: mentor.university,
        status: mentor.status,
        initials: mentor.initials
      }
    });
  } catch (error) {
    // ← FIX #7: Comprehensive error handling
    const handledError = handleDuplicateKeyError(error);
    console.error('Create mentor error:', handledError.message);
    
    res.status(500).json({ 
      message: handledError.message || 'Failed to create mentor'
    });
  }
});

/**
 * UPDATE a mentor by ID
 * PATCH /api/mentors/:id
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};

    // ← FIX #1: Validate MongoDB ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: 'Invalid mentor ID' 
      });
    }

    // ← FIX #2: Prevent updating email without validation
    if (patch.email) {
      const emailRegex = /.+@.+\..+/;
      if (!emailRegex.test(patch.email)) {
        return res.status(400).json({ 
          message: 'Invalid email format' 
        });
      }
      patch.email = patch.email.trim().toLowerCase();
    }

    // ← FIX #3: Recalculate initials if name changes
    if (patch.name) {
      patch.name = patch.name.trim();
      patch.initials = patch.name
        .split(' ')
        .map(word => word[0]?.toUpperCase())
        .filter(Boolean)
        .join('');
    }

    // ← FIX #4: Use await and { new: true }
    const mentor = await Mentor.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true }  // ← runValidators ensures schema validation
    ).lean();

    if (!mentor) {
      return res.status(404).json({ 
        message: 'Mentor not found' 
      });
    }

    // ← FIX #5: Return updated mentor
    res.json({ 
      message: 'Mentor updated successfully',
      user: mentor
    });
  } catch (error) {
    const handledError = handleDuplicateKeyError(error);
    console.error('Update mentor error:', handledError.message);
    
    res.status(500).json({ 
      message: handledError.message || 'Failed to update mentor'
    });
  }
});

/**
 * GET all mentors
 * GET /api/mentors
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // ← FIX: Use await
    const mentors = await Mentor.find({})
      .select('-password')  // Don't expose passwords
      .sort({ name: 1 })
      .lean();

    res.json(mentors);
  } catch (error) {
    console.error('Get mentors error:', error.message);
    res.status(500).json({ 
      message: 'Failed to load mentors' 
    });
  }
});

/**
 * GET a single mentor
 * GET /api/mentors/:id
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // ← FIX: Validate MongoDB ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: 'Invalid mentor ID' 
      });
    }

    // ← FIX: Use await
    const mentor = await Mentor.findById(id)
      .select('-password')
      .lean();

    if (!mentor) {
      return res.status(404).json({ 
        message: 'Mentor not found' 
      });
    }

    res.json(mentor);
  } catch (error) {
    console.error('Get mentor error:', error.message);
    res.status(500).json({ 
      message: 'Failed to load mentor' 
    });
  }
});

/**
 * DELETE a mentor
 * DELETE /api/mentors/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // ← FIX: Validate MongoDB ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: 'Invalid mentor ID' 
      });
    }

    // ← FIX: Use await
    const result = await Mentor.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ 
        message: 'Mentor not found' 
      });
    }

    res.json({ 
      message: 'Mentor deleted successfully',
      ok: true 
    });
  } catch (error) {
    console.error('Delete mentor error:', error.message);
    res.status(500).json({ 
      message: 'Failed to delete mentor' 
    });
  }
});

module.exports = router;
