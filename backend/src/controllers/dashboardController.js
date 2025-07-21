const User = require('../models/User');
const Employee = require('../models/Employee');
const Branch = require('../models/Branch');
// const Schedule = require('../models/Schedule');
// const TimeOff = require('../models/TimeOff');

const dashboardController = {
  async summary(req, res) {
    try {
      // User stats
      const totalUsers = await User.countDocuments();
      const totalEmployees = await Employee.countDocuments();
      const totalManagers = await User.countDocuments({ role: 'manager' });
      const totalAdmins = await User.countDocuments({ role: 'admin' });

      // Branch stats
      const totalBranches = await Branch.countDocuments();

      // Placeholder for other stats (to be implemented when models exist)
      const totalSchedules = 0; // await Schedule.countDocuments();
      const pendingTimeOffRequests = 0; // await TimeOff.countDocuments({ status: 'pending' });

      res.json({
        users: {
          total: totalUsers,
          employees: totalEmployees,
          managers: totalManagers,
          admins: totalAdmins
        },
        branches: {
          total: totalBranches
        },
        schedules: {
          total: totalSchedules
        },
        timeOffRequests: {
          pending: pendingTimeOffRequests
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard summary', details: error.message });
    }
  }
};

module.exports = dashboardController;
