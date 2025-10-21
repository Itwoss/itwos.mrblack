const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'itwos-ai',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' },
      { quality: 'auto' }
    ]
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload single image
const uploadSingle = upload.single('image');

// Upload multiple images
const uploadMultiple = upload.array('images', 10);

// Upload image with custom parameters
const uploadImage = async (file, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'itwos-ai',
      quality: 'auto',
      format: 'auto'
    };

    const uploadOptions = { ...defaultOptions, ...options };
    
    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload image'
    };
  }
};

// Upload image from URL
const uploadFromUrl = async (url, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'itwos-ai',
      quality: 'auto',
      format: 'auto'
    };

    const uploadOptions = { ...defaultOptions, ...options };
    
    const result = await cloudinary.uploader.upload(url, uploadOptions);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload from URL error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload image from URL'
    };
  }
};

// Delete image
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete image'
    };
  }
};

// Transform image
const transformImage = (publicId, transformations = {}) => {
  try {
    const defaultTransformations = {
      width: 300,
      height: 300,
      crop: 'fill',
      quality: 'auto',
      format: 'auto'
    };

    const transformOptions = { ...defaultTransformations, ...transformations };
    
    const url = cloudinary.url(publicId, transformOptions);
    
    return {
      success: true,
      url: url
    };
  } catch (error) {
    console.error('Cloudinary transform error:', error);
    return {
      success: false,
      error: error.message || 'Failed to transform image'
    };
  }
};

// Generate image URL with transformations
const generateImageUrl = (publicId, transformations = {}) => {
  try {
    const defaultTransformations = {
      quality: 'auto',
      format: 'auto'
    };

    const transformOptions = { ...defaultTransformations, ...transformations };
    
    const url = cloudinary.url(publicId, transformOptions);
    
    return {
      success: true,
      url: url
    };
  } catch (error) {
    console.error('Cloudinary URL generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate image URL'
    };
  }
};

// Get image details
const getImageDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    
    return {
      success: true,
      details: {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        createdAt: result.created_at,
        tags: result.tags
      }
    };
  } catch (error) {
    console.error('Cloudinary get details error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get image details'
    };
  }
};

// Search images
const searchImages = async (query = '', options = {}) => {
  try {
    const defaultOptions = {
      max_results: 50,
      sort_by: [{ field: 'created_at', direction: 'desc' }]
    };

    const searchOptions = { ...defaultOptions, ...options };
    
    const result = await cloudinary.search
      .expression(query)
      .with_field('tags')
      .max_results(searchOptions.max_results)
      .sort_by(searchOptions.sort_by)
      .execute();
    
    return {
      success: true,
      images: result.resources.map(resource => ({
        publicId: resource.public_id,
        url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        format: resource.format,
        size: resource.bytes,
        createdAt: resource.created_at,
        tags: resource.tags
      })),
      totalCount: result.total_count
    };
  } catch (error) {
    console.error('Cloudinary search error:', error);
    return {
      success: false,
      error: error.message || 'Failed to search images'
    };
  }
};

// Create folder
const createFolder = async (folderName) => {
  try {
    const result = await cloudinary.api.create_folder(folderName);
    
    return {
      success: true,
      folder: result.name,
      path: result.path
    };
  } catch (error) {
    console.error('Cloudinary create folder error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create folder'
    };
  }
};

// Delete folder
const deleteFolder = async (folderName) => {
  try {
    const result = await cloudinary.api.delete_folder(folderName);
    
    return {
      success: true,
      result: result.message
    };
  } catch (error) {
    console.error('Cloudinary delete folder error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete folder'
    };
  }
};

// Get usage statistics
const getUsage = async () => {
  try {
    const result = await cloudinary.api.usage();
    
    return {
      success: true,
      usage: {
        plan: result.plan,
        objects: result.objects,
        bandwidth: result.bandwidth,
        storage: result.storage,
        requests: result.requests,
        resources: result.resources,
        derivedResources: result.derived_resources
      }
    };
  } catch (error) {
    console.error('Cloudinary usage error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get usage statistics'
    };
  }
};

module.exports = {
  cloudinary,
  upload,
  uploadSingle,
  uploadMultiple,
  uploadImage,
  uploadFromUrl,
  deleteImage,
  transformImage,
  generateImageUrl,
  getImageDetails,
  searchImages,
  createFolder,
  deleteFolder,
  getUsage
};
