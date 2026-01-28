/**
 * UPDATED QUESTION SCHEMA
 * Adds phone field for student contact
 * 
 * BREAKING CHANGES: NONE
 * - Existing questions will still work
 * - Phone field is optional (will be null for existing questions)
 * - New questions require phone field
 * 
 * Key changes:
 * - Added studentPhone field (10 digits, validated)
 * - Private fields: studentEmail, studentPhone
 * - Public fields: all except studentEmail and studentPhone
 */

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    // Student Information (PRIVATE - never return in public APIs)
    studentName: { 
      type: String, 
      required: true,
      trim: true
    },
    studentEmail: { 
      type: String,
      trim: true,
      lowercase: true,
      // Optional for backward compatibility with existing data
      // Required for new questions (validated at API level)
    },
    studentPhone: { 
      type: String,
      // Stores digits only (e.g., "1234567890")
      match: /^\d{10}$/,
      // Optional for backward compatibility
      // Required for new questions (validated at API level)
    },

    // Question Details (PUBLIC)
    subject: { 
      type: String, 
      required: true,
      trim: true,
      index: true
    },
    question: { 
      type: String, 
      required: true,
      trim: true
    },

    // Mentor Assignment (PUBLIC)
    status: { 
      type: String, 
      enum: ['New', 'Assigned', 'In Progress', 'Resolved'], 
      default: 'New',
      index: true
    },
    assignedMentorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Mentor',
      index: true
    },
    assignedProfessorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Professor'
    },

    // Mentor Answer (PUBLIC - but studentEmail/Phone never shown)
    answerText: { 
      type: String,
      trim: true
    },
    answeredByMentorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Mentor',
      index: true
    },
    answeredByProfessorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Professor'
    },
    answeredAt: { 
      type: Date,
      index: true
    },

    // Email delivery tracking
    emailSent: {
      type: Boolean,
      default: false
    },
    emailSentAt: {
      type: Date
    },
    emailError: {
      type: String
    }
  },
  { 
    timestamps: { 
      createdAt: 'createdAt', 
      updatedAt: 'updatedAt' 
    }
  }
);

// Index for finding questions by student contact (private queries only)
questionSchema.index({ studentEmail: 1 });
questionSchema.index({ studentPhone: 1 });

// Virtual field for checking if student contact exists
questionSchema.virtual('hasValidContact').get(function() {
  return !!(this.studentEmail || this.studentPhone);
});

// Method to get public version (without private student details)
questionSchema.methods.toPublic = function() {
  const obj = this.toObject();
  delete obj.studentEmail;
  delete obj.studentPhone;
  delete obj.emailError;
  return obj;
};

// Static method to create projection for public queries
questionSchema.statics.publicProjection = function() {
  return {
    studentEmail: 0,
    studentPhone: 0,
    emailError: 0
  };
};

module.exports = questionSchema;
