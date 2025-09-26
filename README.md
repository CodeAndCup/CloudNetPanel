# CloudNet Panel

A modern web-based management panel for CloudNet servers, designed with a user-friendly interface similar to Pelican/Pterodactyl panels.

## Features

- 🚀 **Modern Web Interface**: Clean, responsive design built with React and Tailwind CSS
- 🔐 **Authentication System**: Secure login with JWT tokens
- 📊 **Dashboard**: Real-time overview of servers, nodes, and system metrics
- 🖥️ **Server Management**: Start, stop, restart servers with real-time status updates
- 🌐 **Node Management**: Monitor node resources (CPU, RAM, *[soon: disk usage]*)
- 👥 **User Management**: Manage users with different permission levels
- 👥 **Group Management**: Create and manage user groups with granular permissions
- 📁 **Template Management**: File browser for server templates with permission-based access
- 📦 **Backup System**: Manual and scheduled backups of templates with compression
- ⚙️ **Task Automation**: Cron-based task scheduler for automated operations
- 💻 **Real-time Console**: Live server logs and command execution via WebSocket
- 🔒 **Granular Permissions**: File/folder and task-level access control by user/group
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- 🌙 **Dark Theme**: Beautiful dark mode with automatic system preference detection
- 🔌 **CloudNet REST API Integration**: Connect to real CloudNet instances or use mock data for testing

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

3. **Make your configuration**
- Make steps inside [QuickConfiguration](https://github.com/CodeAndCup/CloudNetPanel?tab=readme-ov-file#quick-configuration)

4. **Start servers**
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

The application will serve the built frontend and API from port 5000.

## CloudNet REST API Integration

The panel supports integration with CloudNet REST API for real-time server management. See [CLOUDNET_API.md](CLOUDNET_API.md) for detailed configuration instructions.

### Quick Configuration

1. Go to your CloudNet Console and install CloudNet-Rest module.
2. Copy `server/.env.example` to `server/.env`
3. Set `CLOUDNET_API_ENABLED=true` to enable API integration
4. Configure `CLOUDNET_API_URL` to point to your CloudNet instance
5. Enter you Rest API identifient in `CLOUDNET_API_USERNAME` & `CLOUDNET_API_PASSWORD`. 
(You can create them by using the command inside cloudnet console `rest user create [username] [password]` and add it admin scope `rest user [username] add scope global:admin`)
6. Start the application

## Technology Stack

### Backend
- **Node.js** with Express.js
- **JWT** for authentication
- **SQLite** for data storage
- **WebSocket** support for real-time updates and server console
- **Node-cron** for task scheduling
- **Archiver** for backup compression
- **Multer** for file uploads

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

### Groups
- `GET /api/groups` - List all groups
- `GET /api/groups/:id` - Get group details with users
- `POST /api/groups` - Create new group (admin only)
- `PUT /api/groups/:id` - Update group (admin only)
- `DELETE /api/groups/:id` - Delete group (admin only)
- `POST /api/groups/:id/users` - Add user to group (admin only)
- `DELETE /api/groups/:id/users/:userId` - Remove user from group (admin only)

### Templates
- `GET /api/templates/files` - List files and directories
- `GET /api/templates/files/content` - Get file content
- `PUT /api/templates/files/content` - Create or update file
- `POST /api/templates/files/directory` - Create directory
- `DELETE /api/templates/files` - Delete file or directory

### Backups
- `GET /api/backups` - List all backups
- `GET /api/backups/:id` - Get backup details
- `POST /api/backups/manual` - Create manual backup
- `POST /api/backups/schedule` - Schedule automatic backup
- `GET /api/backups/:id/download` - Download backup file
- `DELETE /api/backups/:id` - Delete backup

### Tasks
- `GET /api/tasks` - List accessible tasks
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `POST /api/tasks/:id/execute` - Execute task manually
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/permissions` - Grant task permission (admin only)

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

## Special thanks

Developement:
- [PopoGH](https://github.com/PoPoGH)

Traduction:
- [XDaten](https://discord.com/users/905172645576847421)


---

Built with ❤️ for the CloudNet community
