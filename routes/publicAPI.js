/**
 * SECURE PUBLIC API ENDPOINTS
 * Ensures student contact details are NEVER exposed publicly
 * 
 * INTEGRATION INSTRUCTIONS:
 * 
 * Step 1: Add these imports at the top of server/index.js
 * ────────────────────────────────────────────────────────
 * (Already done if you added the previous imports)
 * 
 * 
 * Step 2: REPLACE the existing /api/public/resolved endpoint
 * ────────────────────────────────────────────────────────
 * Find this route in server/index.js:
 *   app.get('/api/public/resolved', async (req, res) => {
 * 
 * Replace it with the code below to ensure studentEmail and studentPhone
 * are never returned in the response.
 */

// ============================================================================
// PASTE THIS ENTIRE FUNCTION INTO server/index.js
// Replace the existing app.get('/api/public/resolved', ...) route
// ============================================================================

app.get('/api/public/resolved', async (req, res) => {
  try {
    if (useInMemory) {
      const resolvedQuestions = getInMemoryQuestions()
        .filter(q => q.status === 'Resolved')
        .sort((a, b) => new Date(b.answeredAt || 0) - new Date(a.answeredAt || 0))
        .slice(0, 20);
      
      const mapped = resolvedQuestions.map((q) => {
        const mentor = getInMemoryMentors().find(m => m._id === q.answeredByMentorId);
        
        // ─────────────────────────────────────────────────────────────────
        // CRITICAL: Never include studentEmail or studentPhone in response
        // ─────────────────────────────────────────────────────────────────
        return {
          id: q._id,
          subject: q.subject,
          question: q.question,
          answerText: q.answerText,
          answeredAt: q.answeredAt,
          mentorName: mentor?.name || null,
          mentorSubject: mentor?.subject || null,
          // ✅ NO studentEmail
          // ✅ NO studentPhone
          // ✅ NO studentName (optional - decide if you want to show this)
        };
      });
      
      res.json(mapped);
    } else {
      const list = await Question.find({ status: 'Resolved' })
        .sort({ answeredAt: -1 })
        .limit(20)
        .populate({ path: 'answeredByMentorId', select: 'name subject' })
        // ─────────────────────────────────────────────────────────────────
        // CRITICAL: Use projection to exclude private fields
        // ─────────────────────────────────────────────────────────────────
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
        // ✅ NO studentEmail
        // ✅ NO studentPhone
        // ✅ NO studentName
      }));
      
      res.json(mapped);
    }
  } catch (e) {
    console.error('Failed to load resolved answers:', e);
    res.status(500).json({ 
      message: 'Failed to load resolved answers' 
    });
  }
});

// ============================================================================
// END OF FUNCTION TO PASTE
// ============================================================================


/**
 * ADDITIONAL SECURE ENDPOINT (OPTIONAL)
 * 
 * If you want a public endpoint to get all questions (not just resolved),
 * add this endpoint and it will also exclude private student data.
 */

// ============================================================================
// OPTIONAL: Add this new endpoint to server/index.js
// This allows public users to see all public questions
// ============================================================================

app.get('/api/public/questions', async (req, res) => {
  try {
    const { subject, limit = 50 } = req.query;
    
    let filter = {};
    if (subject) {
      filter.subject = { $regex: subject, $options: 'i' };
    }

    if (useInMemory) {
      let questions = getInMemoryQuestions()
        .filter(q => {
          if (filter.subject && !q.subject.toLowerCase().includes(subject.toLowerCase())) {
            return false;
          }
          return true;
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, parseInt(limit) || 50);

      const mapped = questions.map((q) => {
        const mentor = q.assignedMentorId ? 
          getInMemoryMentors().find(m => m._id === q.assignedMentorId) : null;
        
        return {
          id: q._id,
          subject: q.subject,
          question: q.question,
          status: q.status,
          answerText: q.answerText || null,
          answeredAt: q.answeredAt || null,
          mentorName: mentor?.name || null,
          mentorSubject: mentor?.subject || null,
          createdAt: q.createdAt,
          // ✅ NO studentEmail
          // ✅ NO studentPhone
          // ✅ NO studentName
        };
      });

      res.json(mapped);
    } else {
      const questions = await Question.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) || 50)
        .populate({ path: 'assignedMentorId', select: 'name subject' })
        // CRITICAL: Exclude private fields
        .select('-studentEmail -studentPhone -emailError')
        .lean();

      const mapped = questions.map((q) => ({
        id: q._id,
        subject: q.subject,
        question: q.question,
        status: q.status,
        answerText: q.answerText || null,
        answeredAt: q.answeredAt || null,
        mentorName: q.assignedMentorId?.name || null,
        mentorSubject: q.assignedMentorId?.subject || null,
        createdAt: q.createdAt,
        // ✅ NO studentEmail
        // ✅ NO studentPhone
        // ✅ NO studentName
      }));

      res.json(mapped);
    }
  } catch (e) {
    console.error('Failed to load public questions:', e);
    res.status(500).json({ 
      message: 'Failed to load questions' 
    });
  }
});

// ============================================================================
// END OF OPTIONAL ENDPOINT
// ============================================================================
