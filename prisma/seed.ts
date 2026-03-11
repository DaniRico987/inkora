import { PrismaClient, UserType, UserStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = (process.env.DATABASE_URL || '').replace(
  'localhost',
  '127.0.0.1',
);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding root user using PG adapter...');

  const rootEmail = process.env.ROOT_EMAIL || 'root@inkora.com';
  const rootPassword = process.env.ROOT_PASSWORD || 'RootPassword123!';
  const rootDni = process.env.ROOT_DNI || '0000000000';
  const rootFirstName = process.env.ROOT_FIRST_NAME || 'Root';
  const rootLastName = process.env.ROOT_LAST_NAME || 'Admin';
  const rootUsername = process.env.ROOT_USERNAME || 'root';

  try {
    // Check if root user already exists
    const existingRoot = await prisma.user.findFirst({
      where: {
        OR: [{ email: rootEmail }, { username: rootUsername }],
      },
    });

    if (existingRoot) {
      console.log('Root user already exists. Skipping...');
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rootPassword, salt);

    // Create root user
    const root = await prisma.user.create({
      data: {
        dni: rootDni,
        firstName: rootFirstName,
        lastName: rootLastName,
        email: rootEmail,
        username: rootUsername,
        passwordHash,
        birthDate: new Date('1990-01-01'),
        userType: UserType.root as any, // Cast if enum mismatch
        status: UserStatus.active as any,
      },
    });

    console.log(`Root user created successfully: ${root.email}`);
  } catch (error) {
    console.error('An error occurred during seeding:');
    console.error(error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
