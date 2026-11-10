const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const crypto = require('crypto');

// ── S3 client singleton ──────────────────────────────────────────────────────
let _s3 = null;

function getS3Client() {
  if (_s3) return _s3;
  _s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return _s3;
}

/**
 * Upload a file buffer to S3.
 * @param {Buffer} buffer       File data
 * @param {string} originalName Original filename (used to extract extension)
 * @param {string} mimetype     MIME type e.g. "image/jpeg"
 * @returns {Promise<string>}   Public S3 URL
 */
async function uploadToS3(buffer, originalName, mimetype) {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || 'ap-south-1';

  // Generate a unique filename: avatars/<timestamp>-<random>.<ext>
  const ext  = path.extname(originalName).toLowerCase() || '.jpg';
  const name = `avatars/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  const command = new PutObjectCommand({
    Bucket:      bucket,
    Key:         name,
    Body:        buffer,
    ContentType: mimetype,
  });

  await getS3Client().send(command);

  // Return the public URL
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${name}`;
  console.log(`✅ S3 upload: ${url}`);
  return url;
}

/**
 * Delete an object from S3 by its full public URL.
 * Safe to call with an empty / non-S3 URL — will silently skip.
 * @param {string} url  Full S3 URL e.g. https://bucket.s3.region.amazonaws.com/avatars/xyz.jpg
 */
async function deleteFromS3(url) {
  if (!url || !url.includes('.amazonaws.com/')) return;

  const bucket = process.env.AWS_S3_BUCKET;
  // Extract the key from the URL
  const key = url.split('.amazonaws.com/')[1];
  if (!key) return;

  try {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    console.log(`🗑️  S3 delete: ${key}`);
  } catch (err) {
    console.error(`⚠️  S3 delete failed for ${key}:`, err.message);
  }
}

module.exports = { uploadToS3, deleteFromS3 };
