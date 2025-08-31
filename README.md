# CloudNet Panel

A modern web-based management panel for CloudNet servers, designed with a user-friendly interface similar to Pelican/Pterodactyl panels.

## Features

- 🚀 **Modern Web Interface**: Clean, responsive design built with React and Tailwind CSS
- 🔐 **Authentication System**: Secure login with JWT tokens
- 📊 **Dashboard**: Real-time overview of servers, nodes, and system metrics
- 🖥️ **Server Management**: Start, stop, restart servers with real-time status updates
- 🌐 **Node Management**: Monitor node resources (CPU, RAM, disk usage)
- 👥 **User Management**: Manage users with different permission levels
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/SAOFR-DEV/CloudNetPanel.git
cd CloudNetPanel
```

2. **Install dependencies**
```bash
npm run install-deps
```

3. **Start the development servers**
```bash
npm run dev
```

This will start:
- Backend API server on `http://localhost:5000`
- Frontend development server on `http://localhost:3000`

### Default Login
- **Username**: `admin`
- **Password**: `password`

⚠️ **Please change the default credentials after first login!**

## Production Deployment

### Build the frontend
```bash
npm run build
```

### Start the production server
```bash
npm start
```

The application will serve the built frontend and API from port 5000.

## Technology Stack

### Backend
- **Node.js** with Express.js
- **JWT** for authentication
- **SQLite** for data storage
- **WebSocket** support for real-time updates

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Axios** for API communication
- **Lucide React** for icons

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - User logout

### Servers
- `GET /api/servers` - List all servers
- `GET /api/servers/:id` - Get server details
- `POST /api/servers` - Create new server
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Delete server
- `POST /api/servers/:id/start` - Start server
- `POST /api/servers/:id/stop` - Stop server
- `POST /api/servers/:id/restart` - Restart server

### Nodes
- `GET /api/nodes` - List all nodes
- `GET /api/nodes/:id` - Get node details
- `POST /api/nodes` - Create new node
- `PUT /api/nodes/:id` - Update node
- `DELETE /api/nodes/:id` - Delete node

### Users
- `GET /api/users` - List all users (admin only)
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create new user (admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

## Environment Variables

Create a `.env` file in the server directory:

```env
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue on GitHub.

---

Built with ❤️ for the CloudNet community
