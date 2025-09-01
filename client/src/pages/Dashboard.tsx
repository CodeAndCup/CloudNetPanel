import React, { useState, useEffect } from 'react';
import { Server, Network, Users, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';

interface DashboardStats {
  totalServers: number;
  onlineServers: number;
  totalNodes: number;
  onlineNodes: number;
  totalUsers: number;
  activeUsers: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalServers: 0,
    onlineServers: 0,
    totalNodes: 0,
    onlineNodes: 0,
    totalUsers: 0,
    activeUsers: 0
  });

  const [servers, setServers] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [serversRes, nodesRes, usersRes] = await Promise.all([
        axios.get('/api/servers'),
        axios.get('/api/nodes'),
        axios.get('/api/users')
      ]);

      const serverData = serversRes.data;
      const nodeData = nodesRes.data;
      const userData = usersRes.data;

      setServers(serverData);
      setNodes(nodeData);

      setStats({
        totalServers: serverData.length,
        onlineServers: serverData.filter((s: any) => s.status === 'online').length,
        totalNodes: nodeData.length,
        onlineNodes: nodeData.filter((n: any) => n.status === 'online').length,
        totalUsers: userData.length,
        activeUsers: userData.filter((u: any) => u.status === 'active').length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const statCards = [
    {
      name: 'Total Servers',
      value: stats.totalServers,
      subValue: `${stats.onlineServers} online`,
      icon: Server,
      color: 'bg-blue-500',
      trend: stats.onlineServers > 0 ? 'up' : 'down'
    },
    {
      name: 'Nodes',
      value: stats.totalNodes,
      subValue: `${stats.onlineNodes} online`,
      icon: Network,
      color: 'bg-green-500',
      trend: stats.onlineNodes > 0 ? 'up' : 'down'
    },
    {
      name: 'Users',
      value: stats.totalUsers,
      subValue: `${stats.activeUsers} active`,
      icon: Users,
      color: 'bg-purple-500',
      trend: stats.activeUsers > 0 ? 'up' : 'down'
    },
    {
      name: 'Uptime',
      value: '99.9%',
      subValue: 'Last 30 days',
      icon: Activity,
      color: 'bg-yellow-500',
      trend: 'up'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const TrendIcon = card.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <div key={card.name} className="bg-white dark:bg-gray-800 dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className={`h-6 w-6 text-white p-1 rounded ${card.color}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate">
                        {card.name}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white dark:text-white">
                          {card.value}
                        </div>
                        <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                          <TrendIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                        </div>
                      </dd>
                      <dd className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        {card.subValue}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity and Server Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Status */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white mb-4">
              Server Status
            </h3>
            <div className="space-y-3">
              {servers.slice(0, 5).map((server) => (
                <div key={server.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      server.status === 'online' ? 'bg-green-400' :
                      server.status === 'offline' ? 'bg-red-400' :
                      'bg-yellow-400'
                    }`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                      {server.name}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                    {server.players}/{server.maxPlayers} players
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Node Status */}
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white mb-4">
              Node Status
            </h3>
            <div className="space-y-3">
              {nodes.map((node) => (
                <div key={node.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      node.status === 'online' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">
                      {node.name}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                    {node.servers}/{node.maxServers} servers
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white mb-4">
            System Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-2">Average CPU Usage</div>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <span className="text-sm text-gray-900 dark:text-white dark:text-white">45%</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-2">Memory Usage</div>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                </div>
                <span className="text-sm text-gray-900 dark:text-white dark:text-white">67%</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-2">Disk Usage</div>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '34%' }}></div>
                </div>
                <span className="text-sm text-gray-900 dark:text-white dark:text-white">34%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;