import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PresentationList from './components/PresentationList';
import PresentationEditor from './components/PresentationEditor';
import PresentMode from './components/PresentMode';
import { PresentationProvider } from './context/PresentationContext';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('presentationUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleUserLogin = (nickname) => {
    const userData = { nickname, joinedAt: Date.now() };
    setUser(userData);
    localStorage.setItem('presentationUser', JSON.stringify(userData));
  };

  if (!user) {
    return <LoginScreen onLogin={handleUserLogin} />;
  }

  return (
    <PresentationProvider user={user}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<PresentationList />} />
            <Route path="/presentation/:id" element={<PresentationEditor />} />
            <Route path="/present/:id/:slideIndex?" element={<PresentMode />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </PresentationProvider>
  );
}

const LoginScreen = ({ onLogin }) => {
  const [nickname, setNickname] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nickname.trim()) {
      onLogin(nickname.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CollabSlides</h1>
          <p className="text-gray-600">Professional Collaborative Presentations</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your nickname
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Your nickname"
              maxLength={50}
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;