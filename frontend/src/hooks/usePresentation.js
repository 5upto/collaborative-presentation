import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export const usePresentation = (presentationId) => {
  const [presentation, setPresentation] = useState(null);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPresentation = useCallback(async () => {
    try {
      setLoading(true);
      const [presentationData, slidesData] = await Promise.all([
        api.get(`/presentations/${presentationId}`),
        api.get(`/slides/presentation/${presentationId}`)
      ]);
      
      setPresentation(presentationData.data);
      setSlides(slidesData.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load presentation');
    } finally {
      setLoading(false);
    }
  }, [presentationId]);

  useEffect(() => {
    if (presentationId) {
      fetchPresentation();
    }
  }, [presentationId, fetchPresentation]);

  const createSlide = async (order) => {
    try {
      const response = await api.post('/slides', {
        presentationId,
        order
      });
      await fetchPresentation(); // Refresh data
      return response.data.id;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to create slide');
    }
  };

  const deleteSlide = async (slideId) => {
    try {
      await api.delete(`/slides/${slideId}`);
      await fetchPresentation(); // Refresh data
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to delete slide');
    }
  };

  const createElement = async (slideId, element) => {
    try {
      const response = await api.post(`/slides/${slideId}/elements`, element);
      return response.data.id;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to create element');
    }
  };

  const updateElement = async (elementId, updates) => {
    try {
      await api.put(`/slides/elements/${elementId}`, updates);
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to update element');
    }
  };

  const deleteElement = async (elementId) => {
    try {
      await api.delete(`/slides/elements/${elementId}`);
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to delete element');
    }
  };

  return {
    presentation,
    slides,
    loading,
    error,
    createSlide,
    deleteSlide,
    createElement,
    updateElement,
    deleteElement,
    refresh: fetchPresentation
  };
};