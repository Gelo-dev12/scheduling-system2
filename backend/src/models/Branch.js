const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  roles: [
    {
      name: { type: String, required: true },
      count: { type: Number, required: true },
      hourlyRate: { type: Number, required: true },
      color: { type: String }
    }
  ],
  maxHoursPerDay: { type: Number, default: 8 },
  regularEmployeesMaxHoursPerWeek: { type: Number, default: 40 }
}, {
  timestamps: true
});

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
