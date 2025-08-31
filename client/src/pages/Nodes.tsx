import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

interface Node {
  id: number;
  name: string;
  status: string;
  ip: string;
  cpu: number;
  ram: number;
  disk: number;
  servers: number;
  maxServers: number;
  uptime: string;
  location: string;
}

const Nodes: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      const response = await axios.get('/api/nodes');
      setNodes(response.data);
    } catch (error) {
      console.error('Error fetching nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
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
      default:
        return 'bg-gray-400';
    }
  };

  const getUsageColor = (usage: number) => {
    if (usage < 50) return 'bg-green-500';
    if (usage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
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
        <h1 className="text-2xl font-bold text-gray-900">Nodes</h1>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <Plus className="h-4 w-4 mr-2" />
          Add Node
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nodes.map((node) => (
          <div key={node.id} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${getStatusDot(node.status)}`} />
                  <h3 className="text-lg font-medium text-gray-900">{node.name}</h3>
                </div>
                <span className={clsx(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getStatusColor(node.status)
                )}>
                  {node.status}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>IP Address</span>
                    <span>{node.ip}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Location</span>
                    <span>{node.location}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Servers</span>
                    <span>{node.servers}/{node.maxServers}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(node.servers / node.maxServers) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>CPU Usage</span>
                    <span>{node.cpu}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getUsageColor(node.cpu)}`}
                      style={{ width: `${node.cpu}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Memory Usage</span>
                    <span>{node.ram}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getUsageColor(node.ram)}`}
                      style={{ width: `${node.ram}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Disk Usage</span>
                    <span>{node.disk}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getUsageColor(node.disk)}`}
                      style={{ width: `${node.disk}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Uptime</span>
                    <span>{node.uptime}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                <button className="inline-flex items-center p-2 border border-transparent rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="inline-flex items-center p-2 border border-transparent rounded-full text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Nodes;