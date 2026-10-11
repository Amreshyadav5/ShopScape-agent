import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Camera,
  Sparkles,
  AlertCircle,
  Trash2,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';
import type { Product } from '../types';
import { api } from '../api';
import { formatPrice, resolveImageUrl } from '../utils';

interface VisualSearchModalProps {
  isOpen: boolean;
  currencySymbol?: string;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const VisualSearchModal: React.FC<VisualSearchModalProps> = ({
  isOpen,
  currencySymbol = '₹',
  onClose,
  onSelectProduct,
  onAddToCart,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [addedProductId, setAddedProductId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateAndSetFile = (file: File) => {
    setError(null);

    // Validate size (10 MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`File size (${formatFileSize(file.size)}) exceeds the 10 MB maximum limit. Please choose a smaller photo.`);
      return false;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Unsupported file type. Please upload a PNG, JPG, or WebP image.');
      return false;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResults(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const data = await api.visualSearch(formData);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Visual search could not analyze the image. Please try another photo.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLoadSample = async (sampleUrl: string, sampleFilename: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(sampleUrl);
      const blob = await res.blob();
      const file = new File([blob], sampleFilename, { type: blob.type || 'image/png' });
      validateAndSetFile(file);
    } catch {
      setError('Could not load sample photo. Please upload your own file.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCartWithFeedback = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1800);
  };

  // Extract catalog matches and analysis
  const matchedProducts: Product[] = results?.matched_products || results?.matches || [];
  const analysis = results?.analysis || results;
  const identifiedType = analysis?.product_type || analysis?.category;
  const visualDesc = analysis?.visual_details || analysis?.visual_description;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(20, 28, 18, 0.48)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: '20px',
          border: '1px solid var(--border-light, #e8dfd1)',
          boxShadow: '0 20px 48px -12px rgba(28, 42, 20, 0.16), 0 2px 8px rgba(0, 0, 0, 0.04)',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '24px',
          boxSizing: 'border-box',
          margin: 'auto',
          color: 'var(--text-primary, #1a2e22)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================
            HEADER: Camera Icon, Title, Subtitle, Close Button
        ========================================================= */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem',
            paddingBottom: '1.125rem',
            borderBottom: '1px solid var(--border-light, #e8dfd1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--green-100, #eaf4eb)',
                color: 'var(--green-600, #2e7d32)',
                border: '1px solid var(--green-200, #cde3ce)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Camera style={{ width: '22px', height: '22px' }} />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display, Playfair Display, Georgia, serif)',
                  fontSize: '1.375rem',
                  fontWeight: 600,
                  color: 'var(--text-primary, #1a2e22)',
                  margin: 0,
                  lineHeight: 1.25,
                  letterSpacing: '-0.01em',
                }}
              >
                Visual Product Discovery
              </h2>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted, #556b5d)',
                  margin: '0.2rem 0 0',
                  lineHeight: 1.4,
                }}
              >
                Upload a product photo to find matching items in our catalog.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close dialog"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#f9f6f1',
              border: '1px solid var(--border-light, #e8dfd1)',
              color: 'var(--text-muted, #556b5d)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ede7dc';
              e.currentTarget.style.color = 'var(--text-primary, #1a2e22)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f9f6f1';
              e.currentTarget.style.color = 'var(--text-muted, #556b5d)';
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* =========================================================
            ERROR NOTIFICATION BANNER
        ========================================================= */}
        {error && (
          <div
            style={{
              marginBottom: '1.25rem',
              padding: '0.875rem 1rem',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0, color: '#dc2626' }} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#dc2626',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* =========================================================
            STAGE 1: SPACIOUS DRAG & DROP UPLOAD DROPZONE
        ========================================================= */}
        {!previewUrl ? (
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                minHeight: '230px',
                background: isDragging ? '#edf7ee' : '#faf8f5',
                border: isDragging
                  ? '2px dashed var(--green-500, #059669)'
                  : '2px dashed #a4cfa8',
                borderRadius: '16px',
                padding: '2.5rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isDragging) {
                  e.currentTarget.style.borderColor = 'var(--green-500, #059669)';
                  e.currentTarget.style.background = '#f5f9f5';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDragging) {
                  e.currentTarget.style.borderColor = '#a4cfa8';
                  e.currentTarget.style.background = '#faf8f5';
                }
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg, image/webp"
                style={{ display: 'none' }}
              />

              {/* Centered Upload Icon with circular light-green backdrop */}
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: isDragging ? 'var(--green-200, #c8e4c4)' : '#e4f3e6',
                  color: 'var(--green-600, #2e7d32)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  transition: 'transform 0.2s, background 0.2s',
                  transform: isDragging ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                <Upload style={{ width: '24px', height: '24px' }} />
              </div>

              {/* Primary Instruction */}
              <p
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: 'var(--text-primary, #1a2e22)',
                  margin: 0,
                }}
              >
                Drop your image here
              </p>

              {/* Secondary CTA */}
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--green-600, #2e7d32)',
                  fontWeight: 600,
                  marginTop: '0.25rem',
                  marginBottom: 0,
                }}
              >
                or click to browse files
              </p>

              {/* Supported formats & file size */}
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted, #7a8a80)',
                  marginTop: '0.625rem',
                  marginBottom: 0,
                }}
              >
                PNG, JPG, WebP · Maximum 10 MB
              </p>
            </div>

            {/* Quick Sample Inspiration */}
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #7a8a80)' }}>
                Try with a sample:
              </span>
              <button
                type="button"
                onClick={() => handleLoadSample('/resources/honey.png', 'honey.png')}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--text-primary, #1a2e22)',
                  background: '#f9f6f1',
                  border: '1px solid var(--border-light, #e8dfd1)',
                  borderRadius: '999px',
                  padding: '0.25rem 0.625rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--green-500, #059669)';
                  e.currentTarget.style.background = '#eaf4eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-light, #e8dfd1)';
                  e.currentTarget.style.background = '#f9f6f1';
                }}
              >
                🍯 Raw Honey Jar
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('/resources/oats.png', 'oats.png')}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--text-primary, #1a2e22)',
                  background: '#f9f6f1',
                  border: '1px solid var(--border-light, #e8dfd1)',
                  borderRadius: '999px',
                  padding: '0.25rem 0.625rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--green-500, #059669)';
                  e.currentTarget.style.background = '#eaf4eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-light, #e8dfd1)';
                  e.currentTarget.style.background = '#f9f6f1';
                }}
              >
                🌾 Rolled Oats
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================
              STAGE 2: IMAGE PREVIEW & ACTIONS
          ========================================================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Preview Card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                padding: '1.25rem',
                borderRadius: '16px',
                background: '#faf8f5',
                border: '1px solid var(--border-light, #e8dfd1)',
              }}
            >
              {/* Contained Image Preview */}
              <div
                style={{
                  width: '100%',
                  height: '210px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1px solid #ede8de',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: '8px',
                  boxSizing: 'border-box',
                }}
              >
                <img
                  src={previewUrl}
                  alt="Selected upload preview"
                  style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    borderRadius: '8px',
                  }}
                />
              </div>

              {/* File Metadata & Actions Bar */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--text-primary, #1a2e22)',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {selectedFile?.name}
                  </p>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted, #7a8a80)',
                      margin: '0.2rem 0 0',
                    }}
                  >
                    {selectedFile && formatFileSize(selectedFile.size)} · Ready for visual catalog matching
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={loading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.55rem 0.875rem',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: '#991b1b',
                      background: '#fff',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.currentTarget.style.background = '#fef2f2';
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) e.currentTarget.style.background = '#fff';
                    }}
                  >
                    <Trash2 style={{ width: '14px', height: '14px' }} />
                    <span>Remove image</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={loading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.55rem 1.25rem',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      background: loading ? '#93c59e' : 'var(--green-500, #059669)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: 'var(--shadow-xs, 0 1px 3px rgba(0,0,0,0.1))',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) e.currentTarget.style.background = 'var(--green-600, #047857)';
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) e.currentTarget.style.background = 'var(--green-500, #059669)';
                    }}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="animate-spin" style={{ width: '14px', height: '14px' }} />
                        <span>Searching Catalog...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles style={{ width: '15px', height: '15px' }} />
                        <span>Find Matching Products</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* =========================================================
                STAGE 3: REAL MATCHING PRODUCTS CATALOG RESULTS
            ========================================================= */}
            {results && (
              <div
                style={{
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-light, #e8dfd1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                {/* AI Visual Identification Callout */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    background: '#f4f8f4',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #d4e7d5',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles style={{ width: '16px', height: '16px', color: 'var(--green-600, #059669)' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary, #1a2e22)' }}>
                      AI Catalog Matches ({matchedProducts.length})
                    </span>
                  </div>

                  {identifiedType && (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        background: 'var(--green-100, #eaf4eb)',
                        color: 'var(--green-700, #166534)',
                        border: '1px solid var(--green-200, #c8e4c4)',
                      }}
                    >
                      Identified: {identifiedType}
                    </span>
                  )}
                </div>

                {visualDesc && (
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary, #3d4f2e)',
                      fontStyle: 'italic',
                      margin: 0,
                      padding: '0.625rem 0.875rem',
                      background: '#faf8f5',
                      borderRadius: '8px',
                      border: '1px solid #ede8de',
                    }}
                  >
                    "{visualDesc}"
                  </p>
                )}

                {/* Products Grid */}
                {matchedProducts.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '0.875rem',
                      maxHeight: '280px',
                      overflowY: 'auto',
                      paddingRight: '0.25rem',
                    }}
                  >
                    {matchedProducts.map((product: Product) => {
                      const isRecentlyAdded = addedProductId === product.id;
                      return (
                        <div
                          key={product.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            borderRadius: '12px',
                            background: '#ffffff',
                            border: '1px solid var(--border-light, #e8dfd1)',
                            boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.03))',
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--green-400, #5a9e3a)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.06))';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-light, #e8dfd1)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.03))';
                          }}
                        >
                          <img
                            src={resolveImageUrl(product.image_url)}
                            alt={product.name}
                            style={{
                              width: '56px',
                              height: '56px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              background: '#f8f6f2',
                              border: '1px solid #ede8de',
                              flexShrink: 0,
                            }}
                          />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4
                              style={{
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                color: 'var(--text-primary, #1a2e22)',
                                margin: 0,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {product.name}
                            </h4>

                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', marginTop: '0.15rem' }}>
                              <span
                                style={{
                                  fontSize: '0.875rem',
                                  fontWeight: 700,
                                  color: 'var(--green-600, #059669)',
                                }}
                              >
                                {formatPrice(product.price, currencySymbol)}
                              </span>
                              {product.is_organic && (
                                <span
                                  style={{
                                    fontSize: '0.625rem',
                                    color: 'var(--green-700, #1f4212)',
                                    fontWeight: 600,
                                    background: 'var(--green-50, #f0f5ea)',
                                    padding: '0.05rem 0.35rem',
                                    borderRadius: '3px',
                                  }}
                                >
                                  Organic
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onSelectProduct(product);
                                }}
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                  color: 'var(--text-secondary, #3d4f2e)',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                  textDecoration: 'underline',
                                }}
                              >
                                View Details
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleAddToCartWithFeedback(product, e)}
                                style={{
                                  marginLeft: 'auto',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.25rem 0.625rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: '#ffffff',
                                  background: isRecentlyAdded
                                    ? 'var(--green-700, #1f4212)'
                                    : 'var(--green-500, #059669)',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'background 0.15s',
                                }}
                              >
                                {isRecentlyAdded ? (
                                  <>
                                    <CheckCircle2 style={{ width: '12px', height: '12px' }} />
                                    <span>Added</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag style={{ width: '12px', height: '12px' }} />
                                    <span>+ Add</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '2rem 1rem',
                      textAlign: 'center',
                      background: '#faf8f5',
                      borderRadius: '10px',
                      border: '1px dashed #dcd4c6',
                      color: 'var(--text-muted, #7a8a80)',
                    }}
                  >
                    <p style={{ fontSize: '0.8125rem', margin: 0 }}>
                      No direct visual matches found in current catalog for this item.
                    </p>
                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: 0 }}>
                      Try uploading another photo or search our catalog by department.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
