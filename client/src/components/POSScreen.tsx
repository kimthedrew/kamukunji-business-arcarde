import React, { useState, useMemo } from 'react';
import api from '../utils/axiosConfig';
import './POSScreen.css';

interface ProductSize {
  size: string;
  in_stock: boolean;
  quantity: number;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  sizes: string; // "8:1:2,9:0:0,10:1:5"
}

interface Shop {
  id: number;
  shop_name: string;
  shop_number: string;
  contact: string;
  till_number?: string;
  payment_provider?: string;
}

interface CartItem {
  product_id: number;
  product_name: string;
  size: string;
  price: number;
  quantity: number;
  image_url: string;
}

interface POSScreenProps {
  products: Product[];
  shop: Shop;
  onSaleComplete: () => void;
}

const parseSizes = (sizesString: string): ProductSize[] => {
  if (!sizesString) return [];
  return sizesString.split(',').map(part => {
    const [size, inStock, qty] = part.split(':');
    return {
      size,
      in_stock: inStock === '1',
      quantity: parseInt(qty || '0', 10)
    };
  });
};

const POSScreen: React.FC<POSScreenProps> = ({ products, shop, onSaleComplete }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'bank_transfer'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<{
    items: CartItem[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    paymentReference: string;
    customerName: string;
    timestamp: string;
  } | null>(null);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const addToCart = (product: Product, size: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id && i.size === size);
      if (existing) {
        return prev.map(i =>
          i.product_id === product.id && i.size === size
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        size,
        price: product.price,
        quantity: 1,
        image_url: product.image_url
      }];
    });
    setSelectedProduct(null);
  };

  const updateQuantity = (productId: number, size: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i =>
          i.product_id === productId && i.size === size
            ? { ...i, quantity: i.quantity + delta }
            : i
        )
        .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: number, size: string) => {
    setCart(prev => prev.filter(i => !(i.product_id === productId && i.size === size)));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      await api.post('/pos/sale', {
        items: cart.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          size: i.size,
          price: i.price,
          quantity: i.quantity
        })),
        payment_method: paymentMethod,
        payment_reference: (paymentMethod === 'mpesa' || paymentMethod === 'bank_transfer') ? paymentReference : undefined,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        discount: discount || 0
      });

      setReceipt({
        items: [...cart],
        subtotal,
        discount,
        total,
        paymentMethod,
        paymentReference,
        customerName: customerName || 'Walk-in Customer',
        timestamp: new Date().toLocaleString('en-KE')
      });

      // Reset cart and form
      setCart([]);
      setDiscount(0);
      setPaymentMethod('cash');
      setPaymentReference('');
      setCustomerName('');
      setCustomerPhone('');
    } catch (error) {
      console.error('POS sale error:', error);
      alert('Failed to record sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptClose = () => {
    setReceipt(null);
    onSaleComplete(); // refresh products to reflect updated stock
  };

  const buildWhatsAppText = () => {
    if (!receipt) return '';
    const lines = [
      `*${shop.shop_name} - Receipt*`,
      `Date: ${receipt.timestamp}`,
      `Customer: ${receipt.customerName}`,
      '',
      '*Items:*',
      ...receipt.items.map(i => `• ${i.product_name} (Size ${i.size}) x${i.quantity} — KSh ${(i.price * i.quantity).toLocaleString()}`),
      '',
      `Subtotal: KSh ${receipt.subtotal.toLocaleString()}`,
      receipt.discount > 0 ? `Discount: -KSh ${receipt.discount.toLocaleString()}` : '',
      `*Total: KSh ${receipt.total.toLocaleString()}*`,
      `Payment: ${receipt.paymentMethod === 'mpesa' ? 'M-Pesa' : receipt.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}`,
      receipt.paymentReference ? `Ref: ${receipt.paymentReference}` : '',
      '',
      'Thank you for shopping with us!'
    ].filter(Boolean).join('\n');
    return encodeURIComponent(lines);
  };

  return (
    <div className="pos-screen">
      {/* Product Browser */}
      <div className="pos-products-panel">
        <div className="pos-search">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="search-icon">🔍</div>
        </div>

        <div className="pos-products-grid">
          {filteredProducts.length === 0 ? (
            <div className="pos-empty">No products found</div>
          ) : (
            filteredProducts.map(product => {
              const sizes = parseSizes(product.sizes);
              const availableSizes = sizes.filter(s => s.in_stock);
              return (
                <div
                  key={product.id}
                  className={`pos-product-card ${availableSizes.length === 0 ? 'out-of-stock' : ''}`}
                  onClick={() => availableSizes.length > 0 && setSelectedProduct(product)}
                >
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} className="pos-product-img" />
                  )}
                  <div className="pos-product-info">
                    <p className="pos-product-name">{product.name}</p>
                    <p className="pos-product-price">KSh {Number(product.price).toLocaleString()}</p>
                    <div className="pos-product-sizes">
                      {availableSizes.length > 0
                        ? availableSizes.map(s => (
                            <span key={s.size} className="pos-size-dot">{s.size}</span>
                          ))
                        : <span className="pos-out-label">Out of stock</span>
                      }
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="pos-cart-panel">
        <h3 className="pos-cart-title">Cart {cart.length > 0 && <span className="cart-count">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}</h3>

        <div className="pos-cart-items">
          {cart.length === 0 ? (
            <div className="pos-cart-empty">
              <p>No items yet.</p>
              <p>Click a product to add it.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={`${item.product_id}-${item.size}`} className="pos-cart-item">
                <div className="cart-item-info">
                  <p className="cart-item-name">{item.product_name}</p>
                  <p className="cart-item-meta">Size {item.size} · KSh {Number(item.price).toLocaleString()}</p>
                </div>
                <div className="cart-item-controls">
                  <button onClick={() => updateQuantity(item.product_id, item.size, -1)} className="qty-btn">−</button>
                  <span className="qty-value">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product_id, item.size, 1)} className="qty-btn">+</button>
                  <button onClick={() => removeFromCart(item.product_id, item.size)} className="remove-btn">✕</button>
                </div>
                <p className="cart-item-total">KSh {(item.price * item.quantity).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="pos-checkout">
            <div className="pos-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>KSh {subtotal.toLocaleString()}</span>
              </div>
              <div className="total-row">
                <span>Discount (KSh)</span>
                <input
                  type="number"
                  min={0}
                  value={discount || ''}
                  onChange={e => setDiscount(parseInt(e.target.value) || 0)}
                  className="discount-input"
                  placeholder="0"
                />
              </div>
              <div className="total-row total-final">
                <span>Total</span>
                <span>KSh {total.toLocaleString()}</span>
              </div>
            </div>

            <div className="pos-payment-method">
              <button
                className={`payment-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                Cash
              </button>
              <button
                className={`payment-btn ${paymentMethod === 'mpesa' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('mpesa')}
              >
                M-Pesa
              </button>
              <button
                className={`payment-btn ${paymentMethod === 'bank_transfer' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('bank_transfer')}
              >
                Bank
              </button>
            </div>

            {(paymentMethod === 'mpesa' || paymentMethod === 'bank_transfer') && (
              <input
                type="text"
                placeholder={paymentMethod === 'mpesa' ? 'M-Pesa reference (optional)' : 'Bank reference / slip no. (optional)'}
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                className="form-input pos-ref-input"
              />
            )}

            <input
              type="text"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="form-input pos-customer-input"
            />
            <input
              type="tel"
              placeholder="Customer phone (optional)"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              className="form-input pos-customer-input"
            />

            <div className="pos-actions">
              <button
                onClick={() => setCart([])}
                className="btn btn-secondary"
              >
                Clear
              </button>
              <button
                onClick={handleCompleteSale}
                disabled={loading}
                className="btn btn-success pos-complete-btn"
              >
                {loading ? 'Recording...' : `Complete Sale · KSh ${total.toLocaleString()}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Size Picker Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content pos-size-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select Size — {selectedProduct.name}</h2>
              <button className="close-btn" onClick={() => setSelectedProduct(null)}>×</button>
            </div>
            <p className="pos-size-price">KSh {Number(selectedProduct.price).toLocaleString()}</p>
            <div className="pos-size-grid">
              {parseSizes(selectedProduct.sizes)
                .filter(s => s.in_stock)
                .map(s => (
                  <button
                    key={s.size}
                    className="pos-size-btn"
                    onClick={() => addToCart(selectedProduct, s.size)}
                  >
                    {s.size}
                    {s.quantity > 0 && <span className="size-qty">({s.quantity})</span>}
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <div className="modal-overlay">
          <div className="modal-content pos-receipt-modal">
            <div className="receipt-header">
              <div className="receipt-check">✓</div>
              <h2>Sale Complete!</h2>
              <p>{shop.shop_name}</p>
              <p className="receipt-time">{receipt.timestamp}</p>
            </div>

            <div className="receipt-customer">
              <strong>{receipt.customerName}</strong>
            </div>

            <div className="receipt-items">
              {receipt.items.map(item => (
                <div key={`${item.product_id}-${item.size}`} className="receipt-item">
                  <span>{item.product_name} (Size {item.size}) ×{item.quantity}</span>
                  <span>KSh {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="receipt-totals">
              {receipt.discount > 0 && (
                <>
                  <div className="receipt-row">
                    <span>Subtotal</span>
                    <span>KSh {receipt.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="receipt-row">
                    <span>Discount</span>
                    <span>-KSh {receipt.discount.toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="receipt-row receipt-total">
                <span>Total</span>
                <span>KSh {receipt.total.toLocaleString()}</span>
              </div>
              <div className="receipt-row">
                <span>Payment</span>
                <span>{receipt.paymentMethod === 'mpesa' ? 'M-Pesa' : receipt.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}</span>
              </div>
              {receipt.paymentReference && (
                <div className="receipt-row">
                  <span>Reference</span>
                  <span>{receipt.paymentReference}</span>
                </div>
              )}
            </div>

            <div className="receipt-actions">
              <a
                href={`https://wa.me/?text=${buildWhatsAppText()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success"
              >
                Share via WhatsApp
              </a>
              <button onClick={() => window.print()} className="btn btn-outline">
                Print Receipt
              </button>
              <button onClick={handleReceiptClose} className="btn btn-primary">
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSScreen;
