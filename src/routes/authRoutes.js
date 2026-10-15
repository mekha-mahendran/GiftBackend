import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  UpdateCommand 
} from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient, TABLES } from '../config/aws.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || '2e2eba324c19a79334980068b0d57077d3846030576675d5d4f942de6071156b';

// Register User
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role = 'CUSTOMER' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists via GSI
    const existing = await dynamoDocClient.send(new QueryCommand({
      TableName: TABLES.USERS,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': cleanEmail }
    }));

    if (existing.Items && existing.Items.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `usr-${uuidv4()}`;

    const newUser = {
      id: userId,
      name,
      email: cleanEmail,
      password: hashedPassword,
      phone: phone || '',
      role: role.toUpperCase(),
      wholesaleTier: null,
      addresses: [],
      orders: [],
      createdAt: new Date().toISOString()
    };

    await dynamoDocClient.send(new PutCommand({
      TableName: TABLES.USERS,
      Item: newUser
    }));

    const token = jwt.sign(
      { id: userId, email: cleanEmail, name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Error registering account: ' + err.message });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Query DynamoDB for user
    const result = await dynamoDocClient.send(new QueryCommand({
      TableName: TABLES.USERS,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': cleanEmail }
    }));

    const user = result.Items && result.Items[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Error during login: ' + err.message });
  }
});

// Get Current Profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await dynamoDocClient.send(new GetCommand({
      TableName: TABLES.USERS,
      Key: { id: req.user.id }
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = result.Item;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching profile: ' + err.message });
  }
});

// Update Profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, phone } = req.body;

    const updateRes = await dynamoDocClient.send(new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { id: req.user.id },
      UpdateExpression: 'set #name = :name, phone = :phone, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#name': 'name' },
      ExpressionAttributeValues: {
        ':name': name || req.user.name,
        ':phone': phone || '',
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }));

    const { password: _, ...userWithoutPassword } = updateRes.Attributes;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating profile: ' + err.message });
  }
});

// Add Delivery Address
router.post('/address', requireAuth, async (req, res) => {
  try {
    const { name, phone, street, city, state, pincode, isDefault } = req.body;
    const newAddress = {
      id: `addr-${Date.now()}`,
      name,
      phone,
      street,
      city,
      state,
      pincode,
      isDefault: Boolean(isDefault)
    };

    const userRes = await dynamoDocClient.send(new GetCommand({
      TableName: TABLES.USERS,
      Key: { id: req.user.id }
    }));

    const addresses = userRes.Item?.addresses || [];
    const updatedAddresses = isDefault 
      ? addresses.map(a => ({ ...a, isDefault: false })).concat(newAddress)
      : [...addresses, newAddress];

    await dynamoDocClient.send(new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { id: req.user.id },
      UpdateExpression: 'set addresses = :addresses',
      ExpressionAttributeValues: { ':addresses': updatedAddresses }
    }));

    res.json({ success: true, addresses: updatedAddresses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error saving address: ' + err.message });
  }
});

export default router;
