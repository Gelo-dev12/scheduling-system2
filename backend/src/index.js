const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const database = require('./lib/database');
const authController = require('./controllers/authController');
const dashboardController = require('./controllers/dashboardController');
const branchController = require('./controllers/branchController');
const employeeController = require('./controllers/employeeController');
const Shift = require('./models/Shift');
const FinalizedSchedule = require('./models/FinalizedSchedule');
require('dotenv').config();

// --- SOCKET.IO SETUP ---
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174', // allow Vite dev server on 5174
  'http://localhost:8081',
  'http://localhost:19006',
  'exp://localhost:19000',
  'http://192.168.1.100:8081',
  'https://scheduling-system2-f7r1-git-main-bayanjag12-2322s-projects.vercel.app',
  'https://scheduling-system2-f7r1-dnrp63gya-bayanjag12-2322s-projects.vercel.app'
];

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});
app.set('io', io);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Scheduling System API is running!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Auth routes
const router = express.Router();
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
app.use('/api/auth', router);

// Dashboard routes
app.get('/api/dashboard/summary', dashboardController.summary);

// Branch routes
app.post('/api/branches', branchController.create);
app.get('/api/branches', branchController.list);
app.post('/api/branches/:branchId/employees', employeeController.add);
app.get('/api/branches/:branchId/employees', employeeController.list);
app.get('/api/branches/:branchId', branchController.getOne);
app.put('/api/branches/:branchId/roles', branchController.updateRoles);
app.delete('/api/branches/:branchId', branchController.delete);
app.patch('/api/branches/:branchId/settings', branchController.updateSettings);

// Employee routes
app.delete('/api/employees/:employeeId', employeeController.delete);
app.post('/api/employees/bulk-update-hours', employeeController.bulkUpdateHours);
app.post('/api/employees/test-email', employeeController.testEmail);
app.post('/api/shifts', employeeController.createShift);

// Shifts API: Get all shifts
app.get('/api/shifts', async (req, res) => {
  try {
    const shifts = await Shift.find();
    res.json(shifts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shifts', details: err.message });
  }
});

// DELETE /api/shifts/:id
app.delete('/api/shifts/:id', async (req, res) => {
  try {
    const Shift = require('./models/Shift');
    const result = await Shift.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json({ message: 'Shift deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete shift', details: err.message });
  }
});

// PATCH /api/shifts/:id
app.patch('/api/shifts/:id', async (req, res) => {
  try {
    const Shift = require('./models/Shift');
    const Branch = require('./models/Branch');
    const { startTime, endTime, role, branchId } = req.body;
    const update = {};
    if (startTime) update.startTime = startTime;
    if (endTime) update.endTime = endTime;
    if (role) update.role = role;
    if (branchId) {
      update.branchId = branchId;
      const branch = await Branch.findById(branchId);
      if (branch) {
        update.branchName = branch.name;
        update.branchLocation = branch.location;
      }
    }
    const updated = await Shift.findOneAndUpdate({ id: req.params.id }, update, { new: true });
    if (!updated) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json({ message: 'Shift updated successfully', shift: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update shift', details: err.message });
  }
});

// Get all finalized employees for a week
app.get('/api/finalized', async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) return res.status(400).json({ error: 'weekStart is required' });
    const finalized = await FinalizedSchedule.find({ weekStart, finalized: true });
    res.json(finalized);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch finalized schedules', details: err.message });
  }
});

// Set an employee as finalized for a week
app.post('/api/finalized', async (req, res) => {
  try {
    const { employeeId, weekStart } = req.body;
    if (!employeeId || !weekStart) return res.status(400).json({ error: 'employeeId and weekStart are required' });
    const existing = await FinalizedSchedule.findOne({ employeeId, weekStart });
    let finalized;
    if (existing) {
      existing.finalized = true;
      await existing.save();
      finalized = existing;
    } else {
      finalized = await FinalizedSchedule.create({ employeeId, weekStart, finalized: true });
    }
    // Emit WebSocket event to all clients
    const io = req.app.get('io');
    if (io) {
      io.emit('finalized_added', { employeeId, weekStart });
    }
    res.json({ message: 'Finalized status set', finalized });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set finalized status', details: err.message });
  }
});

// DELETE /api/finalized
app.delete('/api/finalized', async (req, res) => {
  try {
    const { employeeId, weekStart } = req.query;
    if (!employeeId || !weekStart) return res.status(400).json({ error: 'employeeId and weekStart are required' });
    // Calculate the week range (Sunday to Saturday) for the given weekStart
    const weekStartDate = new Date(weekStart);
    weekStartDate.setHours(0, 0, 0, 0);
    // Always get Sunday as start of week
    const sunday = new Date(weekStartDate);
    sunday.setDate(weekStartDate.getDate() - weekStartDate.getDay());
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    // Get all possible weekStart strings for the week (Sunday to Saturday)
    const weekStartStrings = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      weekStartStrings.push(d.toISOString().split('T')[0]);
    }
    // Delete all finalized records for this employee for any weekStart in this week
    const result = await FinalizedSchedule.deleteMany({ employeeId: String(employeeId), weekStart: { $in: weekStartStrings } });
    console.log('DEBUG: DELETE finalized result (all week days):', result);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Finalized record not found' });
    }
    // Emit WebSocket event to all clients
    const io = req.app.get('io');
    if (io) {
      io.emit('finalized_deleted', { employeeId, weekStart });
    }
    res.json({ message: 'Finalized record(s) deleted for the week' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete finalized record', details: err.message });
  }
});

// Mobile app routes
app.get('/api/employees/:employeeId/profile', employeeController.getEmployeeProfile);
app.put('/api/employees/:employeeId/profile', employeeController.updateEmployeeProfile);
app.post('/api/employees/:employeeId/change-password', employeeController.changePassword);

// WebSocket handlers
io.on('connection', (socket) => {
  socket.on('message', async (msg) => {
    if (msg.type === 'SHIFT_ADD') {
      try {
        // Compute duration in seconds
        const { startTime, endTime, branchId } = msg.data;
        // Fetch branch location
        let branchLocation = '';
        if (branchId) {
          const branch = await require('./models/Branch').findById(branchId);
          if (branch && branch.location) branchLocation = branch.location;
        }
        msg.data.branchLocation = branchLocation;
        const [sh, sm = 0, ss = 0] = startTime.split(':').map(Number);
        const [eh, em = 0, es = 0] = endTime.split(':').map(Number);
        const baseDate = new Date('2000-01-01');
        const start = new Date(baseDate);
        start.setHours(sh, sm, ss, 0);
        const end = new Date(baseDate);
        end.setHours(eh, em, es, 0);
        if (end <= start) {
          end.setDate(end.getDate() + 1);
        }
        const diffSeconds = Math.floor((end - start) / 1000);
        msg.data.duration = diffSeconds;
        await Shift.create(msg.data);
      } catch (err) {
        console.error('Error saving shift:', err);
      }
    }
    if (msg.type === 'SHIFT_DELETE') {
      try {
        await Shift.deleteOne({ id: msg.data.id });
      } catch (err) {
        console.error('Error deleting shift:', err);
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
(async () => {
  await database.connect();
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  });
})();

module.exports = app;
