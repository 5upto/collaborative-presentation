import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generateSlidePreview = async (slideElement, width = 200, height = 112) => {
  try {
    const canvas = await html2canvas(slideElement, {
      width: width * 2,
      height: height * 2,
      scale: 1,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to generate slide preview:', error);
    return null;
  }
};

export const exportToPDF = async (slides, presentationTitle = 'Presentation') => {
  try {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Helper to render a slide DOM for export
    const renderSlideForExport = (slide) => {
      // Create a container div
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.height = '450px';
      container.style.background = '#fff';
      container.setAttribute('data-slide-id', slide.id);
      container.className = 'slide-canvas bg-white';

      // Render elements (basic, for PDF preview)
      (slide.elements || []).forEach(element => {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.left = `${element.x}px`;
        el.style.top = `${element.y}px`;
        el.style.width = `${element.width}px`;
        el.style.height = `${element.height}px`;
        el.style.zIndex = element.zIndex || 1;
        if (element.type === 'text') {
          el.style.fontSize = (element.styles?.fontSize || '16px');
          el.style.color = (element.styles?.color || '#000');
          el.style.fontWeight = element.styles?.fontWeight || 'normal';
          el.style.fontFamily = element.styles?.fontFamily || 'sans-serif';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.innerText = element.content?.text || '';
        } else if (element.type === 'shape') {
          el.style.background = element.styles?.fill || '#3b82f6';
          // Only add border if stroke is explicitly defined
          if (element.styles?.stroke) {
            el.style.border = `${element.styles?.strokeWidth || 2}px solid ${element.styles.stroke}`;
          }
          el.style.borderRadius = element.content?.shape === 'circle' ? '50%' : '0';
        } else if (element.type === 'image' && element.content?.src) {
          const img = document.createElement('img');
          img.src = element.content.src;
          img.alt = element.content.alt || '';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          el.appendChild(img);
        }
        container.appendChild(el);
      });
      document.body.appendChild(container);
      return container;
    };

    // Render, capture, and remove each slide
    for (let i = 0; i < slides.length; i++) {
      // Try to find in DOM first (if visible)
      let slideElement = document.querySelector(`[data-slide-id="${slides[i].id}"]`);
      let tempRendered = false;
      if (!slideElement) {
        slideElement = renderSlideForExport(slides[i]);
        tempRendered = true;
      }

      // Wait for images to load if present
      if (slideElement && slideElement.querySelectorAll('img').length > 0) {
        await Promise.all(Array.from(slideElement.querySelectorAll('img')).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(res => { img.onload = img.onerror = res; });
        }));
      }

      const canvas = await html2canvas(slideElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, 10, 277, 156);

      if (tempRendered) {
        document.body.removeChild(slideElement);
      }
    }

    pdf.save(`${presentationTitle || 'Presentation'}.pdf`);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw new Error('Failed to export presentation to PDF');
  }
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, wait) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
};

export const getContrastColor = (hexColor) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

export const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

export const snapToGrid = (value, gridSize = 10) => {
  return Math.round(value / gridSize) * gridSize;
};

export const calculateDistance = (point1, point2) => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const isPointInRect = (point, rect) => {
  return point.x >= rect.x && 
         point.x <= rect.x + rect.width &&
         point.y >= rect.y && 
         point.y <= rect.y + rect.height;
};

export const validateImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a valid image file.');
  }

  if (file.size > maxSize) {
    throw new Error('File size too large. Please upload an image smaller than 5MB.');
  }

  return true;
};

export const resizeImage = (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(resolve, file.type, quality);
    };

    img.src = URL.createObjectURL(file);
  });
};