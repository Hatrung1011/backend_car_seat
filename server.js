import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import productRoutes from './routes/products.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static admin files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/products', productRoutes);

// Serve admin page for all non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Start server (only in local dev, not on Vercel)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
        console.log(`📦 Admin CMS: http://localhost:${PORT}`);
        console.log(`📡 API: http://localhost:${PORT}/api/products`);
    });
}

// Export for Vercel serverless
export default app;
