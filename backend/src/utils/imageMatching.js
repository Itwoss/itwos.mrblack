const sharp = require('sharp');
const imageHashLib = require('image-hash');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// image-hash library exports an object with imageHash property
// Signature: imageHash(src, bits, method, callback)
// method: true = method 2 (perceptual hash), false = method 1
function hashImageAsync(filepath, bits) {
  return new Promise((resolve, reject) => {
    imageHashLib.imageHash(filepath, bits, true, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });
}

/**
 * Download image from URL
 */
async function downloadImage(url) {
  try {
    console.log('📥 Downloading image from:', url);
    const response = await axios({
      url,
      responseType: 'arraybuffer',
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.instagram.com/'
      },
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept 2xx and 3xx
      }
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('Downloaded image is empty');
    }
    
    console.log('✅ Image downloaded successfully, size:', response.data.length, 'bytes');
    return Buffer.from(response.data);
  } catch (error) {
    console.error('❌ Error downloading image:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    throw new Error(`Failed to download image from ${url}: ${error.message}`);
  }
}

/**
 * Compress and resize image to 256x256 for pHash comparison
 * Normalizes images to ensure consistent comparison
 */
async function prepareImageForHash(imageBuffer) {
  try {
    // Get image metadata first
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`🖼️ Preparing image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
    
    // Normalize image: resize to 256x256, convert to RGB, remove alpha channel
    // Apply aggressive normalization to handle Instagram's image processing
    const normalized = await sharp(imageBuffer)
      .resize(256, 256, {
        fit: 'cover', // Ensures exact 256x256 size
        position: 'center' // Center crop for consistency
      })
      .removeAlpha() // Remove transparency
      .greyscale() // Convert to grayscale for better hash consistency (removes color variations)
      .normalize() // Normalize brightness/contrast
      .sharpen() // Sharpen to reduce compression artifacts
      .jpeg({ 
        quality: 90, // Higher quality for better hash accuracy
        mozjpeg: true // Use mozjpeg for better compression
      })
      .toBuffer();
    
    console.log(`✅ Image normalized: ${normalized.length} bytes`);
    return normalized;
  } catch (error) {
    console.error('Error preparing image for hash:', error.message);
    throw new Error(`Failed to prepare image: ${error.message}`);
  }
}

/**
 * Generate perceptual hash for an image buffer
 */
async function generatePerceptualHash(imageBuffer) {
  try {
    // Save buffer to temp file for image-hash library
    const tempPath = path.join(__dirname, '../../temp', `temp-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`);
    const tempDir = path.dirname(tempPath);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    await fs.promises.writeFile(tempPath, imageBuffer);
    
    // Generate hash
    const hash = await hashImageAsync(tempPath, 16);
    
    // Clean up temp file
    await fs.promises.unlink(tempPath).catch(() => {});
    
    return hash;
  } catch (error) {
    console.error('Error generating perceptual hash:', error.message);
    throw new Error(`Failed to generate hash: ${error.message}`);
  }
}

/**
 * Calculate Hamming distance between two hashes
 */
function hammingDistance(hash1, hash2) {
  if (hash1.length !== hash2.length) {
    return Infinity;
  }
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

/**
 * Compare two images using perceptual hashing
 * Returns: { match: boolean, difference: number, hash1: string, hash2: string }
 */
async function compareImages(uploadedImageBuffer, instagramImageUrl) {
  try {
    console.log('🔄 Starting image comparison...');
    
    // Download Instagram image
    console.log('📥 Downloading Instagram image...');
    const instagramBuffer = await downloadImage(instagramImageUrl);
    
    // Prepare both images for hashing
    console.log('🖼️ Preparing images for hashing...');
    const uploadedPrepared = await prepareImageForHash(uploadedImageBuffer);
    const instagramPrepared = await prepareImageForHash(instagramBuffer);
    
    // Generate hashes
    console.log('🔐 Generating perceptual hashes...');
    const hash1 = await generatePerceptualHash(uploadedPrepared);
    const hash2 = await generatePerceptualHash(instagramPrepared);
    
    // Calculate difference
    const difference = hammingDistance(hash1, hash2);
    // For 16-bit hash (typically 16 hex characters = 64 bits), threshold of 30-40 is reasonable
    // Instagram images may be compressed, resized, or have different formats
    // Increased threshold to 40 to account for Instagram's image processing
    const match = difference < 40;
    
    console.log(`✅ Comparison complete: difference=${difference}, match=${match}, threshold=40, hash1_length=${hash1.length}, hash2_length=${hash2.length}`);
    
    return {
      match,
      difference,
      hash1,
      hash2
    };
  } catch (error) {
    console.error('❌ Error comparing images:', error);
    throw error;
  }
}

/**
 * Compress image to 400-600KB while maintaining quality
 */
async function compressImage(imageBuffer, targetSizeKB = 500) {
  try {
    let quality = 90;
    let compressed = await sharp(imageBuffer)
      .jpeg({ quality })
      .toBuffer();
    
    // Reduce quality until we're close to target size
    while (compressed.length > targetSizeKB * 1024 && quality > 50) {
      quality -= 5;
      compressed = await sharp(imageBuffer)
        .jpeg({ quality })
        .toBuffer();
    }
    
    // If still too large, resize
    if (compressed.length > targetSizeKB * 1024) {
      const metadata = await sharp(imageBuffer).metadata();
      const ratio = Math.sqrt((targetSizeKB * 1024) / compressed.length);
      const newWidth = Math.floor(metadata.width * ratio);
      const newHeight = Math.floor(metadata.height * ratio);
      
      compressed = await sharp(imageBuffer)
        .resize(newWidth, newHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();
    }
    
    return compressed;
  } catch (error) {
    console.error('Error compressing image:', error.message);
    throw new Error(`Failed to compress image: ${error.message}`);
  }
}

module.exports = {
  compareImages,
  compressImage,
  generatePerceptualHash,
  downloadImage,
  prepareImageForHash
};

