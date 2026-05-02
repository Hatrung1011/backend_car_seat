import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import brandRoutes from './routes/brands.js';
import categoryRoutes from './routes/categories.js';
import uploadRoutes from './routes/upload.js';
import { migrate } from './db/migrate.js';
import { ensureAdminAndSeed } from './db/ensureAdmin.js';
import { requireJwtSecret } from './lib/jwt.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, 'data', 'uploads');

const app = express();
const PORT = process.env.PORT || 3001;

requireJwtSecret();

const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);
app.use(
    cors({
        origin: corsOrigins?.length ? corsOrigins : true,
        credentials: true,
    })
);
app.use((req, res, next) => {
    if (req.path.startsWith('/api/upload') && req.method === 'POST') return next();
    express.json({ limit: '10mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

fs.mkdirSync(path.join(UPLOAD_ROOT, 'products'), { recursive: true });
app.use('/uploads', express.static(UPLOAD_ROOT));

app.use(express.static(path.join(__dirname, 'public')));

app.use(authMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/upload', uploadRoutes);
app.get('/api/health', async (req, res) => {
    res.json({ success: true, status: 'ok' });
});

app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

async function start() {
    await migrate();
    await ensureAdminAndSeed();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running at http://0.0.0.0:${PORT}`);
        console.log(`Uploads: ${UPLOAD_ROOT}`);
    });
}

start().catch((err) => {
    console.error(err);
    process.exit(1);
});

export default app;
