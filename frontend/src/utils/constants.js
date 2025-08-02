export const ELEMENT_TYPES = {
    TEXT: 'text',
    SHAPE: 'shape',
    IMAGE: 'image',
    DRAWING: 'drawing'
  };
  
  export const SHAPE_TYPES = {
    RECTANGLE: 'rectangle',
    CIRCLE: 'circle',
    LINE: 'line',
    ARROW: 'arrow',
    TRIANGLE: 'triangle'
  };
  
  export const USER_ROLES = {
    CREATOR: 'creator',
    EDITOR: 'editor',
    VIEWER: 'viewer'
  };
  
  export const COLORS = {
    PRIMARY: '#3B82F6',
    SECONDARY: '#6366F1',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    TEXT: '#1F2937',
    BORDER: '#E5E7EB',
    BACKGROUND: '#F9FAFB'
  };
  
  export const SLIDE_DIMENSIONS = {
    WIDTH: 1920,
    HEIGHT: 1080,
    ASPECT_RATIO: 16 / 9
  };
  
  export const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  
  export const KEYBOARD_SHORTCUTS = {
    UNDO: { key: 'z', ctrlKey: true },
    REDO: { key: 'y', ctrlKey: true },
    DELETE: { key: 'Delete' },
    COPY: { key: 'c', ctrlKey: true },
    PASTE: { key: 'v', ctrlKey: true },
    SELECT_ALL: { key: 'a', ctrlKey: true },
    PRESENT: { key: 'F5' },
    NEW_SLIDE: { key: 'n', ctrlKey: true, shiftKey: true }
  };
  
  export const ANIMATION_TYPES = {
    FADE_IN: 'fadeIn',
    SLIDE_IN_LEFT: 'slideInLeft',
    SLIDE_IN_RIGHT: 'slideInRight',
    SLIDE_IN_UP: 'slideInUp',
    SLIDE_IN_DOWN: 'slideInDown',
    ZOOM_IN: 'zoomIn',
    BOUNCE_IN: 'bounceIn'
  };
  
  export const EXPORT_FORMATS = {
    PDF: 'pdf',
    PNG: 'png',
    JPEG: 'jpeg',
    PPTX: 'pptx'
  };