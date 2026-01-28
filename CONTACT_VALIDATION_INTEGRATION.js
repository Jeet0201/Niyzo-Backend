/**
 * CONTACT VALIDATION - INTEGRATION GUIDE
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * This guide shows how to integrate contact field validation into your existing form
 * NO UI/FORM CHANGES NEEDED - validation only
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ═════════════════════════════════════════════════════════════════════════════
// FRONTEND INTEGRATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * OPTION 1: Using the React Hook (Recommended)
 * 
 * In your form component:
 */

/*
 * In your form component:
 * import { useContactValidation } from '@/hooks/useContactValidation';
 *
 * function StudentQuestionForm() {
 *   // Get contact validation
 *   const {
 *     contact,
 *     error,
 *     setContact,
 *     isValid,
 *     contactType,
 *     getNormalizedValue
 *   } = useContactValidation();
 *
 *   // Your other form state...
 *   const [studentName, setStudentName] = useState('');
 *   const [subject, setSubject] = useState('');
 *   const [question, setQuestion] = useState('');
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *
 *     // Validate contact field
 *     if (!isValid) {
 *       toast({
 *         title: 'Invalid Contact',
 *         description: error || 'Please enter a valid email or mobile number',
 *         variant: 'destructive'
 *       });
 *       return;
 *     }
 *
 *     // Get normalized value (lowercase email or digits-only mobile)
 *     const normalizedContact = getNormalizedValue();
 *
 *     try {
 *       // Submit with normalized contact
 *       const result = await api.createQuestion({
 *         studentName,
 *         contact: normalizedContact,  // Use normalized value!
 *         subject,
 *         question
 *       });
 *
 *       toast({
 *         title: 'Success',
 *         description: 'Your question has been submitted!'
 *       });
 *
 *       // Reset form
 *       setStudentName('');
 *       setContact('');  // Reset contact field
 *       setSubject('');
 *       setQuestion('');
 *     } catch (err) {
 *       toast({
 *         title: 'Error',
 *         description: err.message,
 *         variant: 'destructive'
 *       });
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <Input
 *         placeholder="Your name"
 *         value={studentName}
 *         onChange={(e) => setStudentName(e.target.value)}
 *       />
 *
 *       <Input
 *         placeholder="Email or Mobile"
 *         value={contact}
 *         onChange={(e) => setContact(e.target.value)}
 *         className={error ? 'border-red-500' : isValid ? 'border-green-500' : ''}
 *       />
 *       {error && <span className="text-red-500 text-sm">{error}</span>}
 *
 *       <Select value={subject} onValueChange={setSubject}>
 *       </Select>
 *
 *       <Textarea
 *         placeholder="Your question..."
 *         value={question}
 *         onChange={(e) => setQuestion(e.target.value)}
 *       />
 *
 *       <Button
 *         type="submit"
 *         disabled={!studentName || !contact || !isValid || !subject || !question}
 *       >
 *         Submit Question
 *       </Button>
 *     </form>
 *   );
 * }
 */

// ═════════════════════════════════════════════════════════════════════════════

/*
 * OPTION 2: Using validateContact directly
 * If you want manual control over validation
 *
 * import { validateContact } from '@/lib/contactValidation';
 *
 * function MyForm() {
 *   const [contact, setContact] = useState('');
 *   const [error, setError] = useState('');
 *
 *   const handleContactChange = (value) => {
 *     setContact(value);
 *     const result = validateContact(value);
 *     if (value.trim()) {
 *       setError(result.error);
 *     } else {
 *       setError('');
 *     }
 *   };
 *
 *   const handleSubmit = (e) => {
 *     e.preventDefault();
 *     const result = validateContact(contact);
 *     if (!result.isValid) {
 *       setError(result.error);
 *       return;
 *     }
 *     submitForm({
 *       contact: result.value,
 *       contactType: result.type
 *     });
 *   };
 *
 *   return (
 *     <>
 *       <Input
 *         value={contact}
 *         onChange={(e) => handleContactChange(e.target.value)}
 *       />
 *       {error && <span className="error">{error}</span>}
 *     </>
 *   );
 * }
 */

