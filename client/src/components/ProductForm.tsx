import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCloudinaryUrl } from '../config/cloudinary';
import './ProductForm.css';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  public_id?: string;
  category: string;
  sizes: string;
}

interface ProductFormProps {
  product?: Product | null;
  onSave: () => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    public_id: '',
    category: 'shoes'
  });
  const [sizes, setSizes] = useState<Array<{size: string, in_stock: boolean}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        image_url: product.image_url || '',
        public_id: product.public_id || '',
        category: product.category
      });

      // Set uploaded image - handle both Cloudinary and local uploads
      if (product.public_id) {
        setUploadedImage(getCloudinaryUrl(product.public_id));
      } else if (product.image_url && product.image_url.startsWith('/uploads/')) {
        setUploadedImage(product.image_url);
      } else if (product.image_url) {
        setUploadedImage(product.image_url);
      }

      // Parse existing sizes
      if (product.sizes) {
        const parsedSizes = product.sizes.split(',').map(sizeInfo => {
          const [size, inStock] = sizeInfo.split(':');
          return {
            size,
            in_stock: inStock === '1'
          };
        });
        setSizes(parsedSizes);
      }
    }
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleCloudinaryUpload = async (file: File) => {
    setUploading(true);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          
          const response = await axios.post('/api/upload', {
            image: base64
          });
          
          setUploadedImage(response.data.imageUrl);
          setFormData(prev => ({
            ...prev,
            image_url: response.data.imageUrl,
            public_id: response.data.publicId
          }));
        } catch (error) {
          setError('Failed to upload image. Please try again.');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setError('Failed to process image. Please try again.');
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      
      // Check file size (300KB limit)
      const maxSize = 300 * 1024; // 300KB in bytes
      if (file.size > maxSize) {
        setError(`Image size must be less than 300KB. Your image is ${Math.round(file.size / 1024)}KB.`);
        return;
      }
      
      handleCloudinaryUpload(file);
    }
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    setFormData(prev => ({
      ...prev,
      image_url: '',
      public_id: ''
    }));
  };

  const addSize = () => {
    setSizes(prev => [...prev, { size: '', in_stock: true }]);
  };

  const removeSize = (index: number) => {
    setSizes(prev => prev.filter((_, i) => i !== index));
  };

  const updateSize = (index: number, field: string, value: string | boolean | number) => {
    setSizes(prev => prev.map((size, i) => 
      i === index ? { ...size, [field]: value } : size
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        sizes: sizes.filter(s => s.size.trim())
      };

      console.log('Submitting product data:', productData);

      if (product) {
        await axios.put(`/api/products/${product.id}`, productData, { headers });
      } else {
        await axios.post('/api/products', productData, { headers });
      }

      onSave();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-form-overlay">
      <div className="product-form">
        <div className="form-header">
          <h3>{product ? 'Edit Product' : 'Add New Product'}</h3>
          <button onClick={onCancel} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-input"
              >
                <option value="shoes">Shoes</option>
                <option value="official">Official Shoes</option>
                <option value="casual">Casual</option>
                <option value="sneakers">Sneakers</option>
                <option value="boots">Boots</option>
                <option value="sandals">Sandals</option>
                <option value="others">Others</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              rows={3}
            />
          </div>

            <div className="form-group">
              <label className="form-label">Price (KSh) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="form-input"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="image-upload-section">
              <label className="form-label">Product Image</label>
              
              {uploadedImage ? (
                <div className="uploaded-image-container">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded product" 
                    className="uploaded-image"
                  />
                  <button 
                    type="button" 
                    onClick={removeUploadedImage}
                    className="btn btn-danger btn-sm remove-image-btn"
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <div className="image-upload-options">
                  <div className="file-upload-section">
                    <label className="file-upload-label">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="file-input"
                        disabled={uploading}
                      />
                      <div className={`file-upload-area ${uploading ? 'uploading' : ''}`}>
                        {uploading ? (
                          <div className="upload-content">
                            <div className="upload-spinner"></div>
                            <p>Uploading to Cloudinary...</p>
                          </div>
                        ) : (
                          <div className="upload-content">
                            <div className="upload-icon">📷</div>
                            <p>Click to select image</p>
                            <p className="upload-hint">Supports JPG, PNG, GIF, WebP (max 5MB)</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                  
                  <div className="upload-divider">
                    <span>OR</span>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Image URL</label>
                    <input
                      type="url"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              )}
            </div>

          <div className="sizes-section">
            <div className="sizes-header">
              <label className="form-label">Available Sizes</label>
              <button type="button" onClick={addSize} className="btn btn-outline btn-sm">
                Add Size
              </button>
            </div>

            {sizes.map((size, index) => (
              <div key={index} className="size-row">
                <input
                  type="text"
                  value={size.size}
                  onChange={(e) => updateSize(index, 'size', e.target.value)}
                  className="form-input"
                  placeholder="Size (e.g., 8, 9, 10, L, M)"
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={size.in_stock}
                    onChange={(e) => updateSize(index, 'in_stock', e.target.checked)}
                  />
                  In Stock
                </label>
                <button
                  type="button"
                  onClick={() => removeSize(index)}
                  className="btn btn-danger btn-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
