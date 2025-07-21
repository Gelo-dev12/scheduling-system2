const mongoose = require('mongoose');

const finalizedScheduleSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  weekStart: { type: String, required: true }, // Format: YYYY-MM-DD
  finalized: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('FinalizedSchedule', finalizedScheduleSchema);
