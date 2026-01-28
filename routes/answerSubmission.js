/**
 * ANSWER SUBMISSION & EMAIL LOGIC
 * 
 * This file contains the PATCH endpoint for submitting mentor answers.
 * 
 * KEY FEATURES:
 * 1. Validates student email and phone (if provided)
 * 2. Sends automatic email to student when answer is submitted
 * 3. Tracks email delivery status
 * 4. Never exposes student contact details in public APIs
 * 5. Proper error handling and logging
 * 
 * INTEGRATION INSTRUCTIONS:
 * 
 * Step 1: Add this at the TOP of server/index.js (after other imports):
 * ───────────────────────────────────────────────────────────────────
 * const { sendAnswerEmail } = require('./utils/emailService');
 * const { isValidEmail, isValidPhone } = require('./utils/validators');
 * 
 * 
 * Step 2: REPLACE the existing answer submission logic in the PATCH /api/questions/:id route
 * ───────────────────────────────────────────────────────────────────
 * Find this section in server/index.js:
 *   app.patch('/api/questions/:id', requireAuth, async (req, res) => {
 * 
 * And replace the entire function with the code below.
 */

// ============================================================================
// PASTE THIS ENTIRE FUNCTION INTO server/index.js
// Replace the existing app.patch('/api/questions/:id', ...) route
// ============================================================================

