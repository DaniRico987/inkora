import { PrismaClient, UserType, UserStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const categories = [
  { name: 'Novela', description: 'Obras narrativas de ficción de extensión amplia.' },
  { name: 'Cuento', description: 'Narraciones breves de ficción o tradición oral.' },
  { name: 'Poesía', description: 'Obras literarias en verso o prosa poética.' },
  { name: 'Teatro', description: 'Textos dramáticos y obras para representación escénica.' },
  { name: 'Ensayo', description: 'Textos argumentativos y reflexivos sobre diversos temas.' },
  { name: 'Biografía', description: 'Relatos sobre la vida de una persona escritos por terceros.' },
  { name: 'Autobiografía', description: 'Relatos sobre la vida del propio autor.' },
  { name: 'Historia', description: 'Libros y documentos sobre hechos y procesos históricos.' },
  { name: 'Filosofía', description: 'Obras sobre pensamiento filosófico, ética y lógica.' },
  { name: 'Psicología', description: 'Material sobre conducta, mente y desarrollo humano.' },
  { name: 'Religión y espiritualidad', description: 'Textos religiosos, doctrinales y de reflexión espiritual.' },
  { name: 'Ciencia', description: 'Divulgación y fundamentos generales de ciencias.' },
  { name: 'Tecnología', description: 'Contenidos sobre innovación, sistemas y herramientas tecnológicas.' },
  { name: 'Programación', description: 'Libros técnicos sobre desarrollo de software y lenguajes.' },
  { name: 'Matemáticas', description: 'Textos de cálculo, álgebra, estadística y otras áreas matemáticas.' },
  { name: 'Física', description: 'Material académico y divulgativo sobre física.' },
  { name: 'Química', description: 'Libros y documentos sobre química general y aplicada.' },
  { name: 'Biología', description: 'Material sobre organismos vivos, genética y ecosistemas.' },
  { name: 'Medicina', description: 'Textos médicos, clínicos y de salud.' },
  { name: 'Derecho', description: 'Normativa, doctrina, jurisprudencia y estudios jurídicos.' },
  { name: 'Economía', description: 'Obras sobre teoría económica y contexto financiero.' },
  { name: 'Negocios', description: 'Libros y documentos sobre gestión empresarial y emprendimiento.' },
  { name: 'Marketing', description: 'Contenidos de mercadeo, marca, publicidad y estrategia comercial.' },
  { name: 'Finanzas', description: 'Textos sobre finanzas personales, corporativas e inversión.' },
  { name: 'Educación', description: 'Material pedagógico, didáctico y de formación.' },
  { name: 'Infantil', description: 'Libros orientados a la primera infancia y lectores iniciales.' },
  { name: 'Juvenil', description: 'Libros dirigidos a adolescentes y jóvenes lectores.' },
  { name: 'Fantasía', description: 'Narrativas con mundos imaginarios y elementos sobrenaturales.' },
  { name: 'Ciencia ficción', description: 'Ficción basada en avances científicos o tecnológicos hipotéticos.' },
  { name: 'Misterio y suspenso', description: 'Historias centradas en enigmas, investigación y tensión narrativa.' },
  { name: 'Romance', description: 'Narrativas enfocadas en relaciones afectivas y sentimentales.' },
  { name: 'Terror', description: 'Obras diseñadas para provocar miedo o inquietud.' },
  { name: 'Autoayuda', description: 'Libros orientados al bienestar personal y hábitos de mejora.' },
  { name: 'Desarrollo personal', description: 'Textos sobre liderazgo, productividad y crecimiento individual.' },
  { name: 'Arte y diseño', description: 'Obras sobre artes visuales, creatividad y diseño.' },
  { name: 'Fotografía', description: 'Material técnico y artístico sobre fotografía.' },
  { name: 'Arquitectura', description: 'Libros y documentos sobre diseño arquitectónico y urbanismo.' },
  { name: 'Cocina', description: 'Recetarios, técnicas culinarias y gastronomía.' },
  { name: 'Viajes', description: 'Guías, crónicas y material sobre destinos y turismo.' },
  { name: 'Idiomas', description: 'Material para aprendizaje y práctica de lenguas.' },
  { name: 'Diccionarios', description: 'Obras de consulta léxica, terminológica o bilingüe.' },
  { name: 'Enciclopedias', description: 'Obras de referencia general o especializada.' },
  { name: 'Manuales técnicos', description: 'Documentación operativa, técnica o de mantenimiento.' },
  { name: 'Guías de estudio', description: 'Material de apoyo para cursos, exámenes y aprendizaje estructurado.' },
  { name: 'Tesis', description: 'Trabajos académicos de grado, maestría o doctorado.' },
  { name: 'Investigación académica', description: 'Artículos, papers y documentos de investigación formal.' },
  { name: 'Revistas', description: 'Publicaciones periódicas temáticas o informativas.' },
  { name: 'Periódicos', description: 'Publicaciones periódicas de actualidad y noticias.' },
  { name: 'Informes', description: 'Documentos de análisis, seguimiento o resultados.' },
  { name: 'Documentos legales', description: 'Contratos, normas, actas y otros documentos jurídicos.' },
  { name: 'Documentos administrativos', description: 'Formatos, circulares, memorandos y documentos de gestión.' },
  { name: 'Presentaciones', description: 'Material de apoyo expositivo y presentaciones estructuradas.' },
  { name: 'Catálogos', description: 'Compendios de productos, colecciones o referencias.' },
];

const connectionString = (process.env.DATABASE_URL || '').replace(
  'localhost',
  '127.0.0.1',
);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function seedRootUser() {
  console.log('Seeding root user using PG adapter...');

  const rootEmail = process.env.ROOT_EMAIL || 'root@inkora.com';
  const rootPassword = process.env.ROOT_PASSWORD || 'RootPassword123!';
  const rootDni = process.env.ROOT_DNI || '0000000000';
  const rootFirstName = process.env.ROOT_FIRST_NAME || 'Root';
  const rootLastName = process.env.ROOT_LAST_NAME || 'Admin';
  const rootUsername = process.env.ROOT_USERNAME || 'root';

  const existingRoot = await prisma.user.findFirst({
    where: {
      OR: [{ email: rootEmail }, { username: rootUsername }],
    },
  });

  if (existingRoot) {
    console.log('Root user already exists. Skipping...');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(rootPassword, salt);

  const root = await prisma.user.create({
    data: {
      dni: rootDni,
      firstName: rootFirstName,
      lastName: rootLastName,
      email: rootEmail,
      username: rootUsername,
      passwordHash,
      birthDate: new Date('1990-01-01'),
      userType: UserType.root as any,
      status: UserStatus.active as any,
    },
  });

  console.log(`Root user created successfully: ${root.email}`);
}

async function seedCategories() {
  console.log(`Seeding ${categories.length} categories...`);

  await prisma.$transaction(
    categories.map((category) =>
      prisma.category.upsert({
        where: { name: category.name },
        update: {
          description: category.description,
        },
        create: category,
      }),
    ),
  );

  console.log('Categories seeded successfully.');
}

function getSeedMode(): 'all' | 'categories' {
  const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
  if (!onlyArg) {
    return 'all';
  }

  const value = onlyArg.split('=')[1]?.trim().toLowerCase();
  if (value === 'categories') {
    return 'categories';
  }

  throw new Error(`Unsupported seed mode: ${value}. Use --only=categories.`);
}

async function main() {
  try {
    const mode = getSeedMode();

    if (mode === 'all') {
      await seedRootUser();
    }

    await seedCategories();
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
