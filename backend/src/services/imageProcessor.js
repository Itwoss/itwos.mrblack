const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { generatePerceptualHash } = require('../utils/imageMatching');

/**
 * Image Processing Worker
 * Generates variants (thumb/feed/detail), WebP/AVIF, pHash, and handles moderation
 */

/**
 * Process image and generate variants
 * @param {string} sourcePath - Path to source image file
 * @param {string} postId - Post ID for organizing output files
 * @returns {Promise<Object>} - Object with variant URLs and metadata
 */
async function processImage(sourcePath, postId) {
  try {
    console.log(`🖼️ Processing image for post ${postId}: ${sourcePath}`);

    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source image not found: ${sourcePath}`);
    }

    // Read image buffer
    const imageBuffer = fs.readFileSync(sourcePath);
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    console.log(`📊 Image metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}, size: ${metadata.size} bytes`);

    // Create output directory structure
    const baseUploadPath = path.join(__dirname, '../../uploads/posts');
    const postDir = path.join(baseUploadPath, postId.toString());
    
    if (!fs.existsSync(postDir)) {
      fs.mkdirSync(postDir, { recursive: true });
    }

    const variants = {};
    const cdnUrls = {};

    // 1. Generate thumbnail (200x200, square)
    console.log('📸 Generating thumbnail (200x200)...');
    const thumbPath = path.join(postDir, 'thumb.jpg');
    const thumbWebPPath = path.join(postDir, 'thumb.webp');
    
    await image
      .clone()
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(thumbPath);

    await image
      .clone()
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toFile(thumbWebPPath);

    variants.thumb = `/uploads/posts/${postId}/thumb.jpg`;
    cdnUrls.thumb = `/uploads/posts/${postId}/thumb.jpg`; // In production, this would be CDN URL

    // 2. Generate feed size (720px width, maintain aspect ratio)
    console.log('📸 Generating feed size (720w)...');
    const feedPath = path.join(postDir, 'feed.jpg');
    const feedWebPPath = path.join(postDir, 'feed.webp');
    
    await image
      .clone()
      .resize(720, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(feedPath);

    await image
      .clone()
      .resize(720, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 85 })
      .toFile(feedWebPPath);

    variants.feed = `/uploads/posts/${postId}/feed.jpg`;
    cdnUrls.feed = `/uploads/posts/${postId}/feed.jpg`;

    // 3. Generate detail size (1080-2048px width, maintain aspect ratio)
    console.log('📸 Generating detail size (1080-2048w)...');
    const detailPath = path.join(postDir, 'detail.jpg');
    const detailWebPPath = path.join(postDir, 'detail.webp');
    
    // Calculate optimal detail size (max 2048, min 1080, maintain aspect)
    const maxDetailWidth = Math.min(2048, metadata.width);
    const detailWidth = Math.max(1080, maxDetailWidth);
    
    await image
      .clone()
      .resize(detailWidth, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(detailPath);

    await image
      .clone()
      .resize(detailWidth, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 90 })
      .toFile(detailWebPPath);

    variants.detail = `/uploads/posts/${postId}/detail.jpg`;
    cdnUrls.detail = `/uploads/posts/${postId}/detail.jpg`;

    // 4. Generate original (optimized, max 2048px)
    console.log('📸 Generating optimized original...');
    const originalPath = path.join(postDir, 'original.jpg');
    
    await image
      .clone()
      .resize(2048, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(originalPath);

    variants.original = `/uploads/posts/${postId}/original.jpg`;
    cdnUrls.original = `/uploads/posts/${postId}/original.jpg`;

    // 5. Generate perceptual hash for duplicate detection
    console.log('🔐 Generating perceptual hash...');
    const pHash = await generatePerceptualHash(imageBuffer);

    // 6. Strip EXIF data (privacy: remove location data)
    // Sharp automatically strips EXIF when converting formats, but we can explicitly do it
    const strippedBuffer = await image
      .clone()
      .rotate() // Auto-rotate based on EXIF
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    // Get file sizes
    const stats = {
      thumb: fs.statSync(thumbPath).size,
      feed: fs.statSync(feedPath).size,
      detail: fs.statSync(detailPath).size,
      original: fs.statSync(originalPath).size
    };

    console.log(`✅ Image processing complete for post ${postId}`);
    console.log(`📊 File sizes: thumb=${(stats.thumb/1024).toFixed(1)}KB, feed=${(stats.feed/1024).toFixed(1)}KB, detail=${(stats.detail/1024).toFixed(1)}KB, original=${(stats.original/1024).toFixed(1)}KB`);

    return {
      success: true,
      variants,
      cdnUrls,
      pHash,
      metadata: {
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        originalFormat: metadata.format,
        originalSize: metadata.size,
        processedSizes: stats
      }
    };
  } catch (error) {
    console.error(`❌ Error processing image for post ${postId}:`, error);
    throw error;
  }
}

/**
 * Process image from buffer (for in-memory processing)
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} postId - Post ID
 * @returns {Promise<Object>} - Object with variant URLs and metadata
 */
async function processImageFromBuffer(imageBuffer, postId) {
  try {
    // Create temporary file
    const tempDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempPath = path.join(tempDir, `temp-${postId}-${Date.now()}.jpg`);
    fs.writeFileSync(tempPath, imageBuffer);

    try {
      const result = await processImage(tempPath, postId);
      // Clean up temp file
      fs.unlinkSync(tempPath);
      return result;
    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      throw error;
    }
  } catch (error) {
    console.error(`❌ Error processing image from buffer for post ${postId}:`, error);
    throw error;
  }
}

/**
 * Process image from URL (download first, then process)
 * @param {string} imageUrl - Image URL
 * @param {string} postId - Post ID
 * @returns {Promise<Object>} - Object with variant URLs and metadata
 */
async function processImageFromUrl(imageUrl, postId) {
  try {
    const axios = require('axios');
    const { downloadImage } = require('../utils/imageMatching');

    console.log(`📥 Downloading image from URL: ${imageUrl}`);
    const imageBuffer = await downloadImage(imageUrl);

    return await processImageFromBuffer(imageBuffer, postId);
  } catch (error) {
    console.error(`❌ Error processing image from URL for post ${postId}:`, error);
    throw error;
  }
}

/**
 * Check for duplicate posts using pHash
 * @param {string} pHash - Perceptual hash to check
 * @param {string} excludePostId - Post ID to exclude from check
 * @returns {Promise<Object>} - Object with duplicate info
 */
async function checkDuplicate(pHash, excludePostId = null) {
  try {
    const Post = require('../models/Post');
    
    const query = {
      phashValueUploaded: pHash,
      status: { $in: ['published', 'processing'] }
    };

    if (excludePostId) {
      query._id = { $ne: excludePostId };
    }

    const duplicate = await Post.findOne(query);

    return {
      isDuplicate: !!duplicate,
      duplicatePostId: duplicate?._id,
      duplicatePost: duplicate ? duplicate.getPublicData() : null
    };
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return {
      isDuplicate: false,
      duplicatePostId: null,
      duplicatePost: null
    };
  }
}

/**
 * Basic moderation check (placeholder for future ML model integration)
 * @param {string} imagePath - Path to image file
 * @returns {Promise<Object>} - Moderation results
 */
async function moderateImage(imagePath) {
  try {
    // TODO: Integrate with ML models for NSFW, violence, copyright detection
    // For now, return safe defaults
    
    return {
      safe: true,
      nsfwScore: 0,
      violenceScore: 0,
      copyrightScore: 0,
      flags: [],
      requiresReview: false
    };
  } catch (error) {
    console.error('Error moderating image:', error);
    return {
      safe: true,
      nsfwScore: 0,
      violenceScore: 0,
      copyrightScore: 0,
      flags: [],
      requiresReview: false
    };
  }
}

module.exports = {
  processImage,
  processImageFromBuffer,
  processImageFromUrl,
  checkDuplicate,
  moderateImage
};

