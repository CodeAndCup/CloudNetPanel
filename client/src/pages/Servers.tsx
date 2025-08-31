import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, Plus, Trash2, Edit } from 'lucide-react';
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

const Servers: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: string }>({});

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
        <h1 className="text-2xl font-bold text-gray-900">Servers</h1>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <Plus className="h-4 w-4 mr-2" />
          Create Server
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {servers.map((server) => (
            <li key={server.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusDot(server.status)}`} />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{server.name}</h3>
                    <p className="text-sm text-gray-500">
                      {server.type} • {server.node} • {server.ip}:{server.port}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {server.players}/{server.maxPlayers} players
                    </p>
                    <span className={clsx(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      getStatusColor(server.status)
                    )}>
                      {server.status}
                    </span>
                  </div>

                  <div className="text-right text-sm text-gray-500">
                    <p>CPU: {server.cpu}%</p>
                    <p>RAM: {server.ram}%</p>
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
    </div>
  );
};

export default Servers;