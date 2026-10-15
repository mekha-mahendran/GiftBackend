import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  ScanCommand, 
  UpdateCommand 
} from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, TABLES } from '../config/aws.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { sendOrderNotificationEmail } from '../services/emailService.js';

const router = express.Router();

// Create Order (WhatsApp / Direct Checkout)
router.post('/', async (req, res) => {
  try {
    const { 
      items, 
      total, 
      subtotal,
      shippingFee, 
      customer, 
      address, 
      paymentMethod = 'WhatsApp Order', 
      customNotes,
      userId
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items required' });
    }

    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const trackingNumber = `DL${Math.floor(100000000 + Math.random() * 900000000)}IN`;

    const newOrder = {
      id: orderId,
      userId: userId || 'guest',
      customer: customer || {},
      items: items || [],
      pricing: {
        subtotal: Number(subtotal) || Number(total) || 0,
        shippingFee: Number(shippingFee) || 0,
        total: Number(total) || 0
      },
      address: address || `${customer?.street || ''}, ${customer?.city || ''}`,
      paymentMethod,
      customNotes: customNotes || '',
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      tracking: {
        courier: 'Delhivery Express',
        trackingNumber,
        steps: [
          { status: 'Confirmed', date: 'Just now', done: true },
          { status: 'Processing & Customizing', date: 'Pending', done: false },
          { status: 'Packed in Gift Box', date: 'Pending', done: false },
          { status: 'Shipped', date: 'Pending', done: false },
          { status: 'Delivered', date: 'Pending', done: false }
        ]
      }
    };

    await dynamoDocClient.send(new PutCommand({
      TableName: TABLES.ORDERS,
      Item: newOrder
    }));

    // If logged in, also update user's orders list
    if (userId && userId !== 'guest') {
      try {
        const userRes = await dynamoDocClient.send(new GetCommand({
          TableName: TABLES.USERS,
          Key: { id: userId }
        }));

        if (userRes.Item) {
          const userOrders = userRes.Item.orders || [];
          await dynamoDocClient.send(new UpdateCommand({
            TableName: TABLES.USERS,
            Key: { id: userId },
            UpdateExpression: 'set orders = :orders',
            ExpressionAttributeValues: {
              ':orders': [newOrder, ...userOrders]
            }
          }));
        }
      } catch (userErr) {
        console.warn('Notice: Could not link order to user profile in DynamoDB:', userErr.message);
      }
    }

    // Dispatch email notification to customer & admin
    let emailStatus = null;
    if (customer?.email) {
      try {
        emailStatus = await sendOrderNotificationEmail({
          order: newOrder,
          customer: customer || {},
          items: items || [],
          pricing: newOrder.pricing
        });
      } catch (emailErr) {
        console.warn('Notice: Email notification dispatch skipped or failed:', emailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order recorded successfully',
      order: newOrder,
      email: emailStatus
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ success: false, message: 'Failed to place order: ' + err.message });
  }
});

// Dedicated Email Notification Endpoint (for frontend / checkout resend)
router.post('/notify-email', async (req, res) => {
  try {
    const { order, customer, items, pricing } = req.body;

    if (!customer?.email) {
      return res.status(400).json({ success: false, message: 'Customer email is required' });
    }

    const emailResult = await sendOrderNotificationEmail({
      order: order || {},
      customer: customer || {},
      items: items || [],
      pricing: pricing || {}
    });

    res.json({
      success: true,
      message: emailResult.simulated 
        ? `Simulated email notification prepared for ${customer.email}`
        : `Email notification dispatched to ${customer.email}`,
      email: emailResult
    });
  } catch (err) {
    console.error('Email notify endpoint error:', err);
    res.status(500).json({ success: false, message: 'Failed to send email notification: ' + err.message });
  }
});

// Get user orders
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await dynamoDocClient.send(new QueryCommand({
      TableName: TABLES.ORDERS,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));

    res.json({
      success: true,
      orders: result.Items || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching orders: ' + err.message });
  }
});

// Track Order by ID or Courier AWB number
router.get('/track/:query', async (req, res) => {
  try {
    const query = req.params.query.trim();

    // 1. Direct get by Order ID
    const orderRes = await dynamoDocClient.send(new GetCommand({
      TableName: TABLES.ORDERS,
      Key: { id: query.toUpperCase() }
    }));

    if (orderRes.Item) {
      return res.json({ success: true, order: orderRes.Item });
    }

    // 2. Scan fallback by trackingNumber
    const scanRes = await dynamoDocClient.send(new ScanCommand({
      TableName: TABLES.ORDERS,
      FilterExpression: 'tracking.trackingNumber = :awb OR id = :id',
      ExpressionAttributeValues: {
        ':awb': query,
        ':id': query
      }
    }));

    if (scanRes.Items && scanRes.Items.length > 0) {
      return res.json({ success: true, order: scanRes.Items[0] });
    }

    res.status(404).json({ success: false, message: 'No shipment found for ' + query });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error tracking shipment: ' + err.message });
  }
});

// Admin: Get all orders
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await dynamoDocClient.send(new ScanCommand({
      TableName: TABLES.ORDERS,
      Limit: 100
    }));

    res.json({
      success: true,
      count: result.Items ? result.Items.length : 0,
      orders: result.Items || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin orders: ' + err.message });
  }
});

// Admin: Update order status & tracking step
router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, stepIndex } = req.body;

    const orderRes = await dynamoDocClient.send(new GetCommand({
      TableName: TABLES.ORDERS,
      Key: { id }
    }));

    if (!orderRes.Item) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderRes.Item;
    order.status = status || order.status;

    if (stepIndex !== undefined && order.tracking?.steps) {
      order.tracking.steps = order.tracking.steps.map((st, i) => {
        if (i <= stepIndex) {
          return { ...st, done: true, date: st.date === 'Pending' ? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : st.date };
        }
        return st;
      });
    }

    await dynamoDocClient.send(new PutCommand({
      TableName: TABLES.ORDERS,
      Item: order
    }));

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating order: ' + err.message });
  }
});

export default router;
