import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, Server, Clock, Activity, TrendingUp, Globe } from 'lucide-react';
import axios from 'axios';

interface PlayerStats {
  uuid: string;
  username: string;
  totalPlaytime: number;
  serverPlaytime: { [server: string]: number };
  connectionCount: number;
  lastSeen: string;
  status: 'online' | 'offline';
}

interface ServerStats {
  name: string;
  currentPlayers: number;
  maxPlayers: number;
  totalConnections: number;
  uptime: number;
}

interface GlobalStats {
  totalPlayers: number;
  onlinePlayers: number;
  totalConnections: number;
  averagePlaytime: number;
  topServers: ServerStats[];
}

const Statistics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalPlayers: 0,
    onlinePlayers: 0,
    totalConnections: 0,
    averagePlaytime: 0,
    topServers: []
  });
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [serverStats, setServerStats] = useState<ServerStats[]>([]);
  const [selectedView, setSelectedView] = useState<'overview' | 'players' | 'servers'>('overview');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const [playersRes, serversRes, globalRes] = await Promise.all([
        axios.get('/api/statistics/players'),
        axios.get('/api/statistics/servers'),
        axios.get('/api/statistics/global')
      ]);

      setPlayerStats(playersRes.data);
      setServerStats(serversRes.data);
      setGlobalStats(globalRes.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPlaytime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatUptime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Prepare chart data
  const serverPlayersData = serverStats.map(server => ({
    name: server.name,
    current: server.currentPlayers,
    max: server.maxPlayers,
    utilization: Math.round((server.currentPlayers / server.maxPlayers) * 100)
  }));

  const playtimeData = playerStats
    .sort((a, b) => b.totalPlaytime - a.totalPlaytime)
    .slice(0, 10)
    .map(player => ({
      name: player.username,
      playtime: Math.round(player.totalPlaytime / 60) // Convert to hours
    }));

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistics Dashboard</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedView('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedView === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedView('players')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedView === 'players'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            Players
          </button>
          <button
            onClick={() => setSelectedView('servers')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedView === 'servers'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            Servers
          </button>
        </div>
      </div>

      {/* Global Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Online Players</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {globalStats.onlinePlayers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <Globe className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Players</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {globalStats.totalPlayers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
              <Activity className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Connections</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {globalStats.totalConnections.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
              <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Playtime</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formatPlaytime(globalStats.averagePlaytime)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Server Players Chart */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Server Player Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serverPlayersData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" className="text-sm" />
                <YAxis className="text-sm" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(55 65 81)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Legend />
                <Bar dataKey="current" fill="#3B82F6" name="Current Players" />
                <Bar dataKey="max" fill="#E5E7EB" name="Max Players" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Players by Playtime */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Top Players by Playtime</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={playtimeData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" className="text-sm" />
                <YAxis dataKey="name" type="category" className="text-sm" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(55 65 81)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value) => [`${value}h`, 'Playtime']}
                />
                <Bar dataKey="playtime" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedView === 'players' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Player Statistics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Playtime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Connections
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    UUID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {playerStats.map((player) => (
                  <tr key={player.uuid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <img
                            className="h-8 w-8 rounded-full"
                            src={`https://crafatar.com/avatars/${player.uuid}?size=32`}
                            alt={player.username}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {player.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        player.status === 'online' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {player.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatPlaytime(player.totalPlaytime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {player.connectionCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(player.lastSeen).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {player.uuid.slice(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedView === 'servers' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Server Statistics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Server
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Players
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Connections
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Uptime
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {serverStats.map((server) => (
                  <tr key={server.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Server className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {server.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {server.currentPlayers} / {server.maxPlayers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                          <div 
                            className={`h-2 rounded-full ${
                              (server.currentPlayers / server.maxPlayers) * 100 < 50 
                                ? 'bg-green-500' 
                                : (server.currentPlayers / server.maxPlayers) * 100 < 80 
                                ? 'bg-yellow-500' 
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${(server.currentPlayers / server.maxPlayers) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {Math.round((server.currentPlayers / server.maxPlayers) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {server.totalConnections.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatUptime(server.uptime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;