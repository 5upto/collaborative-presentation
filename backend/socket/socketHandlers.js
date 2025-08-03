const User = require('../models/User');
const Element = require('../models/Element');
const Presentation = require('../models/Presentation');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-presentation', async (data) => {
      const { presentationId, nickname, role } = data;
      
      try {
        await User.joinPresentation(presentationId, nickname, socket.id, role);
        socket.join(presentationId);
        
        const users = await User.getActiveUsers(presentationId);
        io.to(presentationId).emit('users-updated', users);
        
        socket.emit('joined-presentation', { presentationId, nickname, role });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join presentation' });
      }
    });

    socket.on('element-created', async (data) => {
      const { slideId, element, presentationId } = data;
      
      try {
        const elementId = await Element.create(slideId, element);
        await Presentation.updateLastActivity(presentationId);
        
        socket.to(presentationId).emit('element-created', {
          slideId,
          element: { ...element, id: elementId }
        });
      } catch (error) {
        console.error('Socket element creation error:', error);
        socket.emit('error', { message: `Failed to create element: ${error.message}` });
      }
    });

    socket.on('element-updated', async (data) => {
      const { elementId, element, presentationId, slideId } = data;
      
      try {
        console.log('Processing element update:', { elementId, element, presentationId, slideId });
        
        // Broadcast immediately to all other users first for real-time feel
        const broadcastData = {
          elementId,
          element: {
            ...element,
            x: Number(element.x),
            y: Number(element.y),
            width: Number(element.width),
            height: Number(element.height),
            zIndex: Number(element.zIndex || element.z_index || 1)
          },
          slideId: slideId
        };
        
        socket.to(presentationId).emit('element-updated', broadcastData);
        console.log(`Element ${elementId} broadcasted to presentation ${presentationId}`);
        
        // Then update database
        const existingElement = await Element.getById(elementId);
        if (!existingElement) {
          console.error('Element not found:', elementId);
          return;
        }
        
        // Create element data for database update, preserving existing data
        const elementData = {
          type: element.type || existingElement.type,
          x: element.x !== undefined ? Number(element.x) : Number(existingElement.x),
          y: element.y !== undefined ? Number(element.y) : Number(existingElement.y),
          width: element.width !== undefined ? Number(element.width) : Number(existingElement.width),
          height: element.height !== undefined ? Number(element.height) : Number(existingElement.height),
          content: element.content !== undefined ? element.content : existingElement.content,
          styles: element.styles !== undefined ? element.styles : existingElement.styles,
          zIndex: element.zIndex !== undefined ? Number(element.zIndex) : Number(existingElement.zIndex || existingElement.z_index || 1)
        };
        
        await Element.update(elementId, elementData);
        await Presentation.updateLastActivity(presentationId);
        
        console.log(`Element ${elementId} updated in database`);
      } catch (error) {
        console.error('Socket element update error:', error);
        socket.emit('error', { message: 'Failed to update element' });
      }
    });

    socket.on('element-deleted', async (data) => {
      const { elementId, presentationId } = data;
      
      try {
        await Element.delete(elementId);
        await Presentation.updateLastActivity(presentationId);
        
        socket.to(presentationId).emit('element-deleted', { 
          elementId,
          slideId: data.slideId 
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to delete element' });
      }
    });

    socket.on('user-role-changed', async (data) => {
      const { presentationId, nickname, role } = data;
      
      try {
        await User.updateRole(presentationId, nickname, role);
        const users = await User.getActiveUsers(presentationId);
        io.to(presentationId).emit('users-updated', users);
      } catch (error) {
        socket.emit('error', { message: 'Failed to update user role' });
      }
    });

    socket.on('slide-changed', (data) => {
      const { presentationId, slideIndex } = data;
      socket.to(presentationId).emit('slide-changed', { slideIndex });
    });

    socket.on('disconnect', async () => {
      try {
        const user = await User.getBySocketId(socket.id);
        if (user) {
          await User.leavePresentation(socket.id);
          const users = await User.getActiveUsers(user.presentation_id);
          socket.to(user.presentation_id).emit('users-updated', users);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
      console.log('User disconnected:', socket.id);

      socket.on('save-presentation', async (data) => {
        try {
          await Presentation.save(data.presentation);
          
          socket.to(data.presentationId).emit('presentation-saved', { slideId: data.currentSlideId });
        } catch (error) {
          socket.emit('error', { message: 'Failed to save presentation' });
        }
      });
    });
  });
};