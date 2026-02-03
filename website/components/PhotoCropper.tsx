'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './PhotoCropper.module.css';

interface PhotoCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImageBase64: string) => void;
}

export default function PhotoCropper({ isOpen, onClose, onSave }: PhotoCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setImageSrc(null);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
    }
  }, [isOpen]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
      setScale(1);
      setPosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    imageRef.current = e.currentTarget;
    setImageLoaded(true);

    // Center the image initially
    const img = e.currentTarget;
    const containerSize = 280; // Crop area size
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const initialScale = containerSize / minDim;
    setScale(Math.max(initialScale, 0.5));
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageLoaded) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [imageLoaded, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.1, Math.min(3, prev + delta)));
  }, []);

  const handleScaleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setScale(parseFloat(e.target.value));
  }, []);

  const handleSave = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const outputSize = 200; // Output image size (200x200 for profile photos)
    canvas.width = outputSize;
    canvas.height = outputSize;

    const img = imageRef.current;
    const cropAreaSize = 280; // Size of the visible crop area

    // Calculate the scaled image dimensions
    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;

    // Calculate where to start drawing from the source image
    const sourceX = (cropAreaSize / 2 - position.x) / scale - (img.naturalWidth / 2) + (img.naturalWidth / 2);
    const sourceY = (cropAreaSize / 2 - position.y) / scale - (img.naturalHeight / 2) + (img.naturalHeight / 2);

    // The crop area in source image coordinates
    const cropInSourceX = (cropAreaSize / 2 - position.x - scaledWidth / 2) / scale * -1;
    const cropInSourceY = (cropAreaSize / 2 - position.y - scaledHeight / 2) / scale * -1;
    const cropInSourceSize = cropAreaSize / scale;

    // Clear and draw circular clip
    ctx.clearRect(0, 0, outputSize, outputSize);
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw the cropped portion
    ctx.drawImage(
      img,
      cropInSourceX,
      cropInSourceY,
      cropInSourceSize,
      cropInSourceSize,
      0,
      0,
      outputSize,
      outputSize
    );

    // Convert to base64
    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    onSave(base64);
    onClose();
  }, [scale, position, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Upload Profile Photo</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          {!imageSrc ? (
            <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p>Click to select a photo</p>
              <span>JPG, PNG up to 5MB</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <>
              <div
                ref={containerRef}
                className={styles.cropContainer}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <div className={styles.cropArea}>
                  <div className={styles.circleOverlay} />
                  <img
                    src={imageSrc}
                    alt="Crop preview"
                    onLoad={handleImageLoad}
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                    draggable={false}
                  />
                </div>
              </div>

              <div className={styles.controls}>
                <label>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.01"
                  value={scale}
                  onChange={handleScaleChange}
                  className={styles.slider}
                />
                <label>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </label>
              </div>

              <p className={styles.hint}>Drag to position, scroll to zoom</p>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          {imageSrc && (
            <button
              className={styles.changeButton}
              onClick={() => {
                setImageSrc(null);
                setImageLoaded(false);
              }}
            >
              Change Photo
            </button>
          )}
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={!imageLoaded}
          >
            Save Photo
          </button>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}
