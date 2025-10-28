import React from 'react';
import './ProductList.css';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  sizes: string;
}

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: number) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, onEdit, onDelete }) => {
  const parseSizes = (sizesString: string) => {
    if (!sizesString) return [];
    return sizesString.split(',').map(sizeInfo => {
      const [size, inStock] = sizeInfo.split(':');
      return { size, inStock: inStock === '1' };
    });
  };

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📦</div>
        <h3>No products yet</h3>
        <p>Add your first product to start selling on the platform</p>
      </div>
    );
  }

  return (
    <div className="product-list">
      <div className="grid grid-3">
        {products.map((product) => {
          const sizes = parseSizes(product.sizes);
          const inStockSizes = sizes.filter(s => s.inStock);
          const outOfStockSizes = sizes.filter(s => !s.inStock);

          return (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                {product.image_url ? (
                  <img 
                    src={product.image_url.startsWith('/uploads/') 
                      ? `http://localhost:5000${product.image_url}` 
                      : product.image_url
                    } 
                    alt={product.name}
                    className="product-image"
                  />
                ) : (
                  <div className="product-image-placeholder">
                    <span>📷</span>
                  </div>
                )}
              </div>
              
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <div className="product-price">KSh {product.price.toLocaleString()}</div>
                <div className="product-category">{product.category}</div>
                
                {sizes.length > 0 && (
                  <div className="sizes-section">
                    <h4>Available Sizes:</h4>
                    <div className="size-tags">
                      {inStockSizes.map((sizeInfo, index) => (
                        <span key={`in-${index}`} className="size-tag in-stock">
                          {sizeInfo.size} ✓
                        </span>
                      ))}
                      {outOfStockSizes.map((sizeInfo, index) => (
                        <span key={`out-${index}`} className="size-tag out-of-stock">
                          {sizeInfo.size} ✗
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="product-actions">
                  <button 
                    onClick={() => onEdit(product)}
                    className="btn btn-outline btn-sm"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => onDelete(product.id)}
                    className="btn btn-danger btn-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductList;
