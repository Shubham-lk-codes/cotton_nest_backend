// createNewAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const createNewAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://shubhamlonkar137_db_user:RrwsEdAGURyxAff0@cluster0.zfiqvhw.mongodb.net/?appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Delete existing admin if exists
    await User.deleteOne({ email: 'admin@example.com' });
    console.log('Deleted existing admin user if existed');

    // Create new admin using User model (so pre-save hook runs)
    const adminUser = new User({
      name: 'Super Admin',
      email: 'admin@example.com',
      password: 'Admin@123', // This will be hashed by pre-save hook
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      permissions: [
        'products:create',
        'products:read',
        'products:update',
        'products:delete',
        'orders:manage',
        'users:manage',
        'categories:manage',
        'analytics:view'
      ]
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully using User model!');
    console.log('==============================');
    console.log('Email: admin@example.com');
    console.log('Password: Admin@123');
    console.log('==============================');
    
    // Verify the password was hashed
    const savedUser = await User.findOne({ email: 'admin@example.com' }).select('+password');
    console.log('Password stored:', savedUser.password ? `HASHED (${savedUser.password.length} chars)` : 'NOT STORED');
    
    // Test password comparison
    const testPassword = await bcrypt.compare('Admin@123', savedUser.password);
    console.log('Password test result:', testPassword ? '✅ PASS' : '❌ FAIL');

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createNewAdmin();