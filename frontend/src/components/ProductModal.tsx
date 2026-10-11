import React, { useState, useEffect } from 'react';
import { X, Star, ShoppingBag, Sparkles, Check, ShieldCheck, Truck, ArrowRight, UserCheck, MessageSquarePlus, ThumbsUp, Send } from 'lucide-react';
import type { Product, Review } from '../types';
import { api } from '../api';
import { formatPrice, resolveImageUrl, formatDate } from '../utils';

interface ProductModalProps {
  product: Product | null;
  currencySymbol?: string;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onAskAI: (prompt: string) => void;
  onReviewAdded?: (productId: number, newAvg: number, newCount: number) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  currencySymbol = '₹',
  onClose,
  onAddToCart,
  onBuyNow,
  onAskAI,
  onReviewAdded,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [added, setAdded] = useState(false);

  // Review Form States
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');
  const [helpfulVotes, setHelpfulVotes] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setLoadingReviews(true);
      setShowReviewForm(false);
      setReviewSuccessMsg('');
      api.getProduct(product.id).then((data) => {
        setReviews(data.reviews || []);
      }).catch(() => {
        setReviews([]);
      }).finally(() => {
        setLoadingReviews(false);
      });
    }
  }, [product]);

  if (!product) return null;

  const isOutOfStock = product.stock_quantity <= 0;

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuy = () => {
    onBuyNow(product, quantity);
  };

  const categoryDisplay = (product.category || 'General')
    .split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const totalReviewsCount = reviews.length;
  const currentAvgRating = totalReviewsCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount
    : (product.average_rating || 4.8);

  const starCounts: Record<number, number> = {
    5: reviews.filter(r => Math.round(r.rating) === 5).length,
    4: reviews.filter(r => Math.round(r.rating) === 4).length,
    3: reviews.filter(r => Math.round(r.rating) === 3).length,
    2: reviews.filter(r => Math.round(r.rating) === 2).length,
    1: reviews.filter(r => Math.round(r.rating) === 1).length,
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'VC';
  };

  const toggleHelpful = (revId: number) => {
    setHelpfulVotes(prev => ({ ...prev, [revId]: !prev[revId] }));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !reviewText.trim()) return;
    setSubmittingReview(true);
    try {
      const created = await api.addReview(product.id, {
        rating: newRating,
        reviewer_name: reviewerName.trim() || 'Verified Customer',
        review_text: reviewText.trim()
      });
      const updatedReviews = [created, ...reviews];
      setReviews(updatedReviews);
      const newAvg = updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length;
      if (onReviewAdded) {
        onReviewAdded(product.id, Number(newAvg.toFixed(1)), updatedReviews.length);
      }
      setReviewText('');
      setReviewerName('');
      setShowReviewForm(false);
      setReviewSuccessMsg('Thank you! Your verified review has been published.');
      setTimeout(() => setReviewSuccessMsg(''), 4000);
    } catch {
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(28,42,20,0.5)',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%', maxWidth: '820px',
          background: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: '2rem auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem', zIndex: 20,
            padding: '0.375rem',
            background: 'var(--bg-muted)',
            border: '1px solid var(--border-light)',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center',
            transition: 'background 0.15s',
          }}
        >
          <X style={{ width: '16px', height: '16px' }} />
        </button>

        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {/* Left: Image */}
          <div style={{
            width: '100%',
            maxWidth: '380px',
            minHeight: '320px',
            background: 'var(--bg-muted)',
            display: 'flex', flexDirection: 'column',
            padding: '1.5rem',
            flexShrink: 0,
          }}>
            <div style={{
              position: 'relative',
              width: '100%', aspectRatio: '1',
              borderRadius: '8px', overflow: 'hidden',
              background: 'var(--bg-strong)',
            }}>
              <img
                src={resolveImageUrl(product.image_url)}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80';
                }}
              />
              {product.is_organic && (
                <div style={{
                  position: 'absolute', top: '0.75rem', left: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  background: 'rgba(255,255,255,0.92)',
                  border: '1px solid var(--green-200)',
                  borderRadius: '3px',
                  fontSize: '0.6rem', fontWeight: 600,
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: 'var(--green-600)',
                }}>
                  Certified Organic
                </div>
              )}
            </div>

            <button
              onClick={() => {
                onClose();
                onAskAI(`Tell me about ${product.name}. What are the health benefits and why should I buy it?`);
              }}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.625rem',
                background: 'var(--green-50)',
                border: '1px solid var(--green-200)',
                borderRadius: '6px',
                fontSize: '0.8rem', fontWeight: 500,
                color: 'var(--green-600)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-100)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--green-50)'}
            >
              <Sparkles style={{ width: '13px', height: '13px' }} />
              Ask AI: Why should I buy this?
            </button>
          </div>

          {/* Right: Details */}
          <div style={{
            flex: 1, minWidth: 0,
            padding: '1.5rem 1.75rem',
            display: 'flex', flexDirection: 'column',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            {/* Category + SKU */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '0.625rem',
            }}>
              <span className="category-label">{categoryDisplay}</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>
                {product.sku || `#${product.id}`}
              </span>
            </div>

            {/* Name */}
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.375rem', fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
              marginBottom: '0.75rem',
            }}>
              {product.name}
            </h2>

            {/* Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '1px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    style={{
                      width: '14px', height: '14px',
                      fill: s <= Math.round(currentAvgRating) ? 'var(--amber-400)' : 'var(--border-strong)',
                      color: s <= Math.round(currentAvgRating) ? 'var(--amber-400)' : 'var(--border-strong)',
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentAvgRating.toFixed(1)}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ({totalReviewsCount || product.review_count} verified reviews)
              </span>
            </div>

            {/* Price */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: '0.75rem',
              padding: '0.875rem 1rem',
              background: 'var(--bg-muted)',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              marginBottom: '1rem',
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatPrice(product.price, currencySymbol)}
              </span>
              {product.sale_price && product.sale_price < product.price && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-light)', textDecoration: 'line-through' }}>
                  {formatPrice(product.sale_price, currencySymbol)}
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--green-600)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <ShieldCheck style={{ width: '13px', height: '13px' }} />
                Price match guarantee
              </span>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                About this product
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                {product.description || product.short_description || 'Carefully sourced from certified organic farms, ensuring maximum purity and nutritional value.'}
              </p>
            </div>

            {/* Stock */}
            <div style={{ marginBottom: '1.25rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Availability:</span>
              {isOutOfStock ? (
                <span style={{ color: '#c53030', fontWeight: 500 }}>Out of stock</span>
              ) : (
                <span style={{ color: 'var(--green-600)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Check style={{ width: '12px', height: '12px' }} />
                  In stock ({product.stock_quantity} units)
                </span>
              )}
            </div>

            {/* Quantity + Actions */}
            <div style={{
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-light)',
              display: 'flex', flexDirection: 'column', gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Quantity */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  border: '1px solid var(--border-mid)',
                  borderRadius: '6px', overflow: 'hidden',
                  background: 'var(--bg-surface)',
                }}>
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    style={{
                      width: '34px', height: '34px',
                      background: 'none', border: 'none',
                      cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      color: 'var(--text-muted)',
                      opacity: quantity <= 1 ? 0.35 : 1,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (quantity > 1) e.currentTarget.style.background = 'var(--bg-muted)'; }}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    −
                  </button>
                  <span style={{
                    width: '36px', textAlign: 'center',
                    fontSize: '0.9375rem', fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}
                    disabled={quantity >= product.stock_quantity || isOutOfStock}
                    style={{
                      width: '34px', height: '34px',
                      background: 'none', border: 'none',
                      cursor: quantity >= product.stock_quantity ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      color: 'var(--text-muted)',
                      opacity: quantity >= product.stock_quantity ? 0.35 : 1,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (quantity < product.stock_quantity) e.currentTarget.style.background = 'var(--bg-muted)'; }}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    +
                  </button>
                </div>

                {/* Add to cart */}
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAdd}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.625rem',
                    background: added ? 'var(--green-100)' : isOutOfStock ? 'var(--bg-muted)' : 'var(--bg-surface)',
                    color: added ? 'var(--green-700)' : isOutOfStock ? 'var(--text-light)' : 'var(--text-primary)',
                    border: '1px solid',
                    borderColor: added ? 'var(--green-300)' : 'var(--border-mid)',
                    borderRadius: '6px',
                    fontSize: '0.875rem', fontWeight: 500,
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {added ? (
                    <><Check style={{ width: '15px', height: '15px' }} />Added</>
                  ) : (
                    <><ShoppingBag style={{ width: '15px', height: '15px' }} />Add to Cart</>
                  )}
                </button>

                {/* Buy now */}
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleBuy}
                  className="btn btn-primary"
                  style={{ opacity: isOutOfStock ? 0.4 : 1, flexShrink: 0 }}
                >
                  Buy Now
                  <ArrowRight style={{ width: '15px', height: '15px' }} />
                </button>
              </div>

              {/* Trust row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-evenly',
                fontSize: '0.75rem', color: 'var(--text-muted)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Truck style={{ width: '13px', height: '13px', color: 'var(--green-500)' }} />
                  Fast dispatch
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ShieldCheck style={{ width: '13px', height: '13px', color: 'var(--green-500)' }} />
                  Certified pure
                </span>
              </div>
            </div>

            {/* Reviews Section */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{
                    fontSize: '0.875rem', fontWeight: 600,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                  }}>
                    Customer Reviews
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      ({totalReviewsCount} verified)
                    </span>
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(prev => !prev)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem', fontWeight: 600,
                    background: showReviewForm ? 'var(--bg-muted)' : 'var(--green-50, #f0fdf4)',
                    color: showReviewForm ? 'var(--text-muted)' : 'var(--green-700, #15803d)',
                    border: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <MessageSquarePlus style={{ width: '13px', height: '13px' }} />
                  {showReviewForm ? 'Cancel Review' : 'Write a Review'}
                </button>
              </div>

              {/* Success Notification */}
              {reviewSuccessMsg && (
                <div style={{
                  padding: '0.625rem 0.875rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid var(--green-500)',
                  borderRadius: '6px',
                  color: 'var(--green-700, #15803d)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  marginBottom: '1rem',
                }}>
                  <Check style={{ width: '15px', height: '15px' }} />
                  {reviewSuccessMsg}
                </div>
              )}

              {/* Review Submission Form */}
              {showReviewForm && (
                <form
                  onSubmit={handleSubmitReview}
                  style={{
                    padding: '1rem',
                    background: 'var(--bg-muted)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-mid)',
                    marginBottom: '1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Overall Rating:
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setNewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                          }}
                        >
                          <Star
                            style={{
                              width: '18px', height: '18px',
                              fill: star <= (hoverRating || newRating) ? 'var(--amber-400)' : 'var(--border-strong)',
                              color: star <= (hoverRating || newRating) ? 'var(--amber-400)' : 'var(--border-strong)',
                              transition: 'transform 0.1s',
                            }}
                          />
                        </button>
                      ))}
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--amber-500)', marginLeft: '0.375rem' }}>
                        {(hoverRating || newRating).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Your Name (e.g. Priya Sharma)"
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-mid)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                    }}
                  />

                  <textarea
                    rows={3}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="What did you like or dislike about this product? How did it perform or taste?"
                    required
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-mid)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.75rem', fontWeight: 500,
                        background: 'transparent',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReview || !reviewText.trim()}
                      className="btn btn-primary"
                      style={{
                        padding: '0.375rem 0.875rem',
                        fontSize: '0.75rem',
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                      }}
                    >
                      <Send style={{ width: '12px', height: '12px' }} />
                      {submittingReview ? 'Submitting…' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              )}

              {/* Rating Breakdown Card */}
              {totalReviewsCount > 0 && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.25rem',
                  padding: '0.875rem 1rem',
                  background: 'var(--bg-muted)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  marginBottom: '1rem',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {currentAvgRating.toFixed(1)}
                    </span>
                    <div style={{ display: 'flex', gap: '1px', margin: '0.25rem 0' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          style={{
                            width: '12px', height: '12px',
                            fill: s <= Math.round(currentAvgRating) ? 'var(--amber-400)' : 'var(--border-strong)',
                            color: s <= Math.round(currentAvgRating) ? 'var(--amber-400)' : 'var(--border-strong)',
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {totalReviewsCount} verified {totalReviewsCount === 1 ? 'buyer' : 'buyers'}
                    </span>
                  </div>

                  {/* Distribution Bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[5, 4, 3, 2, 1].map((ratingLevel) => {
                      const count = starCounts[ratingLevel] || 0;
                      const pct = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
                      return (
                        <div key={ratingLevel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          <span style={{ width: '22px', textAlign: 'right' }}>{ratingLevel}★</span>
                          <div style={{ flex: 1, height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`, height: '100%',
                              background: ratingLevel >= 4 ? 'var(--amber-400)' : 'var(--text-muted)',
                              borderRadius: '3px',
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                          <span style={{ width: '24px', textAlign: 'left', color: 'var(--text-light)' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reviews List */}
              {loadingReviews ? (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Loading reviews…</p>
              ) : reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  No customer reviews yet. Be the first to share your thoughts!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {reviews.map((rev) => {
                    const initials = getInitials(rev.reviewer_name);
                    const isVoted = helpfulVotes[rev.id];
                    return (
                      <div
                        key={rev.id}
                        style={{
                          padding: '0.75rem 0.875rem',
                          background: 'var(--bg-muted)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-light)',
                          fontSize: '0.8125rem',
                          display: 'flex', flexDirection: 'column', gap: '0.375rem',
                        }}
                      >
                        {/* Reviewer info row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {/* Initials Avatar */}
                            <div style={{
                              width: '24px', height: '24px',
                              borderRadius: '50%',
                              background: 'var(--green-100, #dcfce7)',
                              color: 'var(--green-800, #166534)',
                              fontSize: '0.6875rem', fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {initials}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {rev.reviewer_name}
                            </span>
                            {rev.is_verified && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '2px',
                                fontSize: '0.6875rem', color: 'var(--green-600)',
                                background: 'rgba(34, 197, 94, 0.08)',
                                padding: '1px 5px', borderRadius: '4px',
                                fontWeight: 500,
                              }}>
                                <UserCheck style={{ width: '10px', height: '10px' }} />
                                Verified Buyer
                              </span>
                            )}
                          </div>

                          {/* Star Rating */}
                          <div style={{ display: 'flex', gap: '1px' }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                style={{
                                  width: '12px', height: '12px',
                                  fill: s <= rev.rating ? 'var(--amber-400)' : 'var(--border-mid)',
                                  color: s <= rev.rating ? 'var(--amber-400)' : 'var(--border-mid)',
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Review Text */}
                        <p style={{
                          color: 'var(--text-primary)',
                          lineHeight: 1.5,
                          margin: '0.125rem 0',
                          fontStyle: 'normal',
                        }}>
                          "{rev.review_text}"
                        </p>

                        {/* Footer row: Date + Helpful button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-light)' }}>
                            {rev.created_at ? formatDate(rev.created_at) : 'Recently reviewed'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleHelpful(rev.id)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              background: 'transparent',
                              border: 'none',
                              color: isVoted ? 'var(--green-600)' : 'var(--text-light)',
                              fontSize: '0.6875rem',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              fontWeight: isVoted ? 600 : 400,
                            }}
                          >
                            <ThumbsUp style={{ width: '11px', height: '11px' }} />
                            {isVoted ? 'Helpful (1)' : 'Helpful'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
