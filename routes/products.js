import { Router } from 'express';
import supabase from '../db/supabase.js';

const router = Router();

// GET /api/products — List all products
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;

        let query = supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        if (search) {
            query = query.or(
                `name.ilike.%${search}%,brand.ilike.%${search}%,description.ilike.%${search}%`
            );
        }

        const { data, error } = await query;

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/products/:id — Get single product
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/products — Create product
router.post('/', async (req, res) => {
    try {
        const productData = sanitizeProductData(req.body);

        const { data, error } = await supabase
            .from('products')
            .insert(productData)
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/products/:id — Update product
router.put('/:id', async (req, res) => {
    try {
        const productData = sanitizeProductData(req.body);

        const { data, error } = await supabase
            .from('products')
            .update(productData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/products/:id — Delete product
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper: sanitize and extract known fields
function sanitizeProductData(body) {
    const {
        slug,
        name,
        brand,
        age_range,
        weight,
        price,
        badge,
        badge_type,
        colors,
        images,
        category,
        features,
        description,
        highlights,
        specs,
    } = body;

    return {
        slug,
        name,
        brand,
        age_range,
        weight,
        price,
        badge: badge || null,
        badge_type: badge_type || null,
        colors: colors || [],
        images: images || [],
        category,
        features: features || [],
        description: description || '',
        highlights: highlights || [],
        specs: specs || {},
    };
}

export default router;
