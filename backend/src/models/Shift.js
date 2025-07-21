const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
  id: { type: String, required: true },
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  role: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, required: true },
  branchId: { type: String, required: true },
  branchName: { type: String, required: true },
  branchLocation: { type: String, required: false },
  fromBranchId: { type: String },
  fromBranchName: { type: String },
  duration: { type: Number }, // duration in seconds
});

module.exports = mongoose.model('Shift', ShiftSchema);
