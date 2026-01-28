const mongoose = require('mongoose');

const mentorSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true
    },
    email: { 
      type: String, 
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,  // ← FIX: sparse index allows multiple nulls without conflict
      match: /.+@.+\..+/  // ← FIX: validate email format
    },
    password: { 
      type: String, 
      required: true 
    },
    subject: { 
      type: String, 
      required: true,
      trim: true
    },
    initials: { 
      type: String,
      trim: true
    },
    status: { 
      type: String, 
      default: 'Available',
      enum: ['Available', 'Unavailable', 'On Leave']
    },
    university: { 
      type: String,
      trim: true,
      default: 'Not specified'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { 
    timestamps: true,
    strict: true  // ← FIX: prevents unvalidated fields
  }
);

// ← FIX: Handle duplicate key errors gracefully
mentorSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    next(new Error(`${field} already exists in the database`));
  } else {
    next(error);
  }
});

module.exports = mentorSchema;
