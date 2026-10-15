import express from 'express';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, TABLES } from '../config/aws.js';

const router = express.Router();

// Save customized charm design state
router.post('/save', async (req, res) => {
  try {
    const { designState, previewImage, title } = req.body;
    const designId = `dsg-${Math.floor(100000 + Math.random() * 900000)}`;

    const customDesign = {
      id: designId,
      title: title || 'Custom Atelier Charm',
      designState,
      previewImage: previewImage || '',
      createdAt: new Date().toISOString()
    };

    await dynamoDocClient.send(new PutCommand({
      TableName: TABLES.CUSTOM_DESIGNS,
      Item: customDesign
    }));

    res.status(201).json({
      success: true,
      designId,
      design: customDesign
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error saving studio design: ' + err.message });
  }
});

// Retrieve customized design by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await dynamoDocClient.send(new GetCommand({
      TableName: TABLES.CUSTOM_DESIGNS,
      Key: { id }
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, message: 'Custom design not found' });
    }

    res.json({ success: true, design: result.Item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving design: ' + err.message });
  }
});

export default router;
