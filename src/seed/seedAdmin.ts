import mongoose from 'mongoose';
import { User } from '../app/modules/user/user.model';
import config from '../config';
import { USER_ROLES } from '../enums/user';
import { logger } from '../shared/logger';
import colors from 'colors';

const adminData = {
  name: 'Administrator',
  phone: config.super_admin.phone,
  email: config.super_admin.email,
  role: USER_ROLES.SUPER_ADMIN,
  password: config.super_admin.password,
  verified: true,
};

// Function to seed admin user
const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({
      phone: adminData.phone,
    });

    if (existingAdmin) {
      logger.info(
        colors.yellow('ℹ️ Admin user already exists. Skipping creation...')
      );
      return;
    }

    // Do NOT hash here - let the model pre-save hook handle it
    const adminUser = { ...adminData };

    // Create only the admin user
    await User.create(adminUser);
    logger.info(colors.green('✨ Admin user created successfully ✨'));
  } catch (err) {
    logger.error(colors.red('💥 Error creating admin user: 💥'), err);
    throw err;
  }
};

// Connect to MongoDB
mongoose.connect(config.database_url as string);

const seedSuperAdmin = async () => {
  try {
    logger.info(colors.cyan('🎨 Admin seeding started 🎨'));

    // Seed only admin user
    await seedAdmin();
    logger.info(colors.green('🎉 Admin seeding completed successfully! 🎉'));
    logger.info(colors.cyan(`📱 Admin Phone: ${adminData.phone}`));
    logger.info(
      colors.yellow('⚠️  Regular users will register via app signup')
    );
  } catch (error) {
    logger.error(colors.red('🔥 Error in admin seeding: 🔥'), error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seedSuperAdmin();
// npm run seed
