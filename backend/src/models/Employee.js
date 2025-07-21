const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, unique: true },
  phone: { type: String, trim: true },
  role: { type: String, required: true, trim: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  employmentType: { type: String, enum: ['regular', 'part-time'], default: 'regular' },
  password: { type: String },
  rate: { type: Number },
  hoursPerWeek: { type: Number, default: 40 },
}, {
  timestamps: true
});

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
