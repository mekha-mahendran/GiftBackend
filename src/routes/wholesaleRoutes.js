import express from 'express';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, TABLES } from '../config/aws.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Submit wholesale reseller application or inquiry
router.post('/inquire', async (req, res) => {
  try {
    const { 
      businessName, 
      contactPerson, 
      phone, 
      email, 
      city, 
      state, 
      businessType, 
      expectedVolume, 
      notes 
    } = req.body;

    const inquiryId = `ws-${Date.now()}`;

    const newInquiry = {
      id: inquiryId,
      businessName,
      contactPerson,
      phone,
      email: (email || '').toLowerCase().trim(),
      city,
      state,
      businessType: businessType || 'Boutique Store',
      expectedVolume: expectedVolume || '50-100 pcs/month',
      notes: notes || '',
      status: 'Pending Review',
      createdAt: new Date().toISOString()
    };

    await dynamoDocClient.send(new PutCommand({
      TableName: TABLES.WHOLESALE,
      Item: newInquiry
    }));

    res.status(201).json({
      success: true,
      message: 'Wholesale inquiry registered! Our partnership desk will reach out within 24 hours.',
      inquiry: newInquiry
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit inquiry: ' + err.message });
  }
});

// Admin: Get all wholesale applications
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await dynamoDocClient.send(new ScanCommand({
      TableName: TABLES.WHOLESALE
    }));

    res.json({
      success: true,
      count: result.Items ? result.Items.length : 0,
      inquiries: result.Items || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving wholesale inquiries: ' + err.message });
  }
});

export default router;
