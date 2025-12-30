// createAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User'); // Adjust path based on your structure

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://shubhamlonkar137_db_user:RrwsEdAGURyxAff0@cluster0.zfiqvhw.mongodb.net/?appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Password: (use the password you set during creation)');
      process.exit(0);
    }

    // Create new admin
    const adminData = {
      name: 'Admin',
      email: 'admin@example.com',
      password: 'Admin@123', // You should change this password
      role: 'admin',
      isActive: true,
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
    };

    // Hash password
    const salt = await bcrypt.genSalt(10);
    adminData.password = await bcrypt.hash(adminData.password, salt);

    const admin = new User(adminData);
    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('==============================');
    console.log('Email: admin@example.com');
    console.log('Password: Admin@123');
    console.log('==============================');
    console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
    console.log('To run: node createAdmin.js');

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();
