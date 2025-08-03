import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PresentationList from './components/PresentationList';
import PresentationEditor from './components/PresentationEditor';
import PresentMode from './components/PresentMode';
import { PresentationProvider } from './context/PresentationContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import slideForge from './assets/slideforge.png';

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
        <div className="flex flex-col w-full h-screen overflow-hidden bg-gray-50">
          <Routes>
            <Route path="/" element={<div className="flex-1 overflow-auto"><PresentationList /></div>} />
            <Route path="/presentation/:id" element={<div className="flex-1 overflow-hidden"><PresentationEditor /></div>} />
            <Route path="/present/:id/:slideIndex?" element={<div className="flex-1"><PresentMode /></div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
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
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src={slideForge} className="h-12 w-12" alt="slideForgeLogo" />
            <h1 className="text-3xl font-bold text-gray-900">Slideforge</h1>
          </div>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900"
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