import { PrismaClient, UserType, UserStatus, BookCondition, StoreStatus } from '@prisma/client';
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

type SeedBook = {
  title: string;
  author: string;
  publicationYear: number;
  publisher: string;
  isbn: string;
  language: string;
  pageCount: number;
  price: string;
  condition: BookCondition;
  description: string;
  coverUrl: string;
  previewUrl: string;
  categoryNames: string[];
};

const books: SeedBook[] = [
  {
    title: 'Cien años de soledad',
    author: 'Gabriel García Márquez',
    publicationYear: 1967,
    publisher: 'Sudamericana',
    isbn: '9780307474728',
    language: 'Español',
    pageCount: 496,
    price: '24.90',
    condition: BookCondition.new,
    description: 'Saga familiar en Macondo que marcó el realismo mágico latinoamericano.',
    coverUrl: 'https://images.inkora.dev/books/cien-anos-de-soledad.jpg',
    previewUrl: 'https://preview.inkora.dev/books/cien-anos-de-soledad',
    categoryNames: ['Novela', 'Fantasía'],
  },
  {
    title: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes',
    publicationYear: 1605,
    publisher: 'Francisco de Robles',
    isbn: '9788420412146',
    language: 'Español',
    pageCount: 1056,
    price: '29.50',
    condition: BookCondition.used,
    description: 'Clásico fundacional de la novela moderna sobre idealismo y realidad.',
    coverUrl: 'https://images.inkora.dev/books/don-quijote.jpg',
    previewUrl: 'https://preview.inkora.dev/books/don-quijote',
    categoryNames: ['Novela', 'Historia'],
  },
  {
    title: 'Rayuela',
    author: 'Julio Cortázar',
    publicationYear: 1963,
    publisher: 'Sudamericana',
    isbn: '9788437604572',
    language: 'Español',
    pageCount: 736,
    price: '21.75',
    condition: BookCondition.new,
    description: 'Novela experimental con lectura abierta y estructura no lineal.',
    coverUrl: 'https://images.inkora.dev/books/rayuela.jpg',
    previewUrl: 'https://preview.inkora.dev/books/rayuela',
    categoryNames: ['Novela', 'Filosofía'],
  },
  {
    title: 'Ficciones',
    author: 'Jorge Luis Borges',
    publicationYear: 1944,
    publisher: 'Sur',
    isbn: '9788420674209',
    language: 'Español',
    pageCount: 224,
    price: '18.40',
    condition: BookCondition.new,
    description: 'Colección de cuentos sobre laberintos, espejos y metafísica.',
    coverUrl: 'https://images.inkora.dev/books/ficciones.jpg',
    previewUrl: 'https://preview.inkora.dev/books/ficciones',
    categoryNames: ['Cuento', 'Filosofía'],
  },
  {
    title: 'La ciudad y los perros',
    author: 'Mario Vargas Llosa',
    publicationYear: 1963,
    publisher: 'Seix Barral',
    isbn: '9788466326001',
    language: 'Español',
    pageCount: 432,
    price: '20.20',
    condition: BookCondition.used,
    description: 'Retrato crítico de la disciplina militar y la violencia juvenil.',
    coverUrl: 'https://images.inkora.dev/books/la-ciudad-y-los-perros.jpg',
    previewUrl: 'https://preview.inkora.dev/books/la-ciudad-y-los-perros',
    categoryNames: ['Novela', 'Juvenil'],
  },
  {
    title: 'Pedro Páramo',
    author: 'Juan Rulfo',
    publicationYear: 1955,
    publisher: 'Fondo de Cultura Económica',
    isbn: '9786071606976',
    language: 'Español',
    pageCount: 144,
    price: '16.30',
    condition: BookCondition.new,
    description: 'Novela breve donde los vivos dialogan con un pueblo de fantasmas.',
    coverUrl: 'https://images.inkora.dev/books/pedro-paramo.jpg',
    previewUrl: 'https://preview.inkora.dev/books/pedro-paramo',
    categoryNames: ['Novela', 'Misterio y suspenso'],
  },
  {
    title: 'El Aleph',
    author: 'Jorge Luis Borges',
    publicationYear: 1949,
    publisher: 'Losada',
    isbn: '9788420674216',
    language: 'Español',
    pageCount: 224,
    price: '17.95',
    condition: BookCondition.used,
    description: 'Cuentos que exploran infinito, memoria y paradojas del lenguaje.',
    coverUrl: 'https://images.inkora.dev/books/el-aleph.jpg',
    previewUrl: 'https://preview.inkora.dev/books/el-aleph',
    categoryNames: ['Cuento', 'Fantasía'],
  },
  {
    title: 'Veinte poemas de amor y una canción desesperada',
    author: 'Pablo Neruda',
    publicationYear: 1924,
    publisher: 'Nascimento',
    isbn: '9788437604947',
    language: 'Español',
    pageCount: 96,
    price: '14.60',
    condition: BookCondition.new,
    description: 'Poemario esencial de la lírica hispanoamericana del siglo XX.',
    coverUrl: 'https://images.inkora.dev/books/veinte-poemas.jpg',
    previewUrl: 'https://preview.inkora.dev/books/veinte-poemas',
    categoryNames: ['Poesía', 'Romance'],
  },
  {
    title: 'Antología poética',
    author: 'Alfonsina Storni',
    publicationYear: 1938,
    publisher: 'Losada',
    isbn: '9789500301084',
    language: 'Español',
    pageCount: 208,
    price: '15.80',
    condition: BookCondition.used,
    description: 'Selección de poemas sobre identidad, amor y emancipación.',
    coverUrl: 'https://images.inkora.dev/books/antologia-storni.jpg',
    previewUrl: 'https://preview.inkora.dev/books/antologia-storni',
    categoryNames: ['Poesía', 'Desarrollo personal'],
  },
  {
    title: 'La vida es sueño',
    author: 'Pedro Calderón de la Barca',
    publicationYear: 1635,
    publisher: 'Imprenta del Reino',
    isbn: '9788491050162',
    language: 'Español',
    pageCount: 224,
    price: '13.90',
    condition: BookCondition.new,
    description: 'Drama filosófico sobre libertad, destino y apariencia.',
    coverUrl: 'https://images.inkora.dev/books/la-vida-es-sueno.jpg',
    previewUrl: 'https://preview.inkora.dev/books/la-vida-es-sueno',
    categoryNames: ['Teatro', 'Filosofía'],
  },
  {
    title: 'Fuenteovejuna',
    author: 'Lope de Vega',
    publicationYear: 1619,
    publisher: 'Viuda de Alonso Martín',
    isbn: '9788467033649',
    language: 'Español',
    pageCount: 192,
    price: '12.75',
    condition: BookCondition.used,
    description: 'Obra teatral sobre justicia colectiva frente al abuso de poder.',
    coverUrl: 'https://images.inkora.dev/books/fuenteovejuna.jpg',
    previewUrl: 'https://preview.inkora.dev/books/fuenteovejuna',
    categoryNames: ['Teatro', 'Historia'],
  },
  {
    title: 'Meditaciones',
    author: 'Marco Aurelio',
    publicationYear: 180,
    publisher: 'Akal',
    isbn: '9788446036203',
    language: 'Español',
    pageCount: 256,
    price: '16.10',
    condition: BookCondition.new,
    description: 'Reflexiones estoicas sobre ética, disciplina y serenidad.',
    coverUrl: 'https://images.inkora.dev/books/meditaciones.jpg',
    previewUrl: 'https://preview.inkora.dev/books/meditaciones',
    categoryNames: ['Filosofía', 'Autoayuda'],
  },
  {
    title: 'Ética para Amador',
    author: 'Fernando Savater',
    publicationYear: 1991,
    publisher: 'Ariel',
    isbn: '9788434411418',
    language: 'Español',
    pageCount: 216,
    price: '17.25',
    condition: BookCondition.new,
    description: 'Introducción clara a la ética para jóvenes y adultos.',
    coverUrl: 'https://images.inkora.dev/books/etica-para-amador.jpg',
    previewUrl: 'https://preview.inkora.dev/books/etica-para-amador',
    categoryNames: ['Filosofía', 'Educación'],
  },
  {
    title: 'Breve historia del tiempo',
    author: 'Stephen Hawking',
    publicationYear: 1988,
    publisher: 'Bantam Books',
    isbn: '9780553380163',
    language: 'Español',
    pageCount: 256,
    price: '22.30',
    condition: BookCondition.used,
    description: 'Panorama de cosmología moderna explicado para público general.',
    coverUrl: 'https://images.inkora.dev/books/breve-historia-del-tiempo.jpg',
    previewUrl: 'https://preview.inkora.dev/books/breve-historia-del-tiempo',
    categoryNames: ['Ciencia', 'Física'],
  },
  {
    title: 'El gen egoísta',
    author: 'Richard Dawkins',
    publicationYear: 1976,
    publisher: 'Oxford University Press',
    isbn: '9780198788607',
    language: 'Español',
    pageCount: 544,
    price: '23.10',
    condition: BookCondition.new,
    description: 'Obra influyente sobre evolución y selección natural.',
    coverUrl: 'https://images.inkora.dev/books/el-gen-egoista.jpg',
    previewUrl: 'https://preview.inkora.dev/books/el-gen-egoista',
    categoryNames: ['Ciencia', 'Biología'],
  },
  {
    title: 'Cosmos',
    author: 'Carl Sagan',
    publicationYear: 1980,
    publisher: 'Planeta',
    isbn: '9788408065210',
    language: 'Español',
    pageCount: 384,
    price: '24.00',
    condition: BookCondition.used,
    description: 'Viaje por el universo y la historia del pensamiento científico.',
    coverUrl: 'https://images.inkora.dev/books/cosmos.jpg',
    previewUrl: 'https://preview.inkora.dev/books/cosmos',
    categoryNames: ['Ciencia', 'Historia'],
  },
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    publicationYear: 2008,
    publisher: 'Prentice Hall',
    isbn: '9780132350884',
    language: 'Inglés',
    pageCount: 464,
    price: '31.50',
    condition: BookCondition.new,
    description: 'Buenas prácticas para escribir software mantenible y legible.',
    coverUrl: 'https://images.inkora.dev/books/clean-code.jpg',
    previewUrl: 'https://preview.inkora.dev/books/clean-code',
    categoryNames: ['Programación', 'Tecnología'],
  },
  {
    title: 'Design Patterns',
    author: 'Erich Gamma',
    publicationYear: 1994,
    publisher: 'Addison-Wesley',
    isbn: '9780201633610',
    language: 'Inglés',
    pageCount: 416,
    price: '34.90',
    condition: BookCondition.used,
    description: 'Catálogo de patrones de diseño orientado a objetos.',
    coverUrl: 'https://images.inkora.dev/books/design-patterns.jpg',
    previewUrl: 'https://preview.inkora.dev/books/design-patterns',
    categoryNames: ['Programación', 'Manuales técnicos'],
  },
  {
    title: 'You Don\'t Know JS Yet',
    author: 'Kyle Simpson',
    publicationYear: 2020,
    publisher: 'O\'Reilly Media',
    isbn: '9781091210097',
    language: 'Inglés',
    pageCount: 336,
    price: '27.40',
    condition: BookCondition.new,
    description: 'Profundización en fundamentos y comportamiento interno de JavaScript.',
    coverUrl: 'https://images.inkora.dev/books/you-dont-know-js-yet.jpg',
    previewUrl: 'https://preview.inkora.dev/books/you-dont-know-js-yet',
    categoryNames: ['Programación', 'Tecnología'],
  },
  {
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    publicationYear: 2009,
    publisher: 'MIT Press',
    isbn: '9780262033848',
    language: 'Inglés',
    pageCount: 1312,
    price: '45.00',
    condition: BookCondition.used,
    description: 'Referencia completa de algoritmos y estructuras de datos.',
    coverUrl: 'https://images.inkora.dev/books/introduction-to-algorithms.jpg',
    previewUrl: 'https://preview.inkora.dev/books/introduction-to-algorithms',
    categoryNames: ['Programación', 'Matemáticas'],
  },
  {
    title: 'Álgebra lineal y sus aplicaciones',
    author: 'David C. Lay',
    publicationYear: 2015,
    publisher: 'Pearson',
    isbn: '9786073231190',
    language: 'Español',
    pageCount: 608,
    price: '28.70',
    condition: BookCondition.new,
    description: 'Fundamentos de álgebra lineal con aplicaciones en ingeniería.',
    coverUrl: 'https://images.inkora.dev/books/algebra-lineal.jpg',
    previewUrl: 'https://preview.inkora.dev/books/algebra-lineal',
    categoryNames: ['Matemáticas', 'Educación'],
  },
  {
    title: 'Cálculo de una variable',
    author: 'James Stewart',
    publicationYear: 2012,
    publisher: 'Cengage Learning',
    isbn: '9786074817911',
    language: 'Español',
    pageCount: 960,
    price: '30.60',
    condition: BookCondition.used,
    description: 'Texto académico para cursos de cálculo diferencial e integral.',
    coverUrl: 'https://images.inkora.dev/books/calculo-de-una-variable.jpg',
    previewUrl: 'https://preview.inkora.dev/books/calculo-de-una-variable',
    categoryNames: ['Matemáticas', 'Guías de estudio'],
  },
  {
    title: 'Principios de economía',
    author: 'N. Gregory Mankiw',
    publicationYear: 2018,
    publisher: 'Cengage Learning',
    isbn: '9786075266015',
    language: 'Español',
    pageCount: 896,
    price: '32.10',
    condition: BookCondition.new,
    description: 'Introducción integral a microeconomía y macroeconomía.',
    coverUrl: 'https://images.inkora.dev/books/principios-de-economia.jpg',
    previewUrl: 'https://preview.inkora.dev/books/principios-de-economia',
    categoryNames: ['Economía', 'Educación'],
  },
  {
    title: 'Padre rico, padre pobre',
    author: 'Robert T. Kiyosaki',
    publicationYear: 1997,
    publisher: 'Plataforma',
    isbn: '9788403522626',
    language: 'Español',
    pageCount: 256,
    price: '19.20',
    condition: BookCondition.used,
    description: 'Perspectivas sobre educación financiera y mentalidad de inversión.',
    coverUrl: 'https://images.inkora.dev/books/padre-rico-padre-pobre.jpg',
    previewUrl: 'https://preview.inkora.dev/books/padre-rico-padre-pobre',
    categoryNames: ['Finanzas', 'Negocios'],
  },
  {
    title: 'La estrategia del océano azul',
    author: 'W. Chan Kim',
    publicationYear: 2005,
    publisher: 'Harvard Business Review Press',
    isbn: '9781633691377',
    language: 'Español',
    pageCount: 320,
    price: '26.40',
    condition: BookCondition.new,
    description: 'Marco estratégico para crear mercados sin competencia directa.',
    coverUrl: 'https://images.inkora.dev/books/oceano-azul.jpg',
    previewUrl: 'https://preview.inkora.dev/books/oceano-azul',
    categoryNames: ['Negocios', 'Marketing'],
  },
  {
    title: 'Neuromarketing',
    author: 'Néstor Braidot',
    publicationYear: 2005,
    publisher: 'Gestión 2000',
    isbn: '9788498750492',
    language: 'Español',
    pageCount: 352,
    price: '22.80',
    condition: BookCondition.used,
    description: 'Aplicación de neurociencia al comportamiento del consumidor.',
    coverUrl: 'https://images.inkora.dev/books/neuromarketing.jpg',
    previewUrl: 'https://preview.inkora.dev/books/neuromarketing',
    categoryNames: ['Marketing', 'Psicología'],
  },
  {
    title: 'El cuerpo lleva la cuenta',
    author: 'Bessel van der Kolk',
    publicationYear: 2014,
    publisher: 'Viking',
    isbn: '9780143127741',
    language: 'Español',
    pageCount: 464,
    price: '27.90',
    condition: BookCondition.new,
    description: 'Estudio sobre trauma psicológico y procesos de recuperación.',
    coverUrl: 'https://images.inkora.dev/books/el-cuerpo-lleva-la-cuenta.jpg',
    previewUrl: 'https://preview.inkora.dev/books/el-cuerpo-lleva-la-cuenta',
    categoryNames: ['Psicología', 'Medicina'],
  },
  {
    title: 'Manual de farmacología clínica',
    author: 'Bertram G. Katzung',
    publicationYear: 2019,
    publisher: 'McGraw-Hill',
    isbn: '9781456260613',
    language: 'Español',
    pageCount: 1248,
    price: '39.50',
    condition: BookCondition.used,
    description: 'Referencia médica sobre uso racional y seguro de fármacos.',
    coverUrl: 'https://images.inkora.dev/books/manual-farmacologia-clinica.jpg',
    previewUrl: 'https://preview.inkora.dev/books/manual-farmacologia-clinica',
    categoryNames: ['Medicina', 'Manuales técnicos'],
  },
  {
    title: 'Constitución Política comentada',
    author: 'Juan Carlos Esguerra',
    publicationYear: 2016,
    publisher: 'Legis',
    isbn: '9789587675108',
    language: 'Español',
    pageCount: 680,
    price: '33.20',
    condition: BookCondition.new,
    description: 'Análisis doctrinal y práctico de normas constitucionales.',
    coverUrl: 'https://images.inkora.dev/books/constitucion-politica-comentada.jpg',
    previewUrl: 'https://preview.inkora.dev/books/constitucion-politica-comentada',
    categoryNames: ['Derecho', 'Documentos legales'],
  },
  {
    title: 'Cómo ganar amigos e influir sobre las personas',
    author: 'Dale Carnegie',
    publicationYear: 1936,
    publisher: 'Simon & Schuster',
    isbn: '9780671027032',
    language: 'Español',
    pageCount: 320,
    price: '18.90',
    condition: BookCondition.used,
    description: 'Guía clásica de comunicación interpersonal y liderazgo.',
    coverUrl: 'https://images.inkora.dev/books/como-ganar-amigos.jpg',
    previewUrl: 'https://preview.inkora.dev/books/como-ganar-amigos',
    categoryNames: ['Autoayuda', 'Desarrollo personal'],
  },
  {
    title: 'Hábitos atómicos',
    author: 'James Clear',
    publicationYear: 2018,
    publisher: 'Avery',
    isbn: '9780735211292',
    language: 'Español',
    pageCount: 320,
    price: '23.80',
    condition: BookCondition.new,
    description: 'Método práctico para construir hábitos sostenibles en el tiempo.',
    coverUrl: 'https://images.inkora.dev/books/habitos-atomicos.jpg',
    previewUrl: 'https://preview.inkora.dev/books/habitos-atomicos',
    categoryNames: ['Autoayuda', 'Desarrollo personal'],
  },
  {
    title: 'Sapiens: De animales a dioses',
    author: 'Yuval Noah Harari',
    publicationYear: 2011,
    publisher: 'Debate',
    isbn: '9780062316097',
    language: 'Español',
    pageCount: 496,
    price: '25.60',
    condition: BookCondition.new,
    description: 'Historia sintética de la humanidad y sus grandes transformaciones.',
    coverUrl: 'https://images.inkora.dev/books/sapiens.jpg',
    previewUrl: 'https://preview.inkora.dev/books/sapiens',
    categoryNames: ['Historia', 'Investigación académica'],
  },
];

