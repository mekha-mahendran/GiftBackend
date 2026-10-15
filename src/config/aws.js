import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

const region = process.env.AWS_REGION || 'ap-south-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'mekha';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'Mekha@2026';

const awsCredentials = {
  accessKeyId,
  secretAccessKey
};

// Low-level DynamoDB Client
export const rawDynamoClient = new DynamoDBClient({
  region,
  credentials: awsCredentials
});

// Document Client for streamlined JSON Object read/write
export const dynamoDocClient = DynamoDBDocumentClient.from(rawDynamoClient, {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true
  },
  unmarshallOptions: {
    wrapNumbers: false
  }
});

// AWS S3 Client
export const s3Client = new S3Client({
  region,
  credentials: awsCredentials
});

export const S3_BUCKET = process.env.AWS_S3_BUCKET || 'giftpocket-assets-mumbai';

// Table Names Configuration
export const TABLES = {
  PRODUCTS: process.env.DYNAMO_TABLE_PRODUCTS || 'giftpocket-products',
  ORDERS: process.env.DYNAMO_TABLE_ORDERS || 'giftpocket-orders',
  USERS: process.env.DYNAMO_TABLE_USERS || 'giftpocket-users',
  CATEGORIES: process.env.DYNAMO_TABLE_CATEGORIES || 'giftpocket-categories',
  WHOLESALE: process.env.DYNAMO_TABLE_WHOLESALE || 'giftpocket-wholesale-inquiries',
  CUSTOM_DESIGNS: process.env.DYNAMO_TABLE_CUSTOM_DESIGNS || 'giftpocket-custom-designs',
  COUPONS: process.env.DYNAMO_TABLE_COUPONS || 'giftpocket-coupons',
  SETTINGS: process.env.DYNAMO_TABLE_SETTINGS || 'giftpocket-settings'
};
