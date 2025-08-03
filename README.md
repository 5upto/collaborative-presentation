# Slideforge (Collaborative Presentation Software)

A real-time collaborative presentation tool that allows multiple users to create and edit presentations simultaneously. Built with React, Node.js, and Socket.IO for real-time collaboration.

## Features

- 🎨 Create and edit presentations with multiple slides
- 👥 Real-time collaboration with multiple users
- 🖌️ Rich text editing and formatting
- 🖼️ Add images and shapes to slides
- 🎭 Presentation mode for showcasing
- 💾 Auto-save functionality
- 🔄 Real-time cursor and selection tracking

## Tech Stack

### Frontend
- React 19
- Vite
- Material-UI (MUI) & lucid-react for UI components
- Socket.IO Client for real-time updates
- React-Router for navigation
- TailwindCSS for styling

### Backend
- Node.js with Express
- Socket.IO for real-time communication
- MySQL database
- Multer for file uploads
- Sharp for image processing

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/5upto/collaborative-presentation.git
   cd collaborative-presentation
   ```

2. Set up the backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Update .env with your database credentials
   ```

3. Set up the frontend:
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   # Update .env with your backend URL
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
collaborative-presentation/
├── backend/                    
│   ├── config/                 
│   ├── routes/                
│   ├── socket/                
│   ├── models/               
│   └── server.js               
├── frontend/                  
│   ├── public/               
│   ├── src/
│   │   ├── assets/          
│   │   ├── components/        
│   │   ├── context/          
│   │   ├── hooks/             
│   │   ├── utils/            
│   │   ├── App.jsx           
│   │   └── main.jsx                   
│   └── vite.config.js        
└── README.md                  
```

## Environment Variables

### Backend (.env)
Create a `.env` file in the `backend` directory with the following variables:

```env
PORT=8080
NODE_ENV=development
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=slideforge
DB_CHARSET=utf8mb4
```

### Frontend (.env)
Create a `.env` file in the `frontend` directory with the following variables:

```env
VITE_API_URL=http://localhost:8080
MODE=development
VITE_SOCKET_URL=ws://localhost:8080
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [React](https://reactjs.org/)
- [Socket.IO](https://socket.io/)
- [Material-UI](https://mui.com/)
- [Vite](https://vitejs.dev/)
