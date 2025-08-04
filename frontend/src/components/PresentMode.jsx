import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  X, 
  Play, 
  Pause, 
  RotateCcw,
  Maximize,
  Grid3X3
} from 'lucide-react';
import { usePresentation } from '../context/PresentationContext';
import { api } from '../utils/api';

const PresentMode = () => {
  const { id, slideIndex } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = usePresentation();
  const [currentIndex, setCurrentIndex] = useState(parseInt(slideIndex) || 0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlayInterval, setAutoPlayInterval] = useState(5000);
  const [showSlideOverview, setShowSlideOverview] = useState(false);

  useEffect(() => {
    if (id) {
      loadPresentation();
    }
  }, [id]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          previousSlide();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          nextSlide();
          break;
        case 'Escape':
          exitPresentation();
          break;
        case 'f':
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Home':
          setCurrentIndex(0);
          break;
        case 'End':
          setCurrentIndex(state.slides.length - 1);
          break;
        case 'g':
          setShowSlideOverview(!showSlideOverview);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, state.slides.length, showSlideOverview]);

  useEffect(() => {
    let interval;
    if (autoPlay && state.slides.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex(prev => 
          prev < state.slides.length - 1 ? prev + 1 : 0
        );
      }, autoPlayInterval);
    }
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, state.slides.length]);

  useEffect(() => {
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const loadPresentation = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const [presentationResponse, slidesResponse] = await Promise.all([
        api.get(`/presentations/${id}`),
        api.get(`/slides/presentation/${id}`)
      ]);

      dispatch({ type: 'SET_PRESENTATION', payload: presentationResponse.data });
      dispatch({ type: 'SET_SLIDES', payload: slidesResponse.data });
      dispatch({ type: 'SET_PRESENTING', payload: true });
    } catch (error) {
      console.error('Failed to load presentation:', error);
      navigate('/');
    }
  };

  const nextSlide = useCallback(() => {
    if (currentIndex < state.slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, state.slides.length]);

  const previousSlide = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const exitPresentation = () => {
    dispatch({ type: 'SET_PRESENTING', payload: false });
    navigate(`/presentation/${id}`);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setShowSlideOverview(false);
  };

  const renderSlideElement = (element) => {
    switch (element.type) {
      case 'text':
        const styles = element.styles || {};
        return (
          <div
            key={element.id}
            className="absolute"
            style={{
              left: `${element.x}px`,
              top: `${element.y}px`,
              width: `${element.width}px`,
              height: `${element.height}px`,
              fontSize: styles.fontSize || '16px',
              fontFamily: styles.fontFamily || 'Arial',
              color: styles.color || '#000000',
              textAlign: styles.textAlign || 'left',
              fontWeight: styles.fontWeight || 'normal',
              fontStyle: styles.fontStyle || 'normal',
              textDecoration: styles.textDecoration || 'none',
              zIndex: element.z_index || 1
            }}
          >
            <div className="w-full h-full flex items-center">
              {element.content.text || 'Empty text'}
            </div>
          </div>
        );
      
      case 'shape':
        const shapeStyles = element.styles || {};
        return (
          <div
            key={element.id}
            className="absolute"
            style={{
              left: `${element.x}px`,
              top: `${element.y}px`,
              width: `${element.width}px`,
              height: `${element.height}px`,
              zIndex: element.z_index || 1
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              {renderSVGShape(element.content.shape, shapeStyles)}
            </svg>
          </div>
        );
      
      case 'image':
        return (
          <div
            key={element.id}
            className="absolute"
            style={{
              left: `${element.x}px`,
              top: `${element.y}px`,
              width: `${element.width}px`,
              height: `${element.height}px`,
              zIndex: element.z_index || 1
            }}
          >
            <img
              src={element.content.src}
              alt={element.content.alt || 'Image'}
              className="w-full h-full object-cover"
              style={{
                transform: `rotate(${element.styles?.rotation || 0}deg)`,
                borderRadius: element.styles?.borderRadius || 0,
                opacity: element.styles?.opacity || 1
              }}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderSVGShape = (shapeType, styles) => {
    const commonProps = {
      fill: styles.fill || '#3B82F6'
    };
    
    // Only add stroke if explicitly defined
    if (styles.stroke) {
      commonProps.stroke = styles.stroke;
      commonProps.strokeWidth = styles.strokeWidth || 2;
    }

    // For circle, we need to ensure it's rendered as a perfect circle
    switch (shapeType) {
      case 'rectangle':
        return <rect x={0} y={0} width="100%" height="100%" {...commonProps} />;
      case 'circle':
        // Use viewBox units and radius of 50 to ensure perfect circle
        return <circle cx="50" cy="50" r="45" {...commonProps} />;
      case 'triangle':
        return <polygon points="50,0 100,100 0,100" {...commonProps} />;
      default:
        return <rect x={0} y={0} width="100%" height="100%" {...commonProps} />;
    }
  };

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const currentSlide = state.slides[currentIndex];

  return (
    <div 
      className="fixed inset-0 bg-black text-white overflow-hidden"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Slide Overview */}
      {showSlideOverview && (
        <div className="absolute inset-0 bg-black bg-opacity-90 z-50 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">Slide Overview</h2>
              <button
                onClick={() => setShowSlideOverview(false)}
                className="text-white hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto">
              {state.slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`cursor-pointer border-2 transition-all ${
                    index === currentIndex ? 'border-blue-500' : 'border-gray-600 hover:border-gray-400'
                  }`}
                  onClick={() => goToSlide(index)}
                >
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <div className="absolute inset-0">
                      <div className="relative" style={{
                        width: '800px',
                        height: '450px',
                        transform: 'scale(0.2)',
                        transformOrigin: 'top left'
                      }}>
                        {slide.elements?.map(renderSlideElement)}
                      </div>
                    </div>
                  </div>
                  <div className="text-center py-2 text-sm">
                    Slide {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main slide - rendered exactly as created */}
      <div className="w-full h-full flex items-center justify-center bg-white overflow-hidden">
        {currentSlide ? (
          <div 
            className="relative"
            style={{
              width: '800px',
              height: '450px',
              transform: 'scale(1.5)',
              transformOrigin: 'center',
              position: 'absolute',
              top: '50%',
              left: '50%',
              marginLeft: '-400px',
              marginTop: '-225px',
              backgroundColor: 'white'
            }}
          >
            {currentSlide.elements
              ?.sort((a, b) => (a.z_index || 0) - (b.z_index || 0))
              .map(renderSlideElement)}
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl mb-4">No slides available</h2>
            <button
              onClick={exitPresentation}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              Exit Presentation
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-6">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {/* Left controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={exitPresentation}
                className="text-white hover:text-gray-300 p-2"
                title="Exit (Esc)"
              >
                <X className="h-6 w-6" />
              </button>
              
              <button
                onClick={() => setShowSlideOverview(true)}
                className="text-white hover:text-gray-300 p-2"
                title="Slide overview (G)"
              >
                <Grid3X3 className="h-6 w-6" />
              </button>
              
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-gray-300 p-2"
                title="Fullscreen (F)"
              >
                <Maximize className="h-6 w-6" />
              </button>
            </div>

            {/* Center controls */}
            <div className="flex items-center space-x-6">
              <button
                onClick={previousSlide}
                disabled={currentIndex === 0}
                className="text-white hover:text-gray-300 disabled:text-gray-600 p-2"
                title="Previous (←)"
              >
                <ArrowLeft className="h-8 w-8" />
              </button>
              
              <div className="text-center">
                <div className="text-sm text-gray-300">
                  {currentIndex + 1} / {state.slides.length}
                </div>
                <div className="text-lg font-semibold">
                  {state.presentation?.title}
                </div>
              </div>
              
              <button
                onClick={nextSlide}
                disabled={currentIndex === state.slides.length - 1}
                className="text-white hover:text-gray-300 disabled:text-gray-600 p-2"
                title="Next (→)"
              >
                <ArrowRight className="h-8 w-8" />
              </button>
            </div>

            {/* Right controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setAutoPlay(!autoPlay)}
                className="text-white hover:text-gray-300 p-2"
                title={autoPlay ? 'Pause autoplay' : 'Start autoplay'}
              >
                {autoPlay ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>
              
              <button
                onClick={() => setCurrentIndex(0)}
                className="text-white hover:text-gray-300 p-2"
                title="Restart (Home)"
              >
                <RotateCcw className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 max-w-4xl mx-auto">
            <div className="w-full bg-gray-700 h-1 rounded">
              <div
                className="bg-blue-500 h-1 rounded transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / state.slides.length) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation hints */}
      {!showControls && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white opacity-30">
            <ArrowLeft className="h-12 w-12" />
          </div>
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white opacity-30">
            <ArrowRight className="h-12 w-12" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentMode;