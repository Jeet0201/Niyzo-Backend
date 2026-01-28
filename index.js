const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS Configuration - permissive for development and production  
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB connection - REQUIRED for all environments (production-grade enforcement)
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI || (NODE_ENV === 'development' ? 'mongodb://localhost:27017/niyzo' : null);
let mongoConnected = false;

if (!MONGODB_URI) {
  console.error('═══════════════════════════════════════════════════════════════════');
  console.error('❌ CRITICAL: MONGODB_URI environment variable is not set');
  console.error('═══════════════════════════════════════════════════════════════════');
  console.error('');
  console.error('PRODUCTION ENVIRONMENT DETECTED - Database is REQUIRED');
  console.error('');
  console.error('You must set MONGODB_URI before the server can start.');
  console.error('');
  console.error('Example for MongoDB Atlas (Cloud):');
  console.error('  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/niyzo?retryWrites=true&w=majority');
  console.error('');
  console.error('Setup Instructions:');
  console.error('  1. Sign up for MongoDB Atlas: https://www.mongodb.com/cloud/atlas');
  console.error('  2. Create a free cluster');
  console.error('  3. Get your connection string');
  console.error('  4. Set MONGODB_URI in your platform environment variables (Render.com):');
  console.error('     - Go to Settings > Environment Variables');
  console.error('     - Add MONGODB_URI with your connection string');
  console.error('  5. Redeploy your application');
  console.error('');
  console.error('═══════════════════════════════════════════════════════════════════');
  process.exit(1);
}

mongoose.set('strictQuery', true);

// Configure MongoDB connection with strict error handling
mongoose.connection.on('connecting', () => {
  console.log('🔄 Connecting to MongoDB...');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
  mongoConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
  mongoConnected = false;
});

