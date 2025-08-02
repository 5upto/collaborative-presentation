import React, { useState } from 'react';
import { Crown, Edit, Eye, MoreVertical, UserCheck } from 'lucide-react';
import { usePresentation } from '../context/PresentationContext';

const UsersList = () => {
  const { state, dispatch, socket, user } = usePresentation();
  const [expandedUser, setExpandedUser] = useState(null);
  
  const isCreator = state.userRole === 'creator';

  const handleRoleChange = (nickname, newRole) => {
    if (!isCreator || nickname === state.presentation?.creator_nickname) return;

    if (socket) {
      socket.emit('user-role-changed', {
        presentationId: state.presentation?.id,
        nickname,
        role: newRole
      });
    }
    
    setExpandedUser(null);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'creator':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'editor':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'creator':
        return 'text-yellow-600 bg-yellow-50';
      case 'editor':
        return 'text-blue-600 bg-blue-50';
      case 'viewer':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <UserCheck className="h-5 w-5 mr-2" />
          Collaborators ({state.users.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {state.users.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No active users
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {state.users.map((collaborator) => (
              <div
                key={collaborator.nickname}
                className="group relative p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {collaborator.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {collaborator.nickname}
                          {collaborator.nickname === user.nickname && (
                            <span className="text-xs text-gray-500 ml-1">(You)</span>
                          )}
                        </p>
                        {getRoleIcon(collaborator.role)}
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getRoleColor(collaborator.role)}`}>
                          {collaborator.role.charAt(0).toUpperCase() + collaborator.role.slice(1)}
                        </span>
                        
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-gray-500">Online</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role management dropdown */}
                  {isCreator && collaborator.role !== 'creator' && (
                    <div className="relative">
                      <button
                        onClick={() => setExpandedUser(
                          expandedUser === collaborator.nickname ? null : collaborator.nickname
                        )}
                        className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {expandedUser === collaborator.nickname && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setExpandedUser(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                            <div className="py-1">
                              <button
                                onClick={() => handleRoleChange(collaborator.nickname, 'editor')}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                                  collaborator.role === 'editor' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                              >
                                <Edit className="h-4 w-4" />
                                <span>Editor</span>
                              </button>
                              
                              <button
                                onClick={() => handleRoleChange(collaborator.nickname, 'viewer')}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                                  collaborator.role === 'viewer' ? 'bg-gray-50 text-gray-600' : 'text-gray-700'
                                }`}
                              >
                                <Eye className="h-4 w-4" />
                                <span>Viewer</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* User activity indicator */}
                <div className="mt-2 text-xs text-gray-500">
                  Joined {new Date(collaborator.joined_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Role legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600 space-y-2">
          <div className="font-medium">Roles:</div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Crown className="h-3 w-3 text-yellow-500" />
              <span>Creator - Full access</span>
            </div>
            <div className="flex items-center space-x-2">
              <Edit className="h-3 w-3 text-blue-500" />
              <span>Editor - Can edit slides</span>
            </div>
            <div className="flex items-center space-x-2">
              <Eye className="h-3 w-3 text-gray-500" />
              <span>Viewer - Read only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersList;