import express from 'express';
import multer from 'multer';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { s3Client, S3_BUCKET } from '../config/aws.js';

const router = express.Router();

// Configure Multer for in-memory buffer handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Direct Multipart Upload to S3
router.post('/s3', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided in request' });
    }

    const ext = req.file.originalname.split('.').pop() || 'png';
    const folder = req.body.folder || 'customizer-uploads';
    const key = `${folder}/${Date.now()}-${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    });

    await s3Client.send(command);

    const region = process.env.AWS_REGION || 'ap-south-1';
    const s3Url = `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;

    res.json({
      success: true,
      url: s3Url,
      key,
      bucket: S3_BUCKET
    });
  } catch (err) {
    console.error('S3 Upload Error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload to S3: ' + err.message });
  }
});

// Generate S3 Presigned URL for Direct Client Browser Upload
router.post('/presign', async (req, res) => {
  try {
    const { filename, contentType, folder = 'user-assets' } = req.body;
    const ext = (filename || 'image.png').split('.').pop();
    const key = `${folder}/${Date.now()}-${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType || 'image/png'
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const region = process.env.AWS_REGION || 'ap-south-1';
    const finalFileUrl = `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;

    res.json({
      success: true,
      presignedUrl,
      fileUrl: finalFileUrl,
      key
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating presigned S3 URL: ' + err.message });
  }
});

export default router;
