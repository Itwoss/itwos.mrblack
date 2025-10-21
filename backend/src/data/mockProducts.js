// Shared mock products data store
// This ensures that products created in admin are visible in public endpoints

let mockProducts = [];

// Get all products
const getAllProducts = () => {
  return [...mockProducts];
};

// Add a new product
const addProduct = (product) => {
  const newProduct = {
    _id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...product,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  mockProducts.push(newProduct);
  return newProduct;
};

// Update a product
const updateProduct = (id, updates) => {
  const index = mockProducts.findIndex(p => p._id === id);
  if (index !== -1) {
    mockProducts[index] = {
      ...mockProducts[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return mockProducts[index];
  }
  return null;
};

// Delete a product
const deleteProduct = (id) => {
  const index = mockProducts.findIndex(p => p._id === id);
  if (index !== -1) {
    mockProducts.splice(index, 1);
    return true;
  }
  return false;
};

// Get product by ID
const getProductById = (id) => {
  return mockProducts.find(p => p._id === id);
};

// Get published products only
const getPublishedProducts = () => {
  return mockProducts.filter(p => p.status === 'published');
};

// Get trending products
const getTrendingProducts = () => {
  return mockProducts.filter(p => p.status === 'published' && p.trending);
};

module.exports = {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getPublishedProducts,
  getTrendingProducts
};
