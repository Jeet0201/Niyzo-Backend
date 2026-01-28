/**
 * QUICK REFERENCE: EXACT CHANGES TO server/index.js
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This file shows EXACTLY where to make changes in your existing server/index.js
 * Follow the line numbers and copy-paste the changes.
 * 
 * NO CHANGES NEEDED TO FRONTEND
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE 1: ADD IMPORTS (after line 6 - after other require statements)
// ═══════════════════════════════════════════════════════════════════════════
//
// ADD THIS:
//
const { sendAnswerEmail } = require('./utils/emailService');
const { isValidEmail, isValidPhone } = require('./utils/validators');
//

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE 2: UPDATE QUESTION SCHEMA (replace lines 62-73)
// ═══════════════════════════════════════════════════════════════════════════
//
// FIND THIS:
//   const questionSchema = new mongoose.Schema(
//     {
//       studentName: { type: String, required: true },
//       studentEmail: { type: String },
//       subject: { type: String, required: true },
//       question: { type: String, required: true },
//       status: { type: String, enum: ['New', 'Assigned', 'In Progress', 'Resolved'], default: 'New' },
//       assignedMentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
//       assignedProfessorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor' },
//       answerText: { type: String },
//       answeredByMentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
//       answeredByProfessorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor' },
//       answeredAt: { type: Date },
//     },
//     { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
//   );
//
// REPLACE WITH:
//
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
//

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE 3: UPDATE QUESTION SUBMISSION ENDPOINT (replace lines 257-277)
// ═══════════════════════════════════════════════════════════════════════════
//
// FIND THIS:
//   app.post('/api/questions', async (req, res) => {
//     try {
//       const { studentName, studentEmail, subject, question, assignedMentorId } = req.body || {};
//       if (!studentName || !subject || !question) {
//         return res.status(400).json({ message: 'studentName, subject and question are required' });
//       }
//       
//       if (useInMemory) {
//         const doc = addInMemoryQuestion({
//           studentName,
//           studentEmail,
//           subject,
//           question,
//           status: assignedMentorId ? 'Assigned' : 'New',
//           assignedMentorId: assignedMentorId || undefined,
//         });
//         res.status(201).json(doc);
//       } else {
//         const doc = await Question.create({
//           studentName,
//           studentEmail,
//           subject,
//           question,
//           status: assignedMentorId ? 'Assigned' : 'New',
//           assignedMentorId: assignedMentorId || undefined,
//         });
//         res.status(201).json(doc);
//       }
//     } catch (e) {
//       console.error('Create question error:', e);
//       res.status(500).json({ message: 'Failed to create question' });
//     }
//   });
//
// REPLACE WITH:
//
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
//

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE 4: UPDATE ANSWER SUBMISSION ENDPOINT (replace lines 365-382)
// ═══════════════════════════════════════════════════════════════════════════
//
// FIND THIS:
//   app.patch('/api/questions/:id', requireAuth, async (req, res) => {
//     try {
//       const { id } = req.params;
//       const patch = req.body || {};
//       
//       if (useInMemory) {
//         const updated = updateInMemoryQuestion(id, patch);
//         if (!updated) return res.status(404).json({ message: 'Not found' });
//         res.json(updated);
//       } else {
//         const updated = await Question.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
//         if (!updated) return res.status(404).json({ message: 'Not found' });
//         res.json(updated);
//       }
//     } catch (e) {
//       res.status(500).json({ message: 'Failed to update question' });
//     }
//   });
//
// REPLACE WITH THE ENTIRE FUNCTION FROM: server/routes/answerSubmission.js
// (Copy the entire app.patch('/api/questions/:id', ...) function)
//

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE 5: UPDATE PUBLIC RESOLVED ENDPOINT (replace lines 463-497)
// ═══════════════════════════════════════════════════════════════════════════
//
// FIND THIS:
//   app.get('/api/public/resolved', async (req, res) => {
//     try {
//       if (useInMemory) {
//         const resolvedQuestions = getInMemoryQuestions()
//           .filter(q => q.status === 'Resolved')
//           .sort((a, b) => new Date(b.answeredAt || 0) - new Date(a.answeredAt || 0))
//           .slice(0, 20);
//         
//         const mapped = resolvedQuestions.map((q) => {
//           const mentor = getInMemoryMentors().find(m => m._id === q.answeredByMentorId);
//           return {
//             id: q._id,
//             subject: q.subject,
//             question: q.question,
//             answerText: q.answerText,
//             answeredAt: q.answeredAt,
//             mentorName: mentor?.name || null,
//             mentorSubject: mentor?.subject || null,
//           };
//         });
//         res.json(mapped);
//       } else {
//         const list = await Question.find({ status: 'Resolved' })
//           .sort({ answeredAt: -1 })
//           .limit(20)
//           .populate({ path: 'answeredByMentorId', select: 'name subject' })
//           .lean();
//         const mapped = list.map((q) => ({
//           id: q._id,
//           subject: q.subject,
//           question: q.question,
//           answerText: q.answerText,
//           answeredAt: q.answeredAt,
//           mentorName: q.answeredByMentorId?.name || null,
//           mentorSubject: q.answeredByMentorId?.subject || null,
//         }));
//         res.json(mapped);
//       }
//     } catch (e) {
//       res.status(500).json({ message: 'Failed to load resolved answers' });
//     }
//   });
//
// REPLACE WITH:
//
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
          // ✅ Intentionally NOT including studentEmail, studentPhone
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
        // ✅ Intentionally NOT including studentEmail, studentPhone
      }));
      res.json(mapped);
    }
  } catch (e) {
    console.error('Failed to load resolved answers:', e);
    res.status(500).json({ message: 'Failed to load resolved answers' });
  }
});
//

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY OF CHANGES
// ═══════════════════════════════════════════════════════════════════════════
//
// Files created (add to your project):
// ✅ server/utils/validators.js
// ✅ server/utils/emailService.js
// ✅ server/models/questionSchema.js (optional, for reference)
// ✅ server/routes/answerSubmission.js (contains full PATCH endpoint code)
// ✅ server/routes/publicAPI.js (optional, for reference)
//
// Files modified:
// ⚠️ server/index.js (5 changes above)
//
// No changes needed:
// ✅ Frontend (React components stay the same)
// ✅ StudentQuestionForm.tsx
// ✅ MentorQuestions.tsx
// ✅ AdminPanel.tsx
// ✅ Any other frontend files
//

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLES TO ADD
// ═══════════════════════════════════════════════════════════════════════════
//
// Development (.env):
//   EMAIL_PROVIDER=console
//
// Production (.env):
//   EMAIL_PROVIDER=nodemailer
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_SECURE=false
//   SMTP_USER=your-email@gmail.com
//   SMTP_PASSWORD=your-app-password
//   EMAIL_FROM=noreply@youthsolve.com
//

module.exports = {};
