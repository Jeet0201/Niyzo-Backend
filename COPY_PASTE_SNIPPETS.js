/**
 * QUICK COPY-PASTE SNIPPETS FOR server/index.js
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * This file contains the EXACT code to copy-paste into server/index.js
 * Find the matching section in your current server/index.js and replace it.
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ═════════════════════════════════════════════════════════════════════════════
// SNIPPET 1: Add these imports at the top of server/index.js (after line 6)
// ═════════════════════════════════════════════════════════════════════════════

const { sendAnswerEmail } = require('./utils/emailService');
const { isValidEmail, isValidPhone } = require('./utils/validators');

// ═════════════════════════════════════════════════════════════════════════════
// SNIPPET 2: Replace questionSchema (around line 62-73)
// ═════════════════════════════════════════════════════════════════════════════

const questionSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true },
    studentEmail: { type: String, lowercase: true, trim: true },
    studentPhone: { type: String, match: /^\d{10}$/ },
    subject: { type: String, required: true },
    question: { type: String, required: true },
    status: { type: String, enum: ['New', 'Assigned', 'In Progress', 'Resolved'], default: 'New' },
    assignedMentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
    assignedProfessorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor' },
    answerText: { type: String },
    answeredByMentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
    answeredByProfessorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor' },
    answeredAt: { type: Date },
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    emailError: { type: String }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// ═════════════════════════════════════════════════════════════════════════════
// SNIPPET 3: Replace POST /api/questions endpoint (around line 257-277)
// ═════════════════════════════════════════════════════════════════════════════

app.post('/api/questions', async (req, res) => {
  try {
    const { studentName, studentEmail, studentPhone, subject, question, assignedMentorId } = req.body || {};
    if (!studentName || !subject || !question) {
      return res.status(400).json({ message: 'studentName, subject and question are required' });
    }

    // Validate at least one contact method
    if (!studentEmail && !studentPhone) {
      return res.status(400).json({ message: 'Please provide either an email address or phone number' });
    }

    // Validate email if provided
    if (studentEmail && !isValidEmail(studentEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate phone if provided
    let normalizedPhone = null;
    if (studentPhone) {
      if (!isValidPhone(studentPhone)) {
        const digitsOnly = studentPhone.replace(/\D/g, '');
        if (digitsOnly.length !== 10) {
          return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
        }
        return res.status(400).json({ message: 'Phone number appears to be invalid or a test number' });
      }
      normalizedPhone = studentPhone.replace(/\D/g, '');
    }
    
    if (useInMemory) {
      const doc = addInMemoryQuestion({
        studentName,
        studentEmail: studentEmail?.toLowerCase(),
        studentPhone: normalizedPhone,
        subject,
        question,
        status: assignedMentorId ? 'Assigned' : 'New',
        assignedMentorId: assignedMentorId || undefined,
        emailSent: false,
        emailSentAt: null,
        emailError: null
      });
      res.status(201).json(doc);
    } else {
      const doc = await Question.create({
        studentName,
        studentEmail: studentEmail?.toLowerCase(),
        studentPhone: normalizedPhone,
        subject,
        question,
        status: assignedMentorId ? 'Assigned' : 'New',
        assignedMentorId: assignedMentorId || undefined,
        emailSent: false,
        emailSentAt: null,
        emailError: null
      });
      res.status(201).json(doc);
    }
  } catch (e) {
    console.error('Create question error:', e);
    res.status(500).json({ message: 'Failed to create question' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// SNIPPET 4: Replace PATCH /api/questions/:id endpoint (around line 365-382)
// 
// THIS IS LONG - COPY FROM server/routes/answerSubmission.js
// The file contains the complete implementation
// ═════════════════════════════════════════════════════════════════════════════

// See server/routes/answerSubmission.js for the complete function
// It's too long to include here, but follow the same pattern

// ═════════════════════════════════════════════════════════════════════════════
// SNIPPET 5: Replace GET /api/public/resolved endpoint (around line 463-497)
// ═════════════════════════════════════════════════════════════════════════════

app.get('/api/public/resolved', async (req, res) => {
  try {
    if (useInMemory) {
      const resolvedQuestions = getInMemoryQuestions()
        .filter(q => q.status === 'Resolved')
        .sort((a, b) => new Date(b.answeredAt || 0) - new Date(a.answeredAt || 0))
        .slice(0, 20);
      
      const mapped = resolvedQuestions.map((q) => {
        const mentor = getInMemoryMentors().find(m => m._id === q.answeredByMentorId);
        return {
          id: q._id,
          subject: q.subject,
          question: q.question,
          answerText: q.answerText,
          answeredAt: q.answeredAt,
          mentorName: mentor?.name || null,
          mentorSubject: mentor?.subject || null,
        };
      });
      res.json(mapped);
    } else {
      const list = await Question.find({ status: 'Resolved' })
        .sort({ answeredAt: -1 })
        .limit(20)
        .populate({ path: 'answeredByMentorId', select: 'name subject' })
        .select('-studentEmail -studentPhone -emailError')
        .lean();
      const mapped = list.map((q) => ({
        id: q._id,
        subject: q.subject,
        question: q.question,
        answerText: q.answerText,
        answeredAt: q.answeredAt,
        mentorName: q.answeredByMentorId?.name || null,
        mentorSubject: q.answeredByMentorId?.subject || null,
      }));
      res.json(mapped);
    }
  } catch (e) {
    console.error('Failed to load resolved answers:', e);
    res.status(500).json({ message: 'Failed to load resolved answers' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// END OF SNIPPETS
// ═════════════════════════════════════════════════════════════════════════════
