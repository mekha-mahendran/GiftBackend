import express from 'express';
import { 
  ScanCommand, 
  GetCommand, 
  QueryCommand, 
  PutCommand, 
  DeleteCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, TABLES } from '../config/aws.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all products (with optional search, category, mood filters)
router.get('/', async (req, res) => {
  try {
    const { category, search, mood, sort, limit = 50 } = req.query;

    const scanParams = {
      TableName: TABLES.PRODUCTS,
      Limit: parseInt(limit, 10)
    };

    const filterExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    if (category && category !== 'all') {
      filterExpressions.push('#cat = :category');
      expressionAttributeNames['#cat'] = 'category';
      expressionAttributeValues[':category'] = category;
    }

    if (mood) {
      filterExpressions.push('contains(#moods, :mood)');
      expressionAttributeNames['#moods'] = 'moodTags';
      expressionAttributeValues[':mood'] = mood;
    }

    if (filterExpressions.length > 0) {
      scanParams.FilterExpression = filterExpressions.join(' AND ');
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    const result = await dynamoDocClient.send(new ScanCommand(scanParams));
    let items = result.Items || [];

    // In-memory text search fallback if search query passed
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sort === 'price-low') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price-high') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'popular') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    res.json({
      success: true,
      count: items.length,
      products: items
    });
  } catch (err) {
    console.warn('Notice: Using in-memory fallback catalog for products query:', err.message);
    const { FALLBACK_PRODUCTS } = await import('../config/fallbackStore.js');
    let items = [...FALLBACK_PRODUCTS];

    const { category, search, sort } = req.query;
    if (category && category !== 'all') {
      items = items.filter(p => p.category === category);
    }
    if (search) {
      const q = search.toLowerCase().trim();
      items = items.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.description && p.description.toLowerCase().includes(q)));
    }
    if (sort === 'price-low') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price-high') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    res.json({
      success: true,
      count: items.length,
      products: items,
      source: 'fallback'
    });
  }
});

// Get single product by slug or id
router.get('/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;

    // 1. Try fetching directly by ID
    const directRes = await dynamoDocClient.send(new GetCommand({
      TableName: TABLES.PRODUCTS,
      Key: { id: slugOrId }
    }));

    if (directRes.Item) {
      return res.json({ success: true, product: directRes.Item });
    }

    // 2. Query via slug-index GSI
    const slugRes = await dynamoDocClient.send(new QueryCommand({
      TableName: TABLES.PRODUCTS,
      IndexName: 'slug-index',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: { ':slug': slugOrId }
    }));

    if (slugRes.Items && slugRes.Items.length > 0) {
      return res.json({ success: true, product: slugRes.Items[0] });
    }

    res.status(404).json({ success: false, message: 'Product not found' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving product: ' + err.message });
  }
});

// Create product (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const productData = req.body;
    const id = productData.id || `prod-${Date.now()}`;
    const slug = productData.slug || productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const newProduct = {
      ...productData,
      id,
      slug,
      rating: productData.rating || 4.9,
      reviewCount: productData.reviewCount || 1,
      createdAt: new Date().toISOString()
    };

    await dynamoDocClient.send(new PutCommand({
      TableName: TABLES.PRODUCTS,
      Item: newProduct
    }));

    res.status(201).json({ success: true, product: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating product: ' + err.message });
  }
});

// Update product (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await dynamoDocClient.send(new GetCommand({
      TableName: TABLES.PRODUCTS,
      Key: { id }
    }));

    if (!existing.Item) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updatedProduct = {
      ...existing.Item,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await dynamoDocClient.send(new PutCommand({
      TableName: TABLES.PRODUCTS,
      Item: updatedProduct
    }));

    res.json({ success: true, product: updatedProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating product: ' + err.message });
  }
});

// Delete product (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await dynamoDocClient.send(new DeleteCommand({
      TableName: TABLES.PRODUCTS,
      Key: { id }
    }));

    res.json({ success: true, message: 'Product deleted from DynamoDB' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting product: ' + err.message });
  }
});

export default router;
