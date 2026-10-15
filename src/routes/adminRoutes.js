import express from 'express';
import { ScanCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, TABLES } from '../config/aws.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Admin Dashboard Overview Stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [productsRes, ordersRes, usersRes, wholesaleRes] = await Promise.all([
      dynamoDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS })),
      dynamoDocClient.send(new ScanCommand({ TableName: TABLES.ORDERS })),
      dynamoDocClient.send(new ScanCommand({ TableName: TABLES.USERS })),
      dynamoDocClient.send(new ScanCommand({ TableName: TABLES.WHOLESALE }))
    ]);

    const products = productsRes.Items || [];
    const orders = ordersRes.Items || [];
    const users = usersRes.Items || [];
    const wholesale = wholesaleRes.Items || [];

    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.pricing?.total) || Number(o.total) || 0), 0);
    const activeOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');

    res.json({
      success: true,
      stats: {
        totalProducts: products.length,
        totalOrders: orders.length,
        activeOrders: activeOrders.length,
        totalCustomers: users.length,
        totalWholesaleInquiries: wholesale.length,
        totalRevenueINR: totalRevenue,
        lowStockItems: products.filter(p => (p.stock || 50) < 10).length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error calculating stats: ' + err.message });
  }
});

// Admin: Get/Set Studio Settings
router.get('/settings', async (req, res) => {
  try {
    const result = await dynamoDocClient.send(new GetCommand({
      TableName: TABLES.SETTINGS,
      Key: { key: 'main_store_settings' }
    }));

    res.json({
      success: true,
      settings: result.Item || {
        storeName: 'GIFTPocket Studio',
        tagline: 'Little Things. Big Smiles. ♡',
        freeShippingThreshold: 499,
        whatsappNumber: '+919842013465',
        enableCustomizer: true
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error loading settings: ' + err.message });
  }
});

router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const settingsData = {
      key: 'main_store_settings',
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await dynamoDocClient.send(new PutCommand({
      TableName: TABLES.SETTINGS,
      Item: settingsData
    }));

    res.json({ success: true, settings: settingsData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating settings: ' + err.message });
  }
});

export default router;
