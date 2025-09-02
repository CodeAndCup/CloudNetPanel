import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw, Plus, Trash2, Edit, Terminal, Eye } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

interface Server {
  id: number;
  name: string;
  type: string;
  status: string;
  players: number;
  maxPlayers: number;
  memory: string;
  node: string;
  ip: string;
  port: number;
  cpu: number;
  ram: number;
  uptime: string;
}

interface NewServer {
  name: string;
  ram: number;
  serverType: string;
  version: string;
  minimumStarted: number;
}

const Servers: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: string }>({});
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newServer, setNewServer] = useState<NewServer>({
    name: '',
    ram: 1024,
    serverType: 'Spigot',
    version: '1.20.4',
    minimumStarted: 1
  });
  const logsEndRef = useRef<HTMLDivElement>(null);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await axios.post('/api/servers', newServer);
      fetchServers();
      setShowCreateModal(false);
      setNewServer({
        name: '',
        ram: 1024,
        serverType: 'Spigot',
        version: '1.20.4',
        minimumStarted: 1
      });
    } catch (error) {
      console.error('Error creating server:', error);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchServers();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const connectWebSocket = (serverId: number) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('WebSocket connected');
      socket.send(JSON.stringify({
        type: 'subscribe_logs',
        serverId
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'server_log':
          setLogs(prev => [...prev, `[${data.timestamp}] ${data.message}`]);
          break;
        case 'command_sent':
          setLogs(prev => [...prev, `[${new Date().toISOString()}] Command executed: ${data.command}`]);
          break;
        case 'connected':
          setLogs(prev => [...prev, `[${new Date().toISOString()}] Connected to server logs`]);
          break;
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(socket);
  };

  const openServerConsole = (server: Server) => {
    setSelectedServer(server);
    setShowLogs(true);
    setLogs([]);
    connectWebSocket(server.id);
  };

  const closeServerConsole = () => {
    if (ws) {
      ws.close();
    }
    setSelectedServer(null);
    setShowLogs(false);
    setLogs([]);
    setCommand('');
  };

  const sendCommand = () => {
    if (!command.trim() || !ws || !selectedServer) return;

    ws.send(JSON.stringify({
      type: 'send_command',
      serverId: selectedServer.id,
      command: command.trim()
    }));

    setLogs(prev => [...prev, `[${new Date().toISOString()}] > ${command.trim()}`]);
    setCommand('');
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await axios.get('/api/servers');
      setServers(response.data);
    } catch (error) {
      console.error('Error fetching servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServerAction = async (serverId: number, action: string) => {
    setActionLoading(prev => ({ ...prev, [serverId]: action }));
    
    try {
      await axios.post(`/api/servers/${serverId}/${action}`);
      // Update the server status in the UI
      setServers(prev => prev.map(server => 
        server.id === serverId 
          ? { ...server, status: action === 'start' ? 'starting' : action === 'stop' ? 'stopping' : 'restarting' }
          : server
      ));
      
      // Simulate status change after a delay
      setTimeout(() => {
        setServers(prev => prev.map(server => 
          server.id === serverId 
            ? { ...server, status: action === 'stop' ? 'offline' : 'online' }
            : server
        ));
      }, 2000);
      
    } catch (error) {
      console.error(`Error ${action}ing server:`, error);
    } finally {
      setActionLoading(prev => ({ ...prev, [serverId]: '' }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      case 'starting':
      case 'stopping':
      case 'restarting':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-400';
      case 'offline':
        return 'bg-red-400';
      case 'starting':
      case 'stopping':
      case 'restarting':
        return 'bg-yellow-400';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Servers</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Server
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-600 dark:divide-gray-700">
          {servers.map((server) => (
            <li key={server.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusDot(server.status)}`} />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{server.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {server.type} • {server.node} • {server.ip}:{server.port}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {server.players}/{server.maxPlayers} players
                    </p>
                    <span className={clsx(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      getStatusColor(server.status)
                    )}>
                      {server.status}
                    </span>
                  </div>

                  <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                    <p>CPU: {server.cpu * 100}%</p>
                    <p>RAM: {server.ram} MB</p>
                    <p>{server.uptime}</p>
                  </div>

                  <div className="flex space-x-2">
                    {server.status === 'offline' ? (
                      <button
                        onClick={() => handleServerAction(server.id, 'start')}
                        disabled={!!actionLoading[server.id]}
                        className="inline-flex items-center p-2 border border-transparent rounded-full text-green-600 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {actionLoading[server.id] === 'start' ? (
                          <div className="animate-spin h-4 w-4 border-b-2 border-green-600 rounded-full" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleServerAction(server.id, 'stop')}
                        disabled={!!actionLoading[server.id]}
                        className="inline-flex items-center p-2 border border-transparent rounded-full text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {actionLoading[server.id] === 'stop' ? (
                          <div className="animate-spin h-4 w-4 border-b-2 border-red-600 rounded-full" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleServerAction(server.id, 'restart')}
                      disabled={!!actionLoading[server.id] || server.status === 'offline'}
                      className="inline-flex items-center p-2 border border-transparent rounded-full text-yellow-600 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                    >
                      {actionLoading[server.id] === 'restart' ? (
                        <div className="animate-spin h-4 w-4 border-b-2 border-yellow-600 rounded-full" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </button>

                    <button 
                      onClick={() => openServerConsole(server)}
                      className="inline-flex items-center p-2 border border-transparent rounded-full text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      title="View logs and console"
                    >
                      <Terminal className="h-4 w-4" />
                    </button>

                    <button className="inline-flex items-center p-2 border border-transparent rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                      <Edit className="h-4 w-4" />
                    </button>

                    <button className="inline-flex items-center p-2 border border-transparent rounded-full text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Server Console Modal */}
      {showLogs && selectedServer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedServer.name} - Console
              </h3>
              <button
                onClick={closeServerConsole}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Logs Display */}
            <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto mb-4">
              {logs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            {/* Command Input */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
                placeholder="Enter command..."
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={sendCommand}
                disabled={!command.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Server Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-4">
                Create Server
              </h3>
              
              <form onSubmit={handleCreateServer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Server Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newServer.name}
                    onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="MyServer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    RAM (MB)
                  </label>
                  <input
                    type="number"
                    required
                    min="512"
                    max="16384"
                    value={newServer.ram}
                    onChange={(e) => setNewServer({ ...newServer, ram: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Server Type
                  </label>
                  <select
                    value={newServer.serverType}
                    onChange={(e) => setNewServer({ ...newServer, serverType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="Spigot">Spigot</option>
                    <option value="Paper">Paper</option>
                    <option value="Purpur">Purpur</option>
                    <option value="Fabric">Fabric</option>
                    <option value="Forge">Forge</option>
                    <option value="Vanilla">Vanilla</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Version
                  </label>
                  <select
                    value={newServer.version}
                    onChange={(e) => setNewServer({ ...newServer, version: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="1.20.4">1.20.4</option>
                    <option value="1.20.2">1.20.2</option>
                    <option value="1.20.1">1.20.1</option>
                    <option value="1.19.4">1.19.4</option>
                    <option value="1.19.2">1.19.2</option>
                    <option value="1.18.2">1.18.2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Started Servers
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="10"
                    value={newServer.minimumStarted}
                    onChange={(e) => setNewServer({ ...newServer, minimumStarted: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-300 hover:bg-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Server'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Servers;