const connectionString = (process.env.DATABASE_URL || '').replace(
  'localhost',
  '127.0.0.1',
);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

const DEFAULT_USD_TO_COP_RATE = 4000;
const usdToCopRate = Number(process.env.SEED_USD_TO_COP_RATE || DEFAULT_USD_TO_COP_RATE.toString());

function toCopPrice(price: string): string {
  const amount = Number(price);

  if (Number.isNaN(amount)) {
    throw new Error(`Invalid seed price: ${price}`);
  }

  return (amount * usdToCopRate).toFixed(2);
}

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

  const seededCategories = await prisma.category.findMany({
    where: { name: { in: categories.map((category) => category.name) } },
    select: { categoryId: true, name: true },
    orderBy: { categoryId: 'asc' },
  });

  console.log('Category IDs:');
  seededCategories.forEach((category) => {
    console.log(`- ${category.categoryId}: ${category.name}`);
  });

  console.log('Categories seeded successfully.');
}

async function seedBooks() {
  console.log(`Seeding ${books.length} books...`);

  const invalidBooks = books.filter((book) => book.categoryNames.length !== 2);
  if (invalidBooks.length > 0) {
    throw new Error(
      `Each book must have exactly 2 categories. Invalid books: ${invalidBooks
        .map((book) => book.title)
        .join(', ')}`,
    );
  }

  const uniqueCategoryNames = [...new Set(books.flatMap((book) => book.categoryNames))];
  const existingCategories = await prisma.category.findMany({
    where: { name: { in: uniqueCategoryNames } },
    select: { categoryId: true, name: true },
  });

  const categoryIdByName = new Map(existingCategories.map((category) => [category.name, category.categoryId]));
  const missingCategories = uniqueCategoryNames.filter((name) => !categoryIdByName.has(name));

  if (missingCategories.length > 0) {
    throw new Error(`Missing categories required for books seed: ${missingCategories.join(', ')}`);
  }

  await prisma.$transaction(
    books.map((book) => {
      const categoryIds = book.categoryNames.map((name) => categoryIdByName.get(name)!);
      const categoryLinks = categoryIds.map((categoryId) => ({
        category: {
          connect: { categoryId },
        },
      }));

      return prisma.book.upsert({
        where: { isbn: book.isbn },
        update: {
          title: book.title,
          author: book.author,
          publicationYear: book.publicationYear,
          publisher: book.publisher,
          language: book.language,
          pageCount: book.pageCount,
          price: toCopPrice(book.price),
          condition: book.condition,
          description: book.description,
          coverUrl: book.coverUrl,
          previewUrl: book.previewUrl,
          isAvailable: true,
          bookCategories: {
            deleteMany: {},
            create: categoryLinks,
          },
        },
        create: {
          title: book.title,
          author: book.author,
          publicationYear: book.publicationYear,
          publisher: book.publisher,
          isbn: book.isbn,
          language: book.language,
          pageCount: book.pageCount,
          price: toCopPrice(book.price),
          condition: book.condition,
          description: book.description,
          coverUrl: book.coverUrl,
          previewUrl: book.previewUrl,
          isAvailable: true,
          bookCategories: {
            create: categoryLinks,
          },
        },
      });
    }),
  );

  const seededBooks = await prisma.book.findMany({
    where: { isbn: { in: books.map((book) => book.isbn) } },
    select: {
      bookId: true,
      title: true,
      isbn: true,
      bookCategories: {
        select: {
          categoryId: true,
        },
        orderBy: {
          categoryId: 'asc',
        },
      },
    },
    orderBy: { bookId: 'asc' },
  });

  console.log('Book IDs and linked category IDs:');
  seededBooks.forEach((book) => {
    const linkedCategoryIds = book.bookCategories.map((item) => item.categoryId).join(', ');
    console.log(`- ${book.bookId}: ${book.title} (${book.isbn}) -> [${linkedCategoryIds}]`);
  });

  console.log('Books seeded successfully.');
}

