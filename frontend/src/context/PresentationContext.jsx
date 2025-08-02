import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

const PresentationContext = createContext();

const initialState = {
  presentation: null,
  slides: [],
  currentSlideIndex: 0,
  users: [],
  selectedElements: [],
  history: [],
  historyIndex: -1,
  isPresenting: false,
  userRole: 'viewer',
  zoom: 1,
  isLoading: false,
  error: null
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
      return { ...state, slides: action.payload };
    
    case 'SET_CURRENT_SLIDE':
      return { ...state, currentSlideIndex: action.payload };
    
    case 'SET_USERS':
      return { ...state, users: action.payload };
    
    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload };
    
    case 'ADD_SLIDE':
      return { 
        ...state, 
        slides: [...state.slides, action.payload],
        history: [...state.history.slice(0, state.historyIndex + 1), {
          type: 'slide_added',
          data: action.payload,
          timestamp: Date.now()
        }],
        historyIndex: state.historyIndex + 1
      };
    
    case 'DELETE_SLIDE':
      const newSlides = state.slides.filter(slide => slide.id !== action.payload);
      return { 
        ...state, 
        slides: newSlides,
        currentSlideIndex: Math.min(state.currentSlideIndex, newSlides.length - 1),
        history: [...state.history.slice(0, state.historyIndex + 1), {
          type: 'slide_deleted',
          data: action.payload,
          timestamp: Date.now()
        }],
        historyIndex: state.historyIndex + 1
      };
    
    case 'UPDATE_SLIDE_ELEMENT':
      return {
        ...state,
        slides: state.slides.map(slide => 
          slide.id === action.payload.slideId
            ? {
                ...slide,
                elements: slide.elements.map(element =>
                  element.id === action.payload.elementId
                    ? { ...element, ...action.payload.updates }
                    : element
                )
              }
            : slide
        )
      };
    
    case 'ADD_SLIDE_ELEMENT':
      return {
        ...state,
        slides: state.slides.map(slide =>
          slide.id === action.payload.slideId
            ? {
                ...slide,
                elements: [...slide.elements, action.payload.element]
              }
            : slide
        ),
        history: [...state.history.slice(0, state.historyIndex + 1), {
          type: 'element_added',
          data: action.payload,
          timestamp: Date.now()
        }],
        historyIndex: state.historyIndex + 1
      };
    
    case 'DELETE_SLIDE_ELEMENT':
      return {
        ...state,
        slides: state.slides.map(slide =>
          slide.id === action.payload.slideId
            ? {
                ...slide,
                elements: slide.elements.filter(element => element.id !== action.payload.elementId)
              }
            : slide
        ),
        selectedElements: state.selectedElements.filter(id => id !== action.payload.elementId),
        history: [...state.history.slice(0, state.historyIndex + 1), {
          type: 'element_deleted',
          data: action.payload,
          timestamp: Date.now()
        }],
        historyIndex: state.historyIndex + 1
      };
    
    case 'SET_SELECTED_ELEMENTS':
      return { ...state, selectedElements: action.payload };
    
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.1, Math.min(3, action.payload)) };
    
    case 'SET_PRESENTING':
      return { ...state, isPresenting: action.payload };
    
    case 'UNDO':
      if (state.historyIndex > 0) {
        return { ...state, historyIndex: state.historyIndex - 1 };
      }
      return state;
    
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        return { ...state, historyIndex: state.historyIndex + 1 };
      }
      return state;
    
    default:
      return state;
  }
}

export const PresentationProvider = ({ children, user }) => {
  const [state, dispatch] = useReducer(presentationReducer, initialState);
  const socket = useSocket();

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
          payload: { slideId: data.slideId, element: data.element }
        });
      });

      socket.on('element-updated', (data) => {
        dispatch({
          type: 'UPDATE_SLIDE_ELEMENT',
          payload: { 
            slideId: data.slideId, 
            elementId: data.elementId, 
            updates: data.element 
          }
        });
      });

      socket.on('element-deleted', (data) => {
        dispatch({
          type: 'DELETE_SLIDE_ELEMENT',
          payload: { slideId: data.slideId, elementId: data.elementId }
        });
      });

      socket.on('slide-changed', (data) => {
        dispatch({ type: 'SET_CURRENT_SLIDE', payload: data.slideIndex });
      });

      return () => {
        socket.off('users-updated');
        socket.off('element-created');
        socket.off('element-updated');
        socket.off('element-deleted');
        socket.off('slide-changed');
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