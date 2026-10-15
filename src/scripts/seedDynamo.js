import { PutCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { dynamoDocClient, TABLES } from '../config/aws.js';
import { initDynamoTables } from '../config/initTables.js';

const SEED_PRODUCTS = [
  {
    id: "charm-001",
    name: "Custom Name Pastel Beaded Phone Charm",
    slug: "custom-name-pastel-beaded-phone-charm",
    category: "phone-charms",
    price: 149,
    originalPrice: 249,
    rating: 4.9,
    reviewCount: 384,
    badge: "Bestseller",
    isCustomizable: true,
    isWholesale: true,
    wholesalePrice: 79,
    images: [
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Our #1 viral handcrafted phone wristlet. Hand-strung with iridescent acrylic pearl beads, letter charms for your name or initials, and high-strength 7-strand nylon cord.",
    stock: 150
  },
  {
    id: "charm-002",
    name: "Y2K Gummy Bear & Pearl Lanyard",
    slug: "y2k-gummy-bear-pearl-lanyard",
    category: "phone-charms",
    price: 169,
    originalPrice: 299,
    rating: 4.8,
    reviewCount: 192,
    badge: "Trending",
    isCustomizable: true,
    isWholesale: true,
    wholesalePrice: 89,
    images: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Nostalgic Y2K aesthetic with colorful gradient gummy bear charms, faux pearls, and durable loop attachment for any phone case.",
    stock: 85
  },
  {
    id: "charm-003",
    name: "Cute Beaded Daisy Phone Charm",
    slug: "cute-beaded-daisy-phone-charm",
    category: "phone-charms",
    price: 129,
    originalPrice: 199,
    rating: 4.9,
    reviewCount: 240,
    badge: "Top Rated",
    isCustomizable: true,
    isWholesale: true,
    wholesalePrice: 69,
    images: [
      "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Delicate hand-woven glass seed-bead flower pattern. Lightweight, sweet, and matches any phone case.",
    stock: 120
  },
  {
    id: "bracelet-001",
    name: "Handmade Friendship Braided Couple Magnetic Bracelets",
    slug: "handmade-friendship-braided-couple-magnetic-bracelets",
    category: "bracelets",
    price: 99,
    originalPrice: 199,
    rating: 4.9,
    reviewCount: 420,
    badge: "Pair Set",
    isCustomizable: true,
    isWholesale: true,
    wholesalePrice: 49,
    images: [
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Pair of 2 matching adjustable braided rope bracelets with magnetic half-heart charms that snap together when hands meet.",
    stock: 200
  },
  {
    id: "keychain-001",
    name: "Handcrafted Polymer Clay Boba Tea Keychain",
    slug: "handcrafted-polymer-clay-boba-tea-keychain",
    category: "keychains",
    price: 79,
    originalPrice: 149,
    rating: 4.7,
    reviewCount: 98,
    badge: "Mini Cute",
    isCustomizable: false,
    isWholesale: true,
    wholesalePrice: 39,
    images: [
      "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Hand-sculpted miniature boba milk tea tumbler with floating tapioca pearls and glossy UV resin seal.",
    stock: 140
  },
  {
    id: "toy-001",
    name: "Glow in the Dark Radium Forest Spirits (Pack of 5)",
    slug: "glow-in-the-dark-radium-forest-spirits-pack-of-5",
    category: "miniature-toys",
    price: 99,
    originalPrice: 199,
    rating: 4.8,
    reviewCount: 165,
    badge: "Glows",
    isCustomizable: false,
    isWholesale: true,
    wholesalePrice: 49,
    images: [
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Tiny luminescent spirit figurines that absorb daylight and glow brightly green in the dark for your desk or plant pots.",
    stock: 300
  },
  {
    id: "diy-001",
    name: "DIY Bead Jewellery & Phone Charm Making Kit",
    slug: "diy-bead-jewellery-phone-charm-making-kit",
    category: "diy-kits",
    price: 399,
    originalPrice: 699,
    rating: 5.0,
    reviewCount: 88,
    badge: "Kit Box",
    isCustomizable: false,
    isWholesale: true,
    wholesalePrice: 220,
    images: [
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80"
    ],
    description: "Complete 400+ piece kit: acrylic beads, letter alphabets, lobster clasps, phone cords, elastic string, and organizer box.",
    stock: 60
  }
];

const SEED_CATEGORIES = [
  { id: "cat-phone-charms", name: "Phone Charms", slug: "phone-charms", image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=600&q=80", color: "#DFD7CB", itemCount: 28 },
  { id: "cat-bracelets", name: "Bracelets & Wristlets", slug: "bracelets", image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80", color: "#717C6D", itemCount: 19 },
  { id: "cat-keychains", name: "Miniature Keychains", slug: "keychains", image: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80", color: "#D69E4A", itemCount: 24 },
  { id: "cat-hair-accessories", name: "Hair Accessories", slug: "hair-accessories", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80", color: "#C97D67", itemCount: 16 },
  { id: "cat-miniature-toys", name: "Miniature & Radium Toys", slug: "miniature-toys", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80", color: "#9E8EB8", itemCount: 32 },
  { id: "cat-diy-kits", name: "DIY Craft Kits", slug: "diy-kits", image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80", color: "#DFD7CB", itemCount: 8 },
  { id: "cat-fridge-magnets", name: "Fridge Magnets", slug: "fridge-magnets", image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80", color: "#717C6D", itemCount: 14 }
];

export async function seedDynamoDB() {
  console.log('🌱 Starting DynamoDB database seeding...');
  await initDynamoTables();

  // 1. Seed Products
  for (const prod of SEED_PRODUCTS) {
    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: TABLES.PRODUCTS,
        Item: prod
      }));
      console.log(`  ✓ Product seeded: ${prod.name}`);
    } catch (e) {
      console.warn(`  ⚠️ Product seed error:`, e.message);
    }
  }

  // 2. Seed Categories
  for (const cat of SEED_CATEGORIES) {
    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: TABLES.CATEGORIES,
        Item: cat
      }));
      console.log(`  ✓ Category seeded: ${cat.name}`);
    } catch (e) {
      console.warn(`  ⚠️ Category seed error:`, e.message);
    }
  }

  // 3. Seed Admin User
  try {
    const adminPass = await bcrypt.hash('Admin@2026', 10);
    await dynamoDocClient.send(new PutCommand({
      TableName: TABLES.USERS,
      Item: {
        id: 'usr-admin-01',
        name: 'Mekha Admin',
        email: 'admin@giftpocket.in',
        password: adminPass,
        phone: '+91 98420 13465',
        role: 'ADMIN',
        createdAt: new Date().toISOString()
      }
    }));
    console.log('  ✓ Admin account seeded: admin@giftpocket.in');
  } catch (e) {
    console.warn('  ⚠️ Admin seed error:', e.message);
  }

  // 4. Seed Standard Promo Coupons
  const coupons = [
    { code: 'WELCOME10', discountType: 'percentage', value: 10, minOrder: 0 },
    { code: 'SMILE50', discountType: 'fixed', value: 50, minOrder: 299 },
    { code: 'FREESHIP', discountType: 'shipping', value: 0, minOrder: 0 },
    { code: 'CUTE10', discountType: 'percentage', value: 10, minOrder: 0 }
  ];

  for (const cp of coupons) {
    try {
      await dynamoDocClient.send(new PutCommand({
        TableName: TABLES.COUPONS,
        Item: cp
      }));
      console.log(`  ✓ Coupon seeded: ${cp.code}`);
    } catch (e) {
      console.warn(`  ⚠️ Coupon seed error:`, e.message);
    }
  }

  console.log('✨ DynamoDB seeding completed successfully!');
}

// If run directly via CLI
if (process.argv[1]?.endsWith('seedDynamo.js')) {
  seedDynamoDB().then(() => process.exit(0)).catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
