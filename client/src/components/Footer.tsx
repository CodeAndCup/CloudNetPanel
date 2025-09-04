import React from 'react';
import { Github, MessageCircle } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            © 2024 CloudNet Panel. Built with ❤️ by SAOFR-DEV
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/SAOFR-DEV/CloudNetPanel"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Github className="h-4 w-4 mr-1" />
              GitHub
            </a>
            <a
              href="https://discord.gg/your-discord-invite"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;