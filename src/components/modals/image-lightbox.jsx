'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import Image from 'next/image'

export function ImageLightbox({ images, isOpen, onClose, initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  if (!isOpen || !images || images.length === 0) return null

  const currentImage = images[currentIndex]

  function handlePrevious() {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  function handleNext() {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  function handleDownload() {
    window.open(currentImage, '_blank')
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') handlePrevious()
    if (e.key === 'ArrowRight') handleNext()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
        aria-label="Close"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="absolute top-4 right-16 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
        aria-label="Download"
      >
        <Download className="h-6 w-6 text-white" />
      </button>

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="h-8 w-8 text-white" />
        </button>
      )}

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="h-8 w-8 text-white" />
        </button>
      )}

      {/* Image Container */}
      <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
        <div className="relative max-w-7xl max-h-full w-full h-full flex items-center justify-center">
          <img
            src={currentImage}
            alt={`Photo ${currentIndex + 1} of ${images.length}`}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      </div>

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 rounded-full text-white text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Thumbnail Strip (optional, for multiple images) */}
      {images.length > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4 pb-2">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                index === currentIndex
                  ? 'border-white scale-110'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={img}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}