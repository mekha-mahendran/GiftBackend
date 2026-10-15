import express from 'express';
import { GetCommand, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, TABLES } from '../config/aws.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Validate Coupon Code
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;
    const clean = (code || '').toUpperCase().trim();

    // 1. Check DynamoDB Coupons table
    try {
      const dbRes = await dynamoDocClient.send(new GetCommand({
        TableName: TABLES.COUPONS,
        Key: { code: clean }
      }));

      if (dbRes.Item) {
        const cp = dbRes.Item;
        if (cp.minOrder && subtotal < cp.minOrder) {
          return res.status(400).json({ success: false, message: `Minimum order amount of ₹${cp.minOrder} required for this coupon.` });
        }

        let discountAmount = 0;
        if (cp.discountType === 'percentage') {
          discountAmount = Math.round(subtotal * (cp.value / 100));
        } else if (cp.discountType === 'fixed') {
          discountAmount = Math.min(subtotal, cp.value);
        } else if (cp.discountType === 'shipping') {
          discountAmount = 49;
        }

        return res.json({
          success: true,
          code: clean,
          discountType: cp.discountType,
          value: cp.value,
          discountAmount
        });
      }
    } catch (dbErr) {
      console.warn('DynamoDB coupon check fallback:', dbErr.message);
    }

    // 2. Default standard boutique promo codes fallback
    if (clean === 'WELCOME10') {
      return res.json({ success: true, code: clean, discountType: 'percentage', value: 10, discountAmount: Math.round(subtotal * 0.1) });
    } else if (clean === 'SMILE50') {
      if (subtotal < 299) {
        return res.status(400).json({ success: false, message: 'Minimum order of ₹299 required for SMILE50.' });
      }
      return res.json({ success: true, code: clean, discountType: 'fixed', value: 50, discountAmount: 50 });
    } else if (clean === 'FREESHIP') {
      return res.json({ success: true, code: clean, discountType: 'shipping', value: 0, discountAmount: 49 });
    } else if (clean === 'CUTE10') {
      return res.json({ success: true, code: clean, discountType: 'percentage', value: 10, discountAmount: Math.round(subtotal * 0.1) });
    }

    return res.status(400).json({ success: false, message: 'Invalid or expired coupon code.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error validating coupon: ' + err.message });
  }
});

// Admin: List all coupons
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await dynamoDocClient.send(new ScanCommand({
      TableName: TABLES.COUPONS
    }));

    res.json({
      success: true,
      coupons: result.Items || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve coupons: ' + err.message });
  }
});

// Admin: Create/Update coupon
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { code, discountType, value, minOrder, maxUses } = req.body;
    const clean = code.toUpperCase().trim();

    const coupon = {
      code: clean,
      discountType: discountType || 'percentage',
      value: Number(value) || 10,
      minOrder: Number(minOrder) || 0,
      maxUses: Number(maxUses) || 1000,
      createdAt: new Date().toISOString()
    };

    await dynamoDocClient.send(new PutCommand({
      TableName: TABLES.COUPONS,
      Item: coupon
    }));

    res.status(201).json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error saving coupon: ' + err.message });
  }
});

export default router;
