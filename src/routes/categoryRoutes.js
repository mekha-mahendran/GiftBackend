import express from 'express';
import { ScanCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, TABLES } from '../config/aws.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const result = await dynamoDocClient.send(new ScanCommand({
      TableName: TABLES.CATEGORIES
    }));

    res.json({
      success: true,
      count: result.Items ? result.Items.length : 0,
      categories: result.Items || []
    });
  } catch (err) {
    const { FALLBACK_CATEGORIES } = await import('../config/fallbackStore.js');
    res.json({
      success: true,
      count: FALLBACK_CATEGORIES.length,
      categories: FALLBACK_CATEGORIES,
      source: 'fallback'
    });
  }
});

// Create/Update category (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { id, name, slug, description, image, color } = req.body;
    const catId = id || `cat-${Date.now()}`;
    const catSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const categoryItem = {
      id: catId,
      name,
      slug: catSlug,
      description: description || '',
      image: image || '',
      color: color || '#DFD7CB',
      itemCount: req.body.itemCount || 10,
      updatedAt: new Date().toISOString()
    };

    await dynamoDocClient.send(new PutCommand({
      TableName: TABLES.CATEGORIES,
      Item: categoryItem
    }));

    res.status(201).json({ success: true, category: categoryItem });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error saving category: ' + err.message });
  }
});

export default router;
