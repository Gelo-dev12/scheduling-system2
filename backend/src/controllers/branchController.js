const Branch = require('../models/Branch');
const Employee = require('../models/Employee');

const branchController = {
  // Create a new branch
  async create(req, res) {
    try {
      const { name, location } = req.body;
      if (!name || !location) {
        return res.status(400).json({ error: 'Name and location are required' });
      }
      const branch = new Branch({ name, location });
      await branch.save();
      res.status(201).json(branch);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create branch', details: error.message });
    }
  },

  // Get all branches
  async list(req, res) {
    try {
      const branches = await Branch.find().sort({ createdAt: -1 });
      res.json(branches);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch branches', details: error.message });
    }
  },

  // Get a branch by ID
  async getOne(req, res) {
    try {
      const branch = await Branch.findById(req.params.branchId);
      if (!branch) return res.status(404).json({ error: 'Branch not found' });
      res.json(branch);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch branch', details: error.message });
    }
  },

  // Delete a branch by ID
  async delete(req, res) {
    try {
      const branch = await Branch.findByIdAndDelete(req.params.branchId);
      if (!branch) return res.status(404).json({ error: 'Branch not found' });
      res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete branch', details: error.message });
    }
  },

  // Update roles for a branch
  async updateRoles(req, res) {
    try {
      const { branchId } = req.params;
      const { roles } = req.body;
      if (!Array.isArray(roles)) {
        return res.status(400).json({ error: 'Roles must be an array' });
      }
      const branch = await Branch.findByIdAndUpdate(
        branchId,
        { roles },
        { new: true }
      );
      if (!branch) return res.status(404).json({ error: 'Branch not found' });

      // Robust: Update all branches' roles in JS to ensure all rates are synced
      const allBranches = await Branch.find();
      for (const roleConfig of roles) {
        for (const branch of allBranches) {
          let updated = false;
          for (const role of branch.roles) {
            if (role.name && role.name.toLowerCase() === roleConfig.name.toLowerCase()) {
              role.hourlyRate = roleConfig.hourlyRate;
              updated = true;
            }
          }
          if (updated) await branch.save();
        }
        // Update all employees with this role
        await Employee.updateMany(
          { role: new RegExp(`^${roleConfig.name}$`, 'i') },
          { $set: { rate: roleConfig.hourlyRate } }
        );
        // Emit socket.io event for role update
        const io = req.app.get('io');
        if (io) {
          io.emit('role_updated', { role: roleConfig.name, hourlyRate: roleConfig.hourlyRate });
        }
      }

      res.json(branch);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update roles', details: error.message });
    }
  },

  // Update branch settings (e.g., maxHoursPerDay, regularEmployeesMaxHoursPerWeek)
  async updateSettings(req, res) {
    try {
      const { branchId } = req.params;
      const { maxHoursPerDay, regularEmployeesMaxHoursPerWeek } = req.body;
      const branch = await Branch.findById(branchId);
      if (!branch) return res.status(404).json({ error: 'Branch not found' });
      if (typeof maxHoursPerDay === 'number') branch.maxHoursPerDay = maxHoursPerDay;
      if (typeof regularEmployeesMaxHoursPerWeek === 'number') branch.regularEmployeesMaxHoursPerWeek = regularEmployeesMaxHoursPerWeek;
      await branch.save();
      res.json(branch);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update branch settings', details: error.message });
    }
  }
};

module.exports = branchController;