// Strict connection enforcement - no fallback to in-memory
mongoose
  .connect(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
  })
  .then(() => {
    mongoConnected = true;
    console.log('✅ MongoDB Connected Successfully');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}`);
    console.log(`   Database: niyzo`);
    console.log(`   Status: Ready for data operations`);
    console.log(`   Environment: ${NODE_ENV.toUpperCase()}`);
    console.log(`   Data Persistence: ENABLED - All data is permanently saved`);
  })
  .catch((err) => {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════════');
    console.error('❌ FATAL: MongoDB Connection Failed');
    console.error('═══════════════════════════════════════════════════════════════════');
    console.error(`Error: ${err.message}`);
    console.error(`Attempted URI: ${MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}`);
    console.error('');
    console.error('Possible causes:');
    console.error('  1. Connection string is invalid');
    console.error('  2. MongoDB database is not accessible');
    console.error('  3. Network connectivity issue');
    console.error('  4. Authentication failed');
    console.error('  5. Database server is down');
    console.error('');
    console.error('NO IN-MEMORY FALLBACK - Server will not start without valid database');
    console.error('═══════════════════════════════════════════════════════════════════');
    process.exit(1);
  });

// Schemas and Models
const professorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    subject: { type: String, required: true },
    university: { type: String },
    status: { type: String, default: 'Available' },
  },
  { timestamps: true }
);

const mentorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    subject: { type: String, required: true },
    initials: { type: String },
    status: { type: String, default: 'Available' },
    university: { type: String },
  },
  { timestamps: true }
);

const questionSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true },
    studentEmail: { type: String },
    contact: { type: String },
    contactType: { type: String, enum: ['email', 'mobile'] },
    subject: { type: String, required: true },
    question: { type: String, required: true },
    status: { type: String, enum: ['New', 'Assigned', 'In Progress', 'Resolved'], default: 'New' },
    assignedMentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
    assignedProfessorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor' },
    answerText: { type: String },
    answeredByMentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' },
    answeredByProfessorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Professor' },
    answeredAt: { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

const Professor = mongoose.model('Professor', professorSchema);
const Mentor = mongoose.model('Mentor', mentorSchema);
const Question = mongoose.model('Question', questionSchema);

// Production-grade data persistence: MongoDB only
// No in-memory storage, no fallback behavior
console.log('📦 Database Models: Professor, Mentor, Question');

// Mentor signup/registration - MongoDB only
app.post('/api/mentor/signup', async (req, res) => {
  try {
    const { name, email, password, subject, university } = req.body || {};
    if (!name || !email || !password || !subject) {
      return res.status(400).json({ message: 'Name, email, password, and subject are required' });
    }
    
    // Check if mentor already exists
    const exists = await Mentor.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Create new mentor in MongoDB
    const mentor = await Mentor.create({
      name,
      email,
      password,
      subject,
      university: university || 'Not specified',
      status: 'Available',
      initials: name.split(' ').map(w => w[0]).join('').toUpperCase()
    });
    console.log('✅ New mentor registered:', mentor.name);
    return res.status(201).json({ message: 'Signup successful', user: { id: mentor._id, name: mentor.name, email: mentor.email } });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ message: 'Signup failed: ' + e.message });
  }
});

// Mentor login - MongoDB only
app.post('/api/mentor/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const mentor = await Mentor.findOne({ email });
    if (!mentor || mentor.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log('✅ Mentor login:', mentor.name);
    return res.json({ token: `mentor-${mentor._id}`, user: { id: mentor._id, name: mentor.name, email: mentor.email, subject: mentor.subject, university: mentor.university, status: mentor.status } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ message: 'Login failed: ' + e.message });
  }
});

// Admin login (super admin)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const token = 'dev-token';
  res.json({ token, user: { email } });
});

// Auth middleware for protected routes
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    const token = parts[1];
    if (token === 'dev-token' || token.startsWith('mentor-')) {
      req.mentorId = token.startsWith('mentor-') ? token.substring(7) : null;
      return next();
    }
  }
  return res.status(401).json({ message: 'Unauthorized' });
}

// Seed mentors to MongoDB if collection is empty
async function seedMentors() {
  const count = await Mentor.countDocuments();
  if (count > 0) {
    console.log(`✅ Mentors already seeded: ${count} mentors in database`);
    return;
  }
  
  const seed = [
    { name: 'Dr. Sarah Chen', email: 'sarah@stanford.edu', password: 'password123', subject: 'Computer Science', university: 'Stanford University' },
    { name: 'Prof. Michael Rodriguez', email: 'michael@mit.edu', password: 'password123', subject: 'Mathematics', university: 'MIT' },
    { name: 'Dr. Emily Thompson', email: 'emily@harvard.edu', password: 'password123', subject: 'Physics', university: 'Harvard University' },
    { name: 'Prof. David Kim', email: 'david@caltech.edu', password: 'password123', subject: 'Chemistry', university: 'Caltech' },
    { name: 'Dr. Lisa Anderson', email: 'lisa@yale.edu', password: 'password123', subject: 'Biology', university: 'Yale University' },
    { name: 'Prof. James Wilson', email: 'james@berkeley.edu', password: 'password123', subject: 'Engineering', university: 'UC Berkeley' },
  ].map((m) => ({
    ...m,
    initials: m.name.split(' ').map((w) => w[0]).join('').toUpperCase(),
    status: 'Available',
  }));
  
  await Mentor.insertMany(seed);
  console.log(`✅ Seeded ${seed.length} mentors to MongoDB database`);
}

// Public: student submits a new question
app.post('/api/questions', async (req, res) => {
  try {
    const { studentName, studentEmail, studentPhone, contact, subject, question, assignedMentorId } = req.body || {};
    
    // Required fields validation
    if (!studentName || !subject || !question) {
      return res.status(400).json({ message: 'studentName, subject and question are required' });
    }

    // CHANGE 2: Student contact field (Email OR Phone) is required
    if (!studentEmail && !studentPhone) {
      return res.status(400).json({ 
        message: 'Student contact is required: please provide either email or phone number' 
      });
    }

    // Validate email format if provided
    if (studentEmail && !studentEmail.match(/.+@.+\..+/)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate phone format if provided (10 digits)
    if (studentPhone && !studentPhone.match(/^\d{10}$/)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
    }
    
    console.log('📝 Received new question submission:');
    console.log(`   Student: ${studentName}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Contact: ${studentEmail || studentPhone}`);
    
    // Save to MongoDB only - no in-memory fallback
    const doc = await Question.create({
      studentName,
      studentEmail: studentEmail || undefined,
      studentPhone: studentPhone || undefined,
      contact, // legacy field
      subject,
      question,
      status: assignedMentorId ? 'Assigned' : 'New',
      assignedMentorId: assignedMentorId || undefined,
    });
    console.log('✅ Question saved to MongoDB:');
    console.log(`   ID: ${doc._id}`);
    console.log(`   Database: niyzo`);
    console.log(`   Collection: questions`);
    console.log(`   Data Persistence: PERMANENT`);
    res.status(201).json(doc);
  } catch (e) {
    console.error('❌ Create question error:', e.message);
    res.status(500).json({ message: 'Failed to create question' });
  }
});

// Protected: list all questions - MongoDB only
app.get('/api/questions', requireAuth, async (req, res) => {
  try {
    const list = await Question.find({}).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load questions' });
  }
});

// Mentor: get own questions - MongoDB only
app.get('/api/mentor/questions', requireAuth, async (req, res) => {
  try {
    const mentorId = req.mentorId;
    if (!mentorId) return res.status(401).json({ message: 'Not a mentor' });
    
    const questions = await Question.find({ assignedMentorId: mentorId }).sort({ createdAt: -1 }).lean();
    res.json(questions);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load questions' });
  }
});

// Mentor: get own profile
app.get('/api/mentor/profile', requireAuth, async (req, res) => {
  try {
    const mentorId = req.mentorId;
    if (!mentorId) return res.status(401).json({ message: 'Not a mentor' });
    
    const mentor = await Mentor.findById(mentorId).lean();
    if (!mentor) return res.status(404).json({ message: 'Mentor not found' });
    res.json(mentor);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

// Protected: update question status/assignment - MongoDB only
app.patch('/api/questions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};
    
    const updated = await Question.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: 'Failed to update question' });
  }
});

// Protected: delete question (admin only) - MongoDB only
app.delete('/api/questions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate question ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid question ID' });
    }

    const deleted = await Question.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Question not found' });
    console.log(`✅ Question deleted from MongoDB: ${id}`);
    res.json({ ok: true, message: 'Question deleted successfully' });
  } catch (e) {
    console.error('Failed to delete question:', e.message);
    res.status(500).json({ message: 'Failed to delete question' });
  }
});

// Protected: mentors - MongoDB only
app.get('/api/mentors', requireAuth, async (req, res) => {
  try {
    const list = await Mentor.find({}).sort({ name: 1 }).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load mentors' });
  }
});

// Public mentors list for student selection - MongoDB only
app.get('/api/public/mentors', async (req, res) => {
  try {
    const list = await Mentor.find({}).sort({ name: 1 }).lean();
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load mentors' });
  }
});

// Health check - confirms MongoDB connection is active and data is persisted
app.get('/api/health', async (req, res) => {
  const dbOk = mongoConnected && mongoose.connection.readyState === 1;
  const status = dbOk ? 'MongoDB CONNECTED - Data is being persisted' : 'MongoDB DISCONNECTED - CRITICAL ERROR';
  res.json({ ok: dbOk, database: status, environment: NODE_ENV.toUpperCase(), dataPersistence: 'MONGODB_ONLY', usingInMemory: false });
});

app.listen(PORT, async () => {
  try {
    await seedMentors();
  } catch (err) {
    console.error('❌ Error during seeding:', err.message);
  }
  console.log('\n' + '='.repeat(60));
  console.log('🚀 API SERVER STARTED');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📊 Database: MongoDB (niyzo)`);
  console.log(`📬 Connection: ${MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@')}`);
  console.log('='.repeat(60) + '\n');
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Mentor CRUD
app.post('/api/mentors', requireAuth, async (req, res) => {
  try {
    const { name, subject, university = '', status = 'Available', email, password } = req.body || {};
    if (!name || !subject) return res.status(400).json({ message: 'name and subject are required' });
    const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase();
    
    // Save to MongoDB only
    const doc = await Mentor.create({ 
      name, 
      subject, 
      university, 
      status, 
      initials,
      email: email || `mentor-${Date.now()}@skillverse.local`,
      password: password || 'default123'
    });
    res.status(201).json(doc);
  } catch (e) {
    console.error('Create mentor error:', e);
    res.status(500).json({ message: 'Failed to create mentor: ' + e.message });
  }
});

app.patch('/api/mentors/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};
    if (patch.name) {
      patch.initials = patch.name.split(' ').map((w) => w[0]).join('').toUpperCase();
    }
    
    // MongoDB only
    const updated = await Mentor.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: 'Failed to update mentor' });
  }
});

app.delete('/api/mentors/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // MongoDB only
    await Mentor.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete mentor' });
  }
});

// Public: list resolved questions with mentor name - MongoDB only
app.get('/api/public/resolved', async (req, res) => {
  try {
    const list = await Question.find({ status: 'Resolved' })
      .sort({ answeredAt: -1 })
      .limit(20)
      .populate({ path: 'answeredByMentorId', select: 'name subject' })
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
  } catch (e) {
    res.status(500).json({ message: 'Failed to load resolved answers' });
  }
});
