/**
 * QUESTION SCHEMA - Student Contact Required
 * 
 * NEW REQUIREMENT: Students must provide Email OR Mobile
 * - studentEmail: optional but required at API level (if phone not provided)
 * - studentPhone: optional but required at API level (if email not provided)
 * - Both are PRIVATE fields - never exposed in public APIs
 * 
 * BACKWARD COMPATIBILITY:
 * - Existing questions with only 'contact' field will still load
 * - New questions require studentEmail or studentPhone
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
      sparse: true,
      match: [/.+@.+\..+/, 'Please provide a valid email address']
    },
    studentPhone: { 
      type: String,
      trim: true,
      // Stores digits only (e.g., "1234567890")
      match: [/^\d{10}$/, 'Phone must be exactly 10 digits']
    },
    // Legacy field - deprecated but kept for backward compatibility
    contact: {
      type: String,
      trim: true
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