async function seedInventory() {
  console.log('Seeding inventory with varied quantities...');

  const defaultStore = await prisma.store.upsert({
    where: { storeId: 1 },
    update: {
      name: 'Inkora Centro Pereira',
      address: 'Carrera 7 #15-23, Centro',
      city: 'Pereira',
      latitude: 4.8133,
      longitude: -75.6961,
      status: StoreStatus.active,
      capacity: 5000,
    },
    create: {
      storeId: 1,
      name: 'Inkora Centro Pereira',
      address: 'Carrera 7 #15-23, Centro',
      city: 'Pereira',
      latitude: 4.8133,
      longitude: -75.6961,
      status: StoreStatus.active,
      capacity: 5000,
    },
  });

  // Agregar tienda 2: Inkora Mall del Café
  await prisma.store.upsert({
    where: { storeId: 2 },
    update: {
      name: 'Inkora Mall del Café',
      address: 'Av. Circunvalar #1-23, Mall del Café',
      city: 'Pereira',
      latitude: 4.8047,
      longitude: -75.6885,
      status: StoreStatus.active,
      capacity: 3000,
    },
    create: {
      storeId: 2,
      name: 'Inkora Mall del Café',
      address: 'Av. Circunvalar #1-23, Mall del Café',
      city: 'Pereira',
      latitude: 4.8047,
      longitude: -75.6885,
      status: StoreStatus.active,
      capacity: 3000,
    },
  });

  // Agregar tienda 3: Inkora Villa Country
  await prisma.store.upsert({
    where: { storeId: 3 },
    update: {
      name: 'Inkora Villa Country',
      address: 'Calle 23 #5-45, Villa Country',
      city: 'Pereira',
      latitude: 4.7956,
      longitude: -75.6812,
      status: StoreStatus.active,
      capacity: 2000,
    },
    create: {
      storeId: 3,
      name: 'Inkora Villa Country',
      address: 'Calle 23 #5-45, Villa Country',
      city: 'Pereira',
      latitude: 4.7956,
      longitude: -75.6812,
      status: StoreStatus.active,
      capacity: 2000,
    },
  });

  await syncStoreSequence();

  const seededIsbns = books.map((book) => book.isbn);
  const existingBooks = await prisma.book.findMany({
    where: { isbn: { in: seededIsbns } },
    select: { bookId: true, isbn: true },
    orderBy: { bookId: 'asc' },
  });

  if (existingBooks.length === 0) {
    console.log('No seeded books found for inventory. Skipping...');
    return;
  }

  await prisma.$transaction(
    existingBooks.map((book, index) => {
      const quantity = ((index * 7) % 60) + 1;

      return prisma.inventory.upsert({
        where: {
          bookId_storeId: {
            bookId: book.bookId,
            storeId: defaultStore.storeId,
          },
        },
        update: {
          availableQuantity: quantity,
          reservedQuantity: 0,
        },
        create: {
          bookId: book.bookId,
          storeId: defaultStore.storeId,
          availableQuantity: quantity,
          reservedQuantity: 0,
        },
      });
    }),
  );

  console.log(`Inventory seeded successfully for ${existingBooks.length} books in store ${defaultStore.storeId}.`);
}

async function syncStoreSequence() {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('store', 'storeId'),
      COALESCE((SELECT MAX("storeId") FROM "store"), 0),
      true
    )
  `);
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

    if (mode === 'all') {
      await seedBooks();
      await seedInventory();
    }
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
