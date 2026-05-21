import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

const SELECT_JOIN = `
    SELECT p.id, p.slug, p.name, p.brand_id, p.category_id, p.age_range, p.weight, p.price,
           p.badge, p.badge_type, p.colors, p.images, p.features, p.description, p.highlights, p.specs, p.created_at,
           b.name AS brand_name, c.slug AS category_slug, c.name AS category_name
    FROM products p
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN categories c ON c.id = p.category_id
`;

function mapProduct(row) {
    if (!row) return null;
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        brand_id: row.brand_id,
        category_id: row.category_id,
        age_range: row.age_range,
        weight: row.weight,
        price: row.price,
        badge: row.badge,
        badge_type: row.badge_type,
        colors: row.colors,
        images: row.images,
        features: row.features,
        description: row.description,
        highlights: row.highlights,
        specs: row.specs,
        created_at: row.created_at,
        brand: row.brand_name,
        category: row.category_slug,
        category_name: row.category_name,
    };
}

async function getProductById(id) {
    const { rows } = await pool.query(`${SELECT_JOIN} WHERE p.id = $1`, [id]);
    return rows[0] ? mapProduct(rows[0]) : null;
}

async function getProductBySlug(slug) {
    const { rows } = await pool.query(`${SELECT_JOIN} WHERE p.slug = $1`, [slug]);
    return rows[0] ? mapProduct(rows[0]) : null;
}

router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        const params = [];
        const where = ['1=1'];
        let i = 1;

        if (category && category !== 'all') {
            const catId = parseInt(category, 10);
            if (!Number.isNaN(catId)) {
                where.push(`p.category_id = $${i++}`);
                params.push(catId);
            } else {
                where.push(`c.slug = $${i++}`);
                params.push(category);
            }
        }

        if (search) {
            const pat = `%${search}%`;
            where.push(`(p.name ILIKE $${i} OR p.description ILIKE $${i + 1})`);
            params.push(pat, pat);
            i += 2;
        }

        const sql = `${SELECT_JOIN} WHERE ${where.join(' AND ')} ORDER BY p.id ASC`;
        const { rows } = await pool.query(sql, params);
        res.json({ success: true, data: rows.map(mapProduct) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/by-slug/:slug', async (req, res) => {
    try {
        const data = await getProductBySlug(req.params.slug);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const data = await getProductById(req.params.id);
        if (!data) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const d = sanitizeProductData(req.body);
        const { rows } = await pool.query(
            `INSERT INTO products (
                slug, name, brand_id, category_id, age_range, weight, price,
                badge, badge_type, colors, images, features, description, highlights, specs
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14::jsonb,$15::jsonb)
            RETURNING id`,
            [
                d.slug,
                d.name,
                d.brand_id,
                d.category_id,
                d.age_range,
                d.weight,
                d.price,
                d.badge,
                d.badge_type,
                JSON.stringify(d.colors),
                JSON.stringify(d.images),
                JSON.stringify(d.features),
                d.description,
                JSON.stringify(d.highlights),
                JSON.stringify(d.specs),
            ]
        );
        const data = await getProductById(rows[0].id);
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const d = sanitizeProductData(req.body);
        const { rowCount } = await pool.query(
            `UPDATE products SET
                slug=$1, name=$2, brand_id=$3, category_id=$4, age_range=$5, weight=$6, price=$7,
                badge=$8, badge_type=$9, colors=$10::jsonb, images=$11::jsonb, features=$12::jsonb,
                description=$13, highlights=$14::jsonb, specs=$15::jsonb
            WHERE id=$16`,
            [
                d.slug,
                d.name,
                d.brand_id,
                d.category_id,
                d.age_range,
                d.weight,
                d.price,
                d.badge,
                d.badge_type,
                JSON.stringify(d.colors),
                JSON.stringify(d.images),
                JSON.stringify(d.features),
                d.description,
                JSON.stringify(d.highlights),
                JSON.stringify(d.specs),
                req.params.id,
            ]
        );
        if (!rowCount) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        const data = await getProductById(req.params.id);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        if (!rowCount) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

function sanitizeProductData(body) {
    const {
        slug,
        name,
        brand_id,
        age_range,
        weight,
        price,
        badge,
        badge_type,
        colors,
        images,
        category_id,
        features,
        description,
        highlights,
        specs,
    } = body;

    return {
        slug,
        name,
        brand_id: brand_id ? parseInt(brand_id, 10) : null,
        age_range,
        weight,
        price,
        badge: badge || null,
        badge_type: badge_type || null,
        colors: colors || [],
        images: images || [],
        category_id: category_id ? parseInt(category_id, 10) : null,
        features: features || [],
        description: description || '',
        highlights: highlights || [],
        specs: specs || {},
    };
}

export default router;
