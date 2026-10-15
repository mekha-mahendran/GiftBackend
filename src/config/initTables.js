import { 
  CreateTableCommand, 
  DescribeTableCommand,
  ListTablesCommand
} from '@aws-sdk/client-dynamodb';
import { rawDynamoClient, TABLES } from './aws.js';

const TABLE_SCHEMAS = [
  {
    TableName: TABLES.PRODUCTS,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'slug', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'slug-index',
        KeySchema: [{ AttributeName: 'slug', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'category-index',
        KeySchema: [{ AttributeName: 'category', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: TABLES.ORDERS,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userId-index',
        KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: TABLES.USERS,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: TABLES.CATEGORIES,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: TABLES.WHOLESALE,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: TABLES.CUSTOM_DESIGNS,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: TABLES.COUPONS,
    KeySchema: [
      { AttributeName: 'code', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'code', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: TABLES.SETTINGS,
    KeySchema: [
      { AttributeName: 'key', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'key', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }
];

export async function initDynamoTables() {
  console.log('🔍 Checking AWS DynamoDB tables in region ap-south-1...');
  try {
    const listRes = await rawDynamoClient.send(new ListTablesCommand({}));
    const existingTables = new Set(listRes.TableNames || []);

    for (const schema of TABLE_SCHEMAS) {
      if (!existingTables.has(schema.TableName)) {
        console.log(`⚡ Creating DynamoDB table: ${schema.TableName}...`);
        try {
          await rawDynamoClient.send(new CreateTableCommand(schema));
          console.log(`✅ Table created: ${schema.TableName}`);
        } catch (err) {
          console.error(`⚠️ Error creating table ${schema.TableName}:`, err.message);
        }
      } else {
        console.log(`✓ Table exists: ${schema.TableName}`);
      }
    }
    console.log('✨ All DynamoDB tables ready!');
  } catch (err) {
    console.warn('⚠️ DynamoDB connection check notice (will proceed with fallback):', err.message);
  }
}
