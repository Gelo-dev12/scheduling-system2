const Employee = require('../models/Employee');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Branch = require('../models/Branch');

const employeeController = {
  // Add an employee to a branch
  async add(req, res) {
    try {
      console.log('Add Employee - req.params:', req.params);
      console.log('Add Employee - req.body:', req.body);
      const { branchId } = req.params;
      const { firstName, lastName, email, phone, role, employmentType, hoursPerWeek } = req.body;
      console.log('Checking required fields:', firstName, lastName, email, role);
      if (!firstName || !lastName || !email || !role) {
        console.log('Missing required fields!');
        return res.status(400).json({ error: 'Missing required fields' });
      }
      console.log('Passed required fields check');
      console.log('typeof branchId:', typeof branchId);
      console.log('branchId (raw):', JSON.stringify(branchId));
      console.log('branchId length:', branchId.length);
      console.log('branchId regex test:', /^[a-fA-F0-9]{24}$/.test(branchId));
      // TEMP: Comment out branchId validation for debugging
      // if (!mongoose.Types.ObjectId.isValid(branchId)) {
      //   return res.status(400).json({ error: 'Invalid branchId format' });
      // }
      // if (!branchId || typeof branchId !== 'string' || branchId.length !== 24 || !/^[a-fA-F0-9]{24}$/.test(branchId)) {
      //   return res.status(400).json({ error: 'Invalid branchId format (manual check)' });
      // }
      // Use branchId directly
      // Find branch and role config for rate (case-insensitive)
      const branch = await Branch.findById(branchId);
      if (!branch) {
        return res.status(404).json({ error: 'Branch not found' });
      }
      const roleConfig = Array.isArray(branch.roles)
        ? branch.roles.find(r => r.name.toLowerCase() === role.toLowerCase())
        : null;
      console.log('Looking for role:', role, 'Found config:', roleConfig);
      if (!roleConfig) {
        return res.status(400).json({ error: `Role '${role}' not found in branch configuration` });
      }
      const rate = roleConfig.hourlyRate;
      console.log('Employee rate to be saved:', rate);
      // Enforce max employees per role
      const maxCount = roleConfig.count;
      const currentCount = await Employee.countDocuments({ branch: branchId, role: { $regex: new RegExp(`^${role}$`, 'i') } });
      if (typeof maxCount === 'number' && currentCount >= maxCount) {
        return res.status(400).json({ error: `Cannot add more employees for role '${role}'. Maximum of ${maxCount} reached.` });
      }
      // Generate random password
      const generatePassword = (length = 10) => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let pass = '';
        for (let i = 0; i < length; i++) {
          pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pass;
      };
      const tempPassword = generatePassword(10);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      // Convert phone number to +63 format if it starts with 09
      let formattedPhone = phone;
      if (typeof phone === 'string' && phone.startsWith('09') && phone.length === 11) {
        formattedPhone = '+63' + phone.slice(1);
      }
      const employee = new Employee({
        firstName,
        lastName,
        email,
        phone: formattedPhone,
        role,
        branch: branchId,
        employmentType,
        password: hashedPassword,
        rate,
        hoursPerWeek: typeof hoursPerWeek === 'number' ? hoursPerWeek : 40
      });
      try {
        await employee.save();
        // --- SYNC TO USER MODEL ---
        const User = require('../models/User');
        const existingUser = await User.findOne({ email: employee.email });
        if (!existingUser) {
          try {
            const user = new User({
              name: `${employee.firstName} ${employee.lastName}`,
              email: employee.email,
              password: tempPassword, // unhashed, User model will hash it
              role: 'employee',
              branch: employee.branch,
              phone: formattedPhone
            });
            await user.save();
          } catch (userError) {
            console.error('User sync error:', userError);
            // Optionally, delete the employee if user creation fails
            await Employee.findByIdAndDelete(employee._id);
            return res.status(400).json({ error: 'User sync failed', details: userError.message });
          }
        }
        // Send email with temp password
        let emailError = null;
        try {
          console.log('Email configuration:', {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS ? '***' : 'NOT SET'
          });

          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            },
            secure: false,
            tls: {
              rejectUnauthorized: false
            }
          });

          // Verify transporter configuration
          await transporter.verify();
          console.log('Email transporter verified successfully');

          const mailOptions = {
            from: `"Crab N Bites Scheduling System" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to Crab N Bites - Your Account is Ready!',
            text: `Hi ${firstName},\n\nWelcome to Crab N Bites! Your employee account has been successfully created.\n\nYour login credentials:\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in to the mobile app and change your password for security.\n\nBest regards,\nCrab N Bites Management Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h1 style="color: #2c5aa0; margin: 0; font-size: 24px;">🦀 Crab N Bites</h1>
                  <p style="color: #666; margin: 5px 0;">Employee Scheduling System</p>
                </div>

                <div style="border-top: 2px solid #2c5aa0; padding-top: 20px;">
                  <h2 style="color: #333; margin-bottom: 15px;">Welcome, ${firstName}! 👋</h2>

                  <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                    Your employee account has been successfully created in our scheduling system.
                    You can now access your work schedule and manage your shifts.
                  </p>

                  <div style="background-color: #f8f9fa; border-left: 4px solid #2c5aa0; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <h3 style="color: #2c5aa0; margin: 0 0 10px 0; font-size: 16px;">Your Login Credentials</h3>
                    <p style="margin: 5px 0; color: #333;"><strong>Email:</strong> ${email}</p>
                    <p style="margin: 5px 0; color: #333;"><strong>Temporary Password:</strong> <span style="background-color: #fff3cd; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${tempPassword}</span></p>
                  </div>

                  <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #0c5460; font-size: 14px;">
                      <strong>🔒 Security Note:</strong> Please change your password immediately after your first login for security purposes.
                    </p>
                  </div>

                  <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                    If you have any questions or need assistance, please contact your manager or the HR department.
                  </p>

                  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                      Best regards,<br>
                      <strong>Crab N Bites Management Team</strong>
                    </p>
                    <p style="color: #999; margin: 5px 0 0 0; font-size: 12px;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                  </div>
                </div>
              </div>
            `
          };

          const result = await transporter.sendMail(mailOptions);
          console.log('Email sent successfully:', result.messageId);
        } catch (err) {
          console.error('Failed to send email to employee:', err);
          console.error('Error details:', {
            code: err.code,
            command: err.command,
            response: err.response,
            responseCode: err.responseCode
          });
          emailError = err.message;
        }
        console.log('Employee created successfully:', employee);
        // After saving new employee
        const io = req.app.get('io');
        if (io) {
          io.emit('employee_added', { branchId, employee });
        }
        res.status(201).json({ employee, emailError });
      } catch (error) {
        console.error('Add Employee Error:', error);
        if (error.name === 'ValidationError') {
          return res.status(400).json({ error: 'Validation error', details: error.message });
        }
        res.status(500).json({ error: 'Failed to add employee', details: error.message });
      }
    } catch (error) {
      console.error('Add Employee Error:', error);
      res.status(500).json({ error: 'Failed to add employee', details: error.message });
    }
  },

  // List all employees for a branch
  async list(req, res) {
    try {
      const { branchId } = req.params;
      const employees = await Employee.find({ branch: branchId }).populate('branch');
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch employees', details: error.message });
    }
  },

  // Delete an employee by ID
  async delete(req, res) {
    try {
      const { employeeId } = req.params;
      const employee = await Employee.findByIdAndDelete(employeeId);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete employee', details: error.message });
    }
  },

  // Bulk update hoursPerWeek for multiple employees
  async bulkUpdateHours(req, res) {
    try {
      const { updates } = req.body; // [{ employeeId, hoursPerWeek }]
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: 'Updates must be an array' });
      }
      const results = [];
      for (const update of updates) {
        console.log('Bulk update:', update); // Log the update being processed
        if (!update.employeeId || typeof update.hoursPerWeek !== 'number') continue;
        const employee = await Employee.findByIdAndUpdate(
          update.employeeId,
          { hoursPerWeek: update.hoursPerWeek },
          { new: true }
        );
        if (employee) results.push(employee);
        else console.log('Employee not found for ID:', update.employeeId); // Log if not found
      }
      res.json({ updated: results.length, employees: results });
    } catch (error) {
      res.status(500).json({ error: 'Failed to bulk update hours', details: error.message });
    }
  },

  // Test email configuration
  async testEmail(req, res) {
    try {
      const { testEmail } = req.body;
      if (!testEmail) {
        return res.status(400).json({ error: 'Test email address is required' });
      }

      console.log('Testing email configuration...');
      console.log('Email config:', {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? '***' : 'NOT SET'
      });

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        secure: false,
        tls: {
          rejectUnauthorized: false
        }
      });

      // Test connection
      await transporter.verify();
      console.log('Email transporter verified successfully');

      // Send test email
      const result = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: testEmail,
        subject: 'Test Email - Scheduling System',
        text: 'This is a test email from the scheduling system. If you receive this, email configuration is working correctly.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Test Email</h2>
            <p>This is a test email from the scheduling system.</p>
            <p>If you receive this email, the email configuration is working correctly!</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </div>
        `
      });

      console.log('Test email sent successfully:', result.messageId);
      res.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    } catch (error) {
      console.error('Test email failed:', error);
      res.status(500).json({
        error: 'Failed to send test email',
        details: error.message,
        code: error.code,
        command: error.command,
        response: error.response
      });
    }
  },

  // Mobile app endpoints
  async getEmployeeProfile(req, res) {
    try {
      const { employeeId } = req.params;
      const employee = await Employee.findById(employeeId).populate('branch');
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch employee profile', details: error.message });
    }
  },

  async updateEmployeeProfile(req, res) {
    try {
      const { employeeId } = req.params;
      const { firstName, lastName, phone, hoursPerWeek } = req.body;

      const employee = await Employee.findByIdAndUpdate(
        employeeId,
        { firstName, lastName, phone, hoursPerWeek },
        { new: true }
      );

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update employee profile', details: error.message });
    }
  },

  async changePassword(req, res) {
    try {
      const { employeeId } = req.params;
      const { currentPassword, newPassword } = req.body;

      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, employee.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      employee.password = hashedNewPassword;
      await employee.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to change password', details: error.message });
    }
  }
};

