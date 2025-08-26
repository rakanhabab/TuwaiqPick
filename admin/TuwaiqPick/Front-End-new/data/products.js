// Products Data
const productsData = [
  {
    id: 'prod-001',
    name: 'حليب طازج',
    description: 'حليب طازج عالي الجودة من أفضل المزارع',
    price: 12.50,
    image: '🥛',
    category: 'مشتقات الألبان',
    stock: 45,
    unit: 'لتر'
  },
  {
    id: 'prod-002',
    name: 'خبز أبيض',
    description: 'خبز أبيض طازج من المخبز المحلي',
    price: 3.75,
    image: '🍞',
    category: 'المخبوزات',
    stock: 120,
    unit: 'قطعة'
  },
  {
    id: 'prod-003',
    name: 'جبنة شيدر',
    description: 'جبنة شيدر ناضجة ومذاقها مميز',
    price: 15.25,
    image: '🧀',
    category: 'مشتقات الألبان',
    stock: 32,
    unit: 'كيلو'
  },
  {
    id: 'prod-004',
    name: 'زبدة طبيعية',
    description: 'زبدة طبيعية 100% من الحليب الطازج',
    price: 18.00,
    image: '🧈',
    category: 'مشتقات الألبان',
    stock: 15,
    unit: 'كيلو'
  },
  {
    id: 'prod-005',
    name: 'عصير برتقال',
    description: 'عصير برتقال طبيعي 100%',
    price: 6.50,
    image: '🍊',
    category: 'المشروبات',
    stock: 60,
    unit: 'لتر'
  },
  {
    id: 'prod-006',
    name: 'شوكولاتة داكنة',
    description: 'شوكولاتة داكنة عالية الجودة',
    price: 22.75,
    image: '🍫',
    category: 'الحلويات',
    stock: 85,
    unit: 'قطعة'
  },
  {
    id: 'prod-007',
    name: 'زبادي يوناني',
    description: 'زبادي يوناني طبيعي غني بالبروتين',
    price: 9.80,
    image: '🥛',
    category: 'مشتقات الألبان',
    stock: 75,
    unit: 'كوب'
  },
  {
    id: 'prod-008',
    name: 'تفاح أحمر',
    description: 'تفاح أحمر طازج وحلو المذاق',
    price: 8.90,
    image: '🍎',
    category: 'الفواكه',
    stock: 95,
    unit: 'كيلو'
  },
  {
    id: 'prod-009',
    name: 'قهوة تركية',
    description: 'قهوة تركية أصلية محمصة حديثاً',
    price: 25.00,
    image: '☕',
    category: 'المشروبات',
    stock: 30,
    unit: 'كيلو'
  },
  {
    id: 'prod-010',
    name: 'عسل طبيعي',
    description: 'عسل طبيعي 100% من أفضل المناحل',
    price: 35.00,
    image: '🍯',
    category: 'العسل والمربى',
    stock: 20,
    unit: 'كيلو'
  },
  {
    id: 'prod-011',
    name: 'زيت زيتون',
    description: 'زيت زيتون بكر ممتاز من أفضل المعاصر',
    price: 45.00,
    image: '🫒',
    category: 'الزيوت',
    stock: 25,
    unit: 'لتر'
  },
  {
    id: 'prod-012',
    name: 'تمر مجدول',
    description: 'تمر مجدول طازج وحلو المذاق',
    price: 28.00,
    image: '🫘',
    category: 'الفواكه المجففة',
    stock: 40,
    unit: 'كيلو'
  }
];

// Product categories
const productCategories = [
  'مشتقات الألبان',
  'المخبوزات',
  'المشروبات',
  'الحلويات',
  'الفواكه',
  'العسل والمربى',
  'الزيوت',
  'الفواكه المجففة'
];

// Product search function
function searchProducts(query) {
  if (!query) return productsData;
  
  const lowerQuery = query.toLowerCase();
  return productsData.filter(product => 
    product.name.toLowerCase().includes(lowerQuery) ||
    product.description.toLowerCase().includes(lowerQuery) ||
    product.category.toLowerCase().includes(lowerQuery)
  );
}

// Get products by category
function getProductsByCategory(category) {
  if (!category) return productsData;
  return productsData.filter(product => product.category === category);
}

// Get product by ID
function getProductById(id) {
  return productsData.find(product => product.id === id);
}

// Get low stock products
function getLowStockProducts(threshold = 20) {
  return productsData.filter(product => product.stock <= threshold);
}

// Get products by price range
function getProductsByPriceRange(minPrice, maxPrice) {
  return productsData.filter(product => 
    product.price >= minPrice && product.price <= maxPrice
  );
}

// Update product stock
function updateProductStock(productId, quantity) {
  const product = getProductById(productId);
  if (product) {
    product.stock = Math.max(0, product.stock - quantity);
    return true;
  }
  return false;
}

// Export for global access
window.productsData = productsData;
window.productCategories = productCategories;
window.searchProducts = searchProducts;
window.getProductsByCategory = getProductsByCategory;
window.getProductById = getProductById;
window.getLowStockProducts = getLowStockProducts;
window.getProductsByPriceRange = getProductsByPriceRange;
window.updateProductStock = updateProductStock; 