/*
 * OPTION 1: Using Middleware (Recommended)
 * In your server/index.js:
 *
 * const { validateContactField } = require('./middleware/contactValidation');
 *
 * app.post('/api/questions', validateContactField, async (req, res) => {
 *   try {
 *     const { studentName, contact, contactType, subject, question } = req.body;
 *
 *     const doc = await Question.create({
 *       studentName,
 *       contact,
 *       contactType,
 *       subject,
 *       question
 *     });
 *
 *     res.status(201).json(doc);
 *   } catch (e) {
 *     console.error('Create question error:', e);
 *     res.status(500).json({ message: 'Failed to create question' });
 *   }
 * });
 */

/*
 * OPTION 2: Validation in Handler
 * If you want manual validation in the route
 *
 * const { validateContactInput } = require('./middleware/contactValidation');
 *
 * app.post('/api/questions', async (req, res) => {
 *   try {
 *     const { studentName, contact, subject, question } = req.body;
 *
 *     const contactValidation = validateContactInput(contact);
 *
 *     if (!contactValidation.isValid) {
 *       return res.status(400).json({
 *         message: contactValidation.error,
 *         field: 'contact',
 *         error: 'INVALID_CONTACT'
 *       });
 *     }
 *
 *     const doc = await Question.create({
 *       studentName,
 *       contact: contactValidation.value,
 *       contactType: contactValidation.type,
 *       subject,
 *       question
 *     });
 *
 *     res.status(201).json(doc);
 *   } catch (e) {
 *     console.error('Create question error:', e);
 *     res.status(500).json({ message: 'Failed to create question' });
 *   }
 * });
 */

/*
 * MONGODB SCHEMA UPDATE
 * Update your Question schema to store both contact and type
 * In server/index.js (questionSchema definition):
 *
 * const questionSchema = new mongoose.Schema(
 *   {
 *     studentName: { type: String, required: true },
 *     contact: {
 *       type: String,
 *       required: true,
 *       index: true,
 *       trim: true,
 *       lowercase: true
 *     },
 *     contactType: {
 *       type: String,
 *       enum: ['email', 'mobile'],
 *       required: true
 *     },
 *     subject: { type: String, required: true },
 *     question: { type: String, required: true },
 *     status: { type: String, enum: ['New', 'Assigned', 'In Progress', 'Resolved'], default: 'New' },
 *     assignedMentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
 *     answerText: { type: String },
 *     answeredByMentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
 *     answeredAt: { type: Date }
 *   },
 *   { timestamps: true }
 * );
 */

/*
 * API SIGNATURE CHANGES
 *
 * OLD REQUEST:
 * {
 *   "studentName": "John",
 *   "studentEmail": "john@example.com",
 *   "subject": "JavaScript",
 *   "question": "How do I..."
 * }
 *
 * NEW REQUEST:
 * {
 *   "studentName": "John",
 *   "contact": "john@example.com",
 *   "subject": "JavaScript",
 *   "question": "How do I..."
 * }
 *
 * RESPONSE:
 * {
 *   "_id": "...",
 *   "studentName": "John",
 *   "contact": "john@example.com",
 *   "contactType": "email",
 *   "subject": "JavaScript",
 *   "question": "How do I...",
 *   "status": "New",
 *   "createdAt": "2026-01-28..."
 * }
 */

/*
 * UPDATE API CLIENT IN src/lib/api.ts:
 *
 * export const api = {
 *   createQuestion: (payload: {
 *     studentName: string;
 *     contact: string;
 *     subject: string;
 *     question: string;
 *   }) => request('/api/questions', { method: 'POST', body: JSON.stringify(payload) })
 * };
 */

// ═════════════════════════════════════════════════════════════════════════════

module.exports = {};