// Sample in-memory shift store (replace with DB in production)
const shifts = [];

// POST /api/shifts
// Body: { branchId, employeeId, startTime, endTime, date }
async function createShift(req, res) {
  try {
    const { branchId, employeeId, startTime, endTime, date } = req.body;
    if (!branchId || !employeeId || !startTime || !endTime || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    const branchLocation = branch.location || '';
    const branchName = branch.name || '';
    const maxHoursPerDay = branch.maxHoursPerDay || 8;
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);
    let shiftDuration = endHour - startHour;
    if (endHour <= startHour) shiftDuration += 24;
    if (shiftDuration > maxHoursPerDay) {
      return res.status(400).json({ error: `Shift exceeds max hours per day (${maxHoursPerDay}h)!` });
    }
    // Save shift to database (not just in-memory)
    const Shift = require('../models/Shift');
    const newShift = await Shift.create({
      id: Date.now().toString(),
      branchId,
      branchName,
      branchLocation,
      employeeId,
      employeeName: '', // You may want to fetch employee name here
      role: '', // You may want to fetch role here
      startTime,
      endTime,
      date,
      status: 'scheduled',
      duration: shiftDuration * 3600 // seconds
    });
    return res.status(201).json({ message: 'Shift created', shift: newShift });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create shift', details: error.message });
  }
}

module.exports = employeeController;
module.exports.createShift = createShift;
