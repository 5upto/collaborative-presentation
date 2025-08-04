
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

const PresentationContext = createContext();

const initialState = {
  presentation: null,
  slides: [],
  currentSlideIndex: 0,
  users: [],
  selectedElements: [],
  selectedTool: 'select',
  history: [],
  historyIndex: -1,
  isPresenting: false,
  userRole: 'viewer',
  zoom: 1,
  isLoading: false,
  error: null,
  isPerformingHistoryAction: false
};

// Helper function to create a deep copy of slides for history
const deepCopySlides = (slides) => {
  return JSON.parse(JSON.stringify(slides));
};

// Helper function to add state to history
const addToHistory = (state, actionType, actionData) => {
  // Don't add to history if we're performing a history action or it's a socket update
  if (state.isPerformingHistoryAction || actionData?.fromSocket) {
    return state;
  }

  const newHistoryEntry = {
    type: actionType,
    slides: deepCopySlides(state.slides),
    currentSlideIndex: state.currentSlideIndex,
    selectedElements: [...state.selectedElements],
    timestamp: Date.now(),
    id: `${Date.now()}_${Math.random()}`
  };

  // Clear any future history when adding new action
  const newHistory = [...state.history.slice(0, state.historyIndex + 1), newHistoryEntry];
  
  // Limit history to 50 entries to prevent memory issues
  if (newHistory.length > 50) {
    newHistory.shift();
    return {
      ...state,
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }

  return {
    ...state,
    history: newHistory,
    historyIndex: newHistory.length - 1
  };
};

function presentationReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_PRESENTATION':
      return { ...state, presentation: action.payload, isLoading: false };
    
    case 'SET_SLIDES':
      // Initialize history with current state when slides are first loaded
      const initialHistoryEntry = {
        type: 'initial_state',
        slides: deepCopySlides(action.payload),
        currentSlideIndex: state.currentSlideIndex,
        selectedElements: [],
        timestamp: Date.now(),
        id: `initial_${Date.now()}`
      };
      
      return { 
        ...state, 
        slides: action.payload,
        history: [initialHistoryEntry],
        historyIndex: 0
      };
    
    case 'SET_CURRENT_SLIDE':
      const slideChangeState = { ...state, currentSlideIndex: action.payload };
      return addToHistory(slideChangeState, 'slide_changed', action);
    
    case 'SET_USERS':
      return { ...state, users: action.payload };
    
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };
    
    case 'ADD_SLIDE': {
      // Skip if this is a socket event and we already have this slide
      if (action.fromSocket && state.slides.some(slide => slide.id === action.payload.id)) {
        return state;
      }
      
      const addSlideState = { 
        ...state, 
        slides: [...state.slides, action.payload]
      };
      
      // Only add to history if this is a user action, not a socket update
      if (action.fromSocket) {
        return addSlideState;
      }
      return addToHistory(addSlideState, 'slide_added', action);
    }
    
    case 'DELETE_SLIDE': {
      // Skip if this is a socket event and the slide doesn't exist
      if (action.fromSocket && !state.slides.some(slide => slide.id === action.payload)) {
        return state;
      }
      
      const newSlides = state.slides.filter(slide => slide.id !== action.payload);
      const deleteSlideState = { 
        ...state, 
        slides: newSlides,
        currentSlideIndex: Math.min(state.currentSlideIndex, newSlides.length - 1)
      };
      
      // Only add to history if this is a user action, not a socket update
      if (action.fromSocket) {
        return deleteSlideState;
      }
      return addToHistory(deleteSlideState, 'slide_deleted', action);
    }
    
    case 'UPDATE_SLIDE_ELEMENT':
      const updatedSlides = state.slides.map(slide => 
        slide.id === action.payload.slideId
          ? {
              ...slide,
              elements: slide.elements.map(element =>
                element.id === action.payload.elementId
                  ? { 
                      ...element, 
                      ...action.payload.updates,
                      x: action.payload.updates.x !== undefined ? Number(action.payload.updates.x) : element.x,
                      y: action.payload.updates.y !== undefined ? Number(action.payload.updates.y) : element.y,
                      width: action.payload.updates.width !== undefined ? Number(action.payload.updates.width) : element.width,
                      height: action.payload.updates.height !== undefined ? Number(action.payload.updates.height) : element.height,
                      styles: action.payload.updates.styles ? 
                        { ...element.styles, ...action.payload.updates.styles } : 
                        element.styles,
                      content: action.payload.updates.content ? 
                        { ...element.content, ...action.payload.updates.content } : 
                        element.content,
                      zIndex: action.payload.updates.zIndex !== undefined ? Number(action.payload.updates.zIndex) : (element.zIndex || element.z_index)
                    }
                  : element
              )
            }
          : slide
      );
      
      // Auto-save logic (only for non-socket updates)
      if (action.payload.autoSave !== false && !action.payload.fromSocket) {
        if (window.slideUpdateTimeout) {
          clearTimeout(window.slideUpdateTimeout);
        }
        
        window.slideUpdateTimeout = setTimeout(() => {
          const slideToSave = updatedSlides.find(s => s.id === action.payload.slideId);
          if (slideToSave) {
            const elementsToSave = (slideToSave.elements || []).map(element => ({
              id: element.id,
              type: element.type,
              x: Number(element.x) || 0,
              y: Number(element.y) || 0,
              width: Number(element.width) || 100,
              height: Number(element.height) || 50,
              content: typeof element.content === 'object' ? element.content : {},
              styles: typeof element.styles === 'object' ? element.styles : {},
              zIndex: Number(element.zIndex || element.z_index) || 1
            }));

            const API_BASE_URL = window.location.hostname === 'localhost' 
              ? 'http://localhost:5000/api' 
              : `${window.location.protocol}//${window.location.hostname}:8080/api`;
            
            fetch(`${API_BASE_URL}/slides/${slideToSave.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ elements: elementsToSave })
            }).then(response => {
              if (!response.ok) {
                throw new Error('Failed to save');
              }
              console.log('Slide auto-saved successfully');
            }).catch(error => {
              console.error('Failed to save slide:', error);
            });
          }
        }, 500);
      }
      
      const updateElementState = {
        ...state,
        slides: updatedSlides
      };
      
      // Only add to history for significant changes (not during dragging or socket updates)
      if (action.payload.addToHistory !== false && !action.payload.fromSocket) {
        return addToHistory(updateElementState, 'element_updated', action);
      }
      
      return updateElementState;
    
    case 'ADD_SLIDE_ELEMENT':
      const addElementState = {
        ...state,
        slides: state.slides.map(slide =>
          slide.id === action.payload.slideId
            ? {
                ...slide,
                elements: [...slide.elements, action.payload.element]
              }
            : slide
        )
      };
      return addToHistory(addElementState, 'element_added', action);
    
    case 'DELETE_SLIDE_ELEMENT':
      const deleteElementState = {
        ...state,
        slides: state.slides.map(slide =>
          slide.id === action.payload.slideId
            ? {
                ...slide,
                elements: slide.elements.filter(element => element.id !== action.payload.elementId)
              }
            : slide
        ),
        selectedElements: state.selectedElements.filter(id => id !== action.payload.elementId)
      };
      return addToHistory(deleteElementState, 'element_deleted', action);
    
    case 'SET_SELECTED_ELEMENTS':
      return { ...state, selectedElements: action.payload };
    
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.1, Math.min(3, action.payload)) };
    
    case 'SET_PRESENTING':
      return { ...state, isPresenting: action.payload };
    
    case 'SET_SELECTED_TOOL':
      return { ...state, selectedTool: action.payload };
    
    case 'UNDO':
      if (state.historyIndex > 0) {
        const previousState = state.history[state.historyIndex - 1];
        return {
          ...state,
          slides: previousState.slides,
          currentSlideIndex: previousState.currentSlideIndex,
          selectedElements: previousState.selectedElements || [],
          historyIndex: state.historyIndex - 1,
          isPerformingHistoryAction: true
        };
      }
      return state;

    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1];
        return {
          ...state,
          slides: nextState.slides,
          currentSlideIndex: nextState.currentSlideIndex,
          selectedElements: nextState.selectedElements || [],
          historyIndex: state.historyIndex + 1,
          isPerformingHistoryAction: true
        };
      }
      return state;
    
    case 'CLEAR_HISTORY_FLAG':
      return { ...state, isPerformingHistoryAction: false };
    
    default:
      return state;
  }
}

export const PresentationProvider = ({ children, user }) => {
  const [state, dispatch] = useReducer(presentationReducer, initialState);
  const socket = useSocket();

  // Clear history action flag after state updates
  useEffect(() => {
    if (state.isPerformingHistoryAction) {
      const timeout = setTimeout(() => {
        dispatch({ type: 'CLEAR_HISTORY_FLAG' });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [state.isPerformingHistoryAction]);

  useEffect(() => {
    if (socket) {
      socket.on('users-updated', (users) => {
        dispatch({ type: 'SET_USERS', payload: users });
        const currentUser = users.find(u => u.nickname === user.nickname);
        if (currentUser) {
          dispatch({ type: 'SET_USER_ROLE', payload: currentUser.role });
        }
      });

      socket.on('element-created', (data) => {
        dispatch({ 
          type: 'ADD_SLIDE_ELEMENT', 
          payload: { slideId: data.slideId, element: data.element, fromSocket: true }
        });
      });

      socket.on('element-updated', (data) => {
        console.log('Received element update:', data);
        
        if (window.slideUpdateTimeout) {
          clearTimeout(window.slideUpdateTimeout);
        }
        
        dispatch({
          type: 'UPDATE_SLIDE_ELEMENT',
          payload: { 
            slideId: data.slideId, 
            elementId: data.elementId, 
            updates: {
              x: Number(data.element.x),
              y: Number(data.element.y),
              width: Number(data.element.width),
              height: Number(data.element.height),
              content: data.element.content,
              styles: data.element.styles,
              zIndex: Number(data.element.zIndex || data.element.z_index)
            },
            autoSave: false,
            fromSocket: true,
            addToHistory: false
          }
        });
      });

      socket.on('element-deleted', (data) => {
        dispatch({
          type: 'DELETE_SLIDE_ELEMENT',
          payload: { slideId: data.slideId, elementId: data.elementId, fromSocket: true }
        });
      });

      socket.on('slide-changed', (data) => {
        dispatch({ type: 'SET_CURRENT_SLIDE', payload: data.slideIndex, fromSocket: true });
      });

      socket.on('slide-added', (data) => {
        dispatch({ 
          type: 'ADD_SLIDE', 
          payload: data.slide,
          fromSocket: true 
        });
      });

      socket.on('slide-deleted', (data) => {
        dispatch({ 
          type: 'DELETE_SLIDE', 
          payload: data.slideId,
          fromSocket: true 
        });
      });

      return () => {
        socket.off('users-updated');
        socket.off('element-created');
        socket.off('element-updated');
        socket.off('element-deleted');
        socket.off('slide-changed');
        socket.off('slide-added');
        socket.off('slide-deleted');
      };
    }
  }, [socket, user.nickname]);

  return (
    <PresentationContext.Provider value={{ state, dispatch, socket, user }}>
      {children}
    </PresentationContext.Provider>
  );
};

export const usePresentation = () => {
  const context = useContext(PresentationContext);
  if (!context) {
    throw new Error('usePresentation must be used within a PresentationProvider');
  }
  return context;
};
