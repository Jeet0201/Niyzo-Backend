const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { validateContactField } = require('./middleware/contactValidation');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// MongoDB connection - require production URI; fallback to local only for development
const MONGODB_URI = process.env.MONGODB_URI ?? (process.env.NODE_ENV === 'production' ? null : 'mongodb://localhost:27017/niyzo');
let useInMemory = false;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. In production you must provide a network-accessible MongoDB URI (set MONGODB_URI environment variable).');
  console.error('   Example: mongodb+srv://<user>:<pass>@cluster0.example.mongodb.net/mydb?retryWrites=true&w=majority');
  process.exit(1);
}

mongoose.set('strictQuery', true);

// Configure MongoDB connection
mongoose.connection.on('connecting', () => {
  console.log('🔄 Connecting to MongoDB...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB Connected');
  console.log(`   URI: ${MONGODB_URI}`);
  console.log(`   Database: niyzo`);
  console.log(`   Status: Ready for data operations`);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose
  .connect(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    useInMemory = false;
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Tried URI:', MONGODB_URI);
    console.error('   In production, ensure `MONGODB_URI` points to a reachable, authenticated MongoDB instance and that network rules/VPC peering allow access from this host.');
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

// In-memory storage fallback
let inMemoryProfessors = [];
let inMemoryMentors = [];
let inMemoryQuestions = [];
let nextId = 1;

// Helper functions for in-memory operations
const getInMemoryMentors = () => inMemoryMentors;
const getInMemoryQuestions = () => inMemoryQuestions;
const addInMemoryMentor = (mentor) => {
  const newMentor = { ...mentor, _id: (nextId++).toString(), createdAt: new Date(), updatedAt: new Date() };
  inMemoryMentors.push(newMentor);
  return newMentor;
};
const addInMemoryQuestion = (question) => {
  const newQuestion = { ...question, _id: (nextId++).toString(), createdAt: new Date(), updatedAt: new Date() };
  inMemoryQuestions.push(newQuestion);
  return newQuestion;
};
const updateInMemoryQuestion = (id, updates) => {
  const index = inMemoryQuestions.findIndex(q => q._id === id);
  if (index !== -1) {
    inMemoryQuestions[index] = { ...inMemoryQuestions[index], ...updates, updatedAt: new Date() };
    return inMemoryQuestions[index];
  }
  return null;
};
const updateInMemoryMentor = (id, updates) => {
  const index = inMemoryMentors.findIndex(m => m._id === id);
  if (index !== -1) {
    inMemoryMentors[index] = { ...inMemoryMentors[index], ...updates, updatedAt: new Date() };
    return inMemoryMentors[index];
  }
  return null;
};
const deleteInMemoryMentor = (id) => {
  const index = inMemoryMentors.findIndex(m => m._id === id);
  if (index !== -1) {
    inMemoryMentors.splice(index, 1);
    return true;
  }
  return false;
};
const addInMemoryProfessor = (professor) => {
  const newProf = { ...professor, _id: (nextId++).toString(), createdAt: new Date(), updatedAt: new Date() };
  inMemoryProfessors.push(newProf);
  return newProf;
};

// Mentor signup/registration
app.post('/api/mentor/signup', async (req, res) => {
  try {
    const { name, email, password, subject, university } = req.body || {};
    if (!name || !email || !password || !subject) {
      return res.status(400).json({ message: 'Name, email, password, and subject are required' });
    }
    
    if (useInMemory) {
      // Check if mentor already exists
      const exists = inMemoryMentors.find(m => m.email === email);
      if (exists) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Create new mentor
      const newMentor = {
        name,
        email,
        password,
        subject,
        university: university || 'Not specified',
        status: 'Available',
        initials: name.split(' ').map(w => w[0]).join('').toUpperCase()
      };
      const mentor = addInMemoryMentor(newMentor);
      console.log('New mentor registered:', mentor.name);
      return res.status(201).json({ message: 'Signup successful', user: { id: mentor._id, name: mentor.name, email: mentor.email } });
    } else {
      // Check if mentor already exists
      const exists = await Mentor.findOne({ email });
      if (exists) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Create new mentor
      const mentor = await Mentor.create({
        name,
        email,
        password,
        subject,
        university: university || 'Not specified',
        status: 'Available',
        initials: name.split(' ').map(w => w[0]).join('').toUpperCase()
      });
      console.log('New mentor registered:', mentor.name);
      return res.status(201).json({ message: 'Signup successful', user: { id: mentor._id, name: mentor.name, email: mentor.email } });
    }
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ message: 'Signup failed: ' + e.message });
  }
});

// Mentor login
app.post('/api/mentor/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    if (useInMemory) {
      console.log('Searching for mentor:', email, 'in', inMemoryMentors.length, 'mentors');
      const mentor = inMemoryMentors.find(m => m.email === email && m.password === password);
      if (!mentor) {
        console.log('Mentor not found or password mismatch');
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      console.log('Mentor found:', mentor.name);
      return res.json({ token: `mentor-${mentor._id}`, user: { id: mentor._id, name: mentor.name, email: mentor.email, subject: mentor.subject, university: mentor.university, status: mentor.status } });
    } else {
      const mentor = await Mentor.findOne({ email });
      if (!mentor || mentor.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      return res.json({ token: `mentor-${mentor._id}`, user: { id: mentor._id, name: mentor.name, email: mentor.email, subject: mentor.subject, university: mentor.university, status: mentor.status } });
    }
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

// Seed mentors if collection is empty
async function seedMentors() {
  if (useInMemory) {
    if (inMemoryMentors.length > 0) return;
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
    seed.forEach(mentor => addInMemoryMentor(mentor));
    console.log('Seeded in-memory mentors');
  } else {
    const count = await Mentor.countDocuments();
    if (count > 0) return;
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
    console.log('Seeded MongoDB mentors');
  }
}

// Public: student submits a new question
app.post('/api/questions', validateContactField, async (req, res) => {
  try {
    const { studentName, studentEmail, contact, contactType, subject, question, assignedMentorId } = req.body || {};
    if (!studentName || !subject || !question) {
      return res.status(400).json({ message: 'studentName, subject and question are required' });
    }
    
    console.log('📝 Received new question submission:');
    console.log(`   Student: ${studentName}`);
    console.log(`   Contact: ${contact} (${contactType})`);
    console.log(`   Subject: ${subject}`);
    
    if (useInMemory) {
      console.log('⚠️  Using in-memory storage (MongoDB not connected)');
      const doc = addInMemoryQuestion({
        studentName,
        studentEmail,
        contact,
        contactType,
        subject,
        question,
        status: assignedMentorId ? 'Assigned' : 'New',
        assignedMentorId: assignedMentorId || undefined,
      });
      res.status(201).json(doc);
    } else {
      const doc = await Question.create({
        studentName,
        studentEmail,
        contact,
        contactType,
        subject,
        question,
        status: assignedMentorId ? 'Assigned' : 'New',
        assignedMentorId: assignedMentorId || undefined,
      });
      console.log('✅ Question saved to MongoDB:');
      console.log(`   ID: ${doc._id}`);
      console.log(`   Database: niyzo`);
      console.log(`   Collection: questions`);
      res.status(201).json(doc);
    }
  } catch (e) {
    console.error('❌ Create question error:', e.message);
    res.status(500).json({ message: 'Failed to create question' });
  }
});

// Protected: list all questions
app.get('/api/questions', requireAuth, async (req, res) => {
  try {
    if (useInMemory) {
      const list = getInMemoryQuestions().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(list);
    } else {
      const list = await Question.find({}).sort({ createdAt: -1 }).lean();
      res.json(list);
    }
  } catch (e) {
    res.status(500).json({ message: 'Failed to load questions' });
  }
});

// Mentor: get own questions
app.get('/api/mentor/questions', requireAuth, async (req, res) => {
  try {
    const mentorId = req.mentorId;
    if (!mentorId) return res.status(401).json({ message: 'Not a mentor' });
    
    if (useInMemory) {
      const questions = inMemoryQuestions.filter(q => q.assignedMentorId === mentorId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(questions);
    } else {
      const questions = await Question.find({ assignedMentorId: mentorId }).sort({ createdAt: -1 }).lean();
      res.json(questions);
    }
  } catch (e) {
    res.status(500).json({ message: 'Failed to load questions' });
  }
});

// Mentor: get own profile
app.get('/api/mentor/profile', requireAuth, async (req, res) => {
  try {
    const mentorId = req.mentorId;
    if (!mentorId) return res.status(401).json({ message: 'Not a mentor' });
    
    if (useInMemory) {
      const mentor = inMemoryMentors.find(m => m._id === mentorId);
      if (!mentor) return res.status(404).json({ message: 'Mentor not found' });
      res.json(mentor);
    } else {
      const mentor = await Mentor.findById(mentorId).lean();
      if (!mentor) return res.status(404).json({ message: 'Mentor not found' });
      res.json(mentor);
    }
  } catch (e) {
    res.status(500).json({ message: 'Failed to load profile' });
  }
});

// Protected: update question status/assignment
app.patch('/api/questions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const patch = req.body || {};
    
    if (useInMemory) {
      const updated = updateInMemoryQuestion(id, patch);
      if (!updated) return res.status(404).json({ message: 'Not found' });
      res.json(updated);
    } else {
      const updated = await Question.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
      if (!updated) return res.status(404).json({ message: 'Not found' });
      res.json(updated);
    }
  } catch (e) {
    res.status(500).json({ message: 'Failed to update question' });
  }
});

// Protected: mentors
app.get('/api/mentors', requireAuth, async (req, res) => {
  try {
    if (useInMemory) {
      const list = getInMemoryMentors().sort((a, b) => a.name.localeCompare(b.name));
      res.json(list);
    } else {
      const list = await Mentor.find({}).sort({ name: 1 }).lean();
      res.json(list);
    }
  } catch (e) {
    res.status(500).json({ message: 'Failed to load mentors' });
  }
});

// Public mentors list for student selection
app.get('/api/public/mentors', async (req, res) => {
  try {
    if (useInMemory) {
      const list = getInMemoryMentors().sort((a, b) => a.name.localeCompare(b.name));
      res.json(list);
    } else {
      const list = await Mentor.find({}).sort({ name: 1 }).lean();
      res.json(list);
    }
  } catch (e) {
    res.status(500).json({ message: 'Failed to load mentors' });
  }
});

app.get('/api/health', async (req, res) => {
  const dbOk = useInMemory ? false : mongoose.connection.readyState === 1;
  res.json({ ok: true, dbOk, useInMemory });
});

app.listen(PORT, async () => {
  try {
    await seedMentors();
  } catch {}
  console.log('\n' + '='.repeat(60));
  console.log('🚀 API SERVER STARTED');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📊 Database: MongoDB (niyzo)`);
  console.log(`📬 Connection: ${MONGODB_URI}`);
  console.log('='.repeat(60) + '\n');
});

// Mentor CRUD
app.post('/api/mentors', requireAuth, async (req, res) => {
  try {
    const { name, subject, university = '', status = 'Available', email, password } = req.body || {};
    if (!name || !subject) return res.status(400).json({ message: 'name and subject are required' });
    const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase();
    
    if (useInMemory) {
      const doc = addInMemoryMentor({ name, subject, university, status, initials, email: email || `mentor-${Date.now()}@skillverse.local`, password: password || 'default123' });
      res.status(201).json(doc);
    } else {
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
    }
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
    
    if (useInMemory) {
      const updated = updateInMemoryMentor(id, patch);
      if (!updated) return res.status(404).json({ message: 'Not found' });
      res.json(updated);
    } else {
      const updated = await Mentor.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
      if (!updated) return res.status(404).json({ message: 'Not found' });
      res.json(updated);
    }
  } catch (e) {
    res.status(500).json({ message: 'Failed to update mentor' });
  }
});

app.delete('/api/mentors/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (useInMemory) {
      const deleted = deleteInMemoryMentor(id);
      if (!deleted) return res.status(404).json({ message: 'Not found' });
      res.json({ ok: true });
    } else {
      await Mentor.findByIdAndDelete(id);
      res.json({ ok: true });
    }
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete mentor' });
  }
});

// Public: list resolved questions with mentor name
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
    res.status(500).json({ message: 'Failed to load resolved answers' });
  }
});
