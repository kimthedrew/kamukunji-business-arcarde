import React from 'react';
import './ProductCard.css';

interface Product {
  id: number;
  shop_id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  shop_number: string;
  shop_name: string;
  contact: string;
  sizes: string;
}

interface ProductCardProps {
  product: Product;
  onOrder: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onOrder }) => {
  const parseSizes = (sizesString: string) => {
    if (!sizesString) return [];
    return sizesString.split(',').map(sizeInfo => {
      const [size, inStock] = sizeInfo.split(':');
      return { size, inStock: inStock === '1' };
    });
  };

  const sizes = parseSizes(product.sizes);

  return (
    <div className="product-card">
      <div className="product-image-container">
        {product.image_url ? (
          <img 
            src={product.image_url.startsWith('/uploads/') 
              ? `http://localhost:8000${product.image_url}` 
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
        
        <div className="product-shop">
          <strong>Shop {product.shop_number}</strong> - {product.shop_name}
        </div>
        
        <div className="product-contact">
          📞 {product.contact}
        </div>
        
        {sizes.length > 0 && (
          <div className="sizes-section">
            <h4>Available Sizes:</h4>
            <div className="size-tags">
              {sizes.map((sizeInfo, index) => (
                <span 
                  key={index}
                  className={`size-tag ${sizeInfo.inStock ? 'in-stock' : 'out-of-stock'}`}
                >
                  {sizeInfo.size} {sizeInfo.inStock ? '✓' : '✗'}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <button 
          onClick={onOrder}
          className="btn btn-primary order-btn"
          disabled={!sizes.some(s => s.inStock)}
        >
          {sizes.some(s => s.inStock) ? 'Order Now' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
