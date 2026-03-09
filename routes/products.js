import { Router } from 'express';
import supabase from '../db/supabase.js';

const router = Router();

// Helper: flatten joined product data for backward-compatible API response
function flattenProduct(p) {
    return {
        ...p,
        brand: p.brands ? p.brands.name : null,
        brand_id: p.brand_id,
        category: p.categories ? p.categories.slug : null,
        category_name: p.categories ? p.categories.name : null,
        category_id: p.category_id,
        brands: undefined,
        categories: undefined,
    };
}

// GET /api/products — List all products
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;

        let query = supabase
            .from('products')
            .select('*, brands(id, name), categories(id, name, slug)')
            .order('id', { ascending: true });

        if (category && category !== 'all') {
            // Support filtering by category_id (number) or category slug (string)
            const catId = parseInt(category);
            if (!isNaN(catId)) {
                query = query.eq('category_id', catId);
            } else {
                // Filter by slug — need to use the categories relation
                query = query.eq('categories.slug', category);
            }
        }

        if (search) {
            query = query.or(
                `name.ilike.%${search}%,description.ilike.%${search}%`
            );
        }

        const { data, error } = await query;

        if (error) throw error;

        // Filter out products where category filter via slug didn't match
        let result = data;
        if (category && category !== 'all' && isNaN(parseInt(category))) {
            result = data.filter(p => p.categories && p.categories.slug === category);
        }

        res.json({ success: true, data: result.map(flattenProduct) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/products/:id — Get single product
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*, brands(id, name), categories(id, name, slug)')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        res.json({ success: true, data: flattenProduct(data) });
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
            .select('*, brands(id, name), categories(id, name, slug)')
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data: flattenProduct(data) });
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
            .select('*, brands(id, name), categories(id, name, slug)')
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        res.json({ success: true, data: flattenProduct(data) });
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
        brand_id: brand_id ? parseInt(brand_id) : null,
        age_range,
        weight,
        price,
        badge: badge || null,
        badge_type: badge_type || null,
        colors: colors || [],
        images: images || [],
        category_id: category_id ? parseInt(category_id) : null,
        features: features || [],
        description: description || '',
        highlights: highlights || [],
        specs: specs || {},
    };
}

export default router;