app.patch('/api/questions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { answerText, status, studentEmail, studentPhone } = req.body || {};

    // Validate question ID
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: 'Invalid question ID' 
      });
    }

    // If mentor is submitting an answer, validate and process
    if (answerText) {
      // ─────────────────────────────────────────────────────────────────
      // VALIDATION: Check for valid answer text
      // ─────────────────────────────────────────────────────────────────
      if (!answerText || !answerText.trim()) {
        return res.status(400).json({ 
          message: 'Answer text is required' 
        });
      }

      if (answerText.trim().length < 10) {
        return res.status(400).json({ 
          message: 'Answer must be at least 10 characters long' 
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // VALIDATION: Validate student contact details
      // ─────────────────────────────────────────────────────────────────
      
      // Fetch the question to get student contact info
      let question;
      if (useInMemory) {
        question = inMemoryQuestions.find(q => q._id === id);
      } else {
        question = await Question.findById(id);
      }

      if (!question) {
        return res.status(404).json({ 
          message: 'Question not found' 
        });
      }

      // Get contact details from either request or database
      const contactEmail = studentEmail || question.studentEmail;
      const contactPhone = studentPhone || question.studentPhone;

      let hasValidContact = false;
      let contactValidationError = null;

      // ─────────────────────────────────────────────────────────────────
      // EMAIL VALIDATION (if email provided)
      // ─────────────────────────────────────────────────────────────────
      if (contactEmail) {
        if (!isValidEmail(contactEmail)) {
          contactValidationError = 'Invalid email format. Must be a valid email address.';
        } else {
          hasValidContact = true;
        }
      }

      // ─────────────────────────────────────────────────────────────────
      // PHONE VALIDATION (if phone provided)
      // ─────────────────────────────────────────────────────────────────
      if (contactPhone) {
        if (!isValidPhone(contactPhone)) {
          // Provide specific error message for phone validation failures
          const digitsOnly = contactPhone.replace(/\D/g, '');
          if (digitsOnly.length !== 10) {
            contactValidationError = 'Phone number must be exactly 10 digits.';
          } else {
            contactValidationError = 'Phone number appears to be fake or invalid (sequential, repeated, or test number).';
          }
        } else {
          hasValidContact = true;
        }
      }

      // Reject if validation failed
      if (contactValidationError) {
        return res.status(400).json({ 
          message: `Cannot submit answer: ${contactValidationError}` 
        });
      }

      // At least one valid contact method is required
      if (!hasValidContact) {
        return res.status(400).json({ 
          message: 'At least one valid contact method (email or phone) is required to send the answer to the student.' 
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // SAVE ANSWER AND SEND EMAIL
      // ─────────────────────────────────────────────────────────────────
      
      let mentorName = 'A Mentor';
      let mentorSubject = 'General';

      if (useInMemory) {
        const mentor = inMemoryMentors.find(m => m._id === question.assignedMentorId);
        if (mentor) {
          mentorName = mentor.name;
          mentorSubject = mentor.subject;
        }

        // Update question with answer
        const updates = {
          answerText: answerText.trim(),
          status: 'Resolved',
          answeredByMentorId: question.assignedMentorId,
          answeredAt: new Date(),
          emailSent: false,
          emailSentAt: null,
          emailError: null
        };

        question = updateInMemoryQuestion(id, updates);
      } else {
        // Fetch mentor details for email
        const mentor = await Mentor.findById(question.assignedMentorId).lean();
        if (mentor) {
          mentorName = mentor.name;
          mentorSubject = mentor.subject;
        }

        // Update question with answer
        question = await Question.findByIdAndUpdate(
          id,
          {
            $set: {
              answerText: answerText.trim(),
              status: 'Resolved',
              answeredByMentorId: question.assignedMentorId,
              answeredAt: new Date(),
              emailSent: false,
              emailSentAt: null,
              emailError: null
            }
          },
          { new: true }
        );
      }

      // ─────────────────────────────────────────────────────────────────
      // SEND EMAIL TO STUDENT (async, non-blocking)
      // ─────────────────────────────────────────────────────────────────
      if (contactEmail) {
        sendAnswerEmail({
          studentEmail: contactEmail,
          studentName: question.studentName,
          mentorName: mentorName,
          subject: question.subject,
          question: question.question,
          answer: answerText.trim(),
          mentorSubject: mentorSubject
        }).then(emailResult => {
          // Update email status in database (non-blocking)
          const emailUpdate = {
            emailSent: emailResult.success,
            emailSentAt: emailResult.success ? new Date() : null,
            emailError: emailResult.success ? null : emailResult.message
          };

          if (useInMemory) {
            updateInMemoryQuestion(id, emailUpdate);
          } else {
            Question.findByIdAndUpdate(id, { $set: emailUpdate }).catch(err => {
              console.error('Failed to update email status:', err.message);
            });
          }

          if (emailResult.success) {
            console.log(`✅ Answer email sent to ${question.studentName} (${contactEmail})`);
          } else {
            console.warn(`⚠️ Failed to send answer email: ${emailResult.message}`);
          }
        }).catch(err => {
          console.error('❌ Email service error:', err);
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // RETURN RESPONSE (without private student details)
      // ─────────────────────────────────────────────────────────────────
      const responseData = { ...question };
      if (responseData._id) {
        // Remove private fields from response
        delete responseData.studentEmail;
        delete responseData.studentPhone;
      } else if (responseData.toObject) {
        // If using Mongoose, use the public method if available
        return res.json(responseData.toPublic?.() || responseData);
      }

      return res.json(responseData);
    }

    // ─────────────────────────────────────────────────────────────────
    // NORMAL STATUS UPDATE (no email sending)
    // ─────────────────────────────────────────────────────────────────
    // If just updating status/assignment without answer
    const patch = req.body || {};

    if (useInMemory) {
      const updated = updateInMemoryQuestion(id, patch);
      if (!updated) return res.status(404).json({ message: 'Not found' });
      res.json(updated);
    } else {
      const updated = await Question.findByIdAndUpdate(
        id, 
        { $set: patch }, 
        { new: true }
      ).lean();
      if (!updated) return res.status(404).json({ message: 'Not found' });
      res.json(updated);
    }
  } catch (e) {
    console.error('Update question error:', e);
    res.status(500).json({ 
      message: 'Failed to update question: ' + e.message 
    });
  }
});

// ============================================================================
// END OF FUNCTION TO PASTE
// ============================================================================
