import React, { useState } from 'react';
import { Mic, Link, Unlink, Key, Check } from 'lucide-react';
import { useApi } from '../context/ApiContext.jsx';

const Sidebar = () => {
  const { isConnected, loading, error, connect, disconnect, baseUrl: currentUrl } = useApi();
  const [url, setUrl] = useState(currentUrl || '');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      return;
    }
    await connect(url, apiKey);
  };

  const handleDisconnect = () => {
    disconnect();
    setUrl('');
    setApiKey('');
  };

  return (
    <aside className="w-full sm:w-80 bg-gray-900 p-6 space-y-6 border-b sm:border-r border-gray-800">
      <div className="flex items-center gap-3">
        <Mic className="w-8 h-8 text-indigo-500" />
        <div>
          <h1 className="text-xl font-bold text-white">OmniASR</h1>
          <p className="text-xs text-gray-400">Multilingual Speech Recognition</p>
        </div>
      </div>

      {!isConnected ? (
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Backend URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-backend.modal.run"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter your OmniASR backend URL (no trailing slash)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              API Key (Optional)
            </label>
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key if required"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Leave empty if authentication is disabled
              </p>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
          >
            <Link className="w-4 h-4" />
            {loading ? 'Connecting...' : 'Connect'}
          </button>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-900/20 border border-green-800 rounded">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Connected</span>
            </div>
            <p className="text-xs text-gray-400 break-all">{currentUrl}</p>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
          >
            <Unlink className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}

      <div className="pt-6 border-t border-gray-800">
        <h3 className="text-sm font-medium text-gray-300 mb-2">About</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          OmniASR provides multilingual automatic speech recognition powered by advanced AI models.
          Supports 100+ languages with intelligent audio processing.
        </p>
      </div>

      <div className="pt-4 border-t border-gray-800">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Features</h3>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Standard mode (&lt;40s)</li>
          <li>• Large file mode (any length)</li>
          <li>• Detailed timestamps</li>
          <li>• High accuracy transcription</li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
