import React, { useState } from 'react';
import { Link, Check, X } from 'lucide-react';
import { useApi } from '../context/ApiContext';

const Sidebar = () => {
  const { baseUrl, isConnected, loading, error, connect } = useApi();
  const [urlInput, setUrlInput] = useState(baseUrl);

  const handleConnect = () => {
    if (urlInput) connect(urlInput.trim());
  };

  return (
    <aside className="w-full sm:w-72 bg-gray-800 p-6 flex-shrink-0 border-r border-gray-700">
      <h1 className="text-2xl font-semibold flex items-center gap-2 mb-6">
        <Link className="w-6 h-6" /> OmniASR
      </h1>

      <label className="block text-sm mb-2" htmlFor="apiUrl">
        API Base URL
      </label>
      <input
        id="apiUrl"
        type="text"
        value={urlInput}
        onChange={(e) => setUrlInput(e.target.value)}
        placeholder="https://example.modal.run"
        className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 focus:outline-none focus:ring focus:border-indigo-500"
      />
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      <button
        onClick={handleConnect}
        disabled={loading}
        className="mt-4 w-full flex justify-center items-center gap-2 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
      >
        {isConnected ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
        {isConnected ? 'Connected' : loading ? 'Connecting...' : 'Connect'}
      </button>

      {isConnected && (
        <p className="mt-4 flex items-center text-green-400 text-sm gap-1">
          <Check className="w-4 h-4" /> Connected
        </p>
      )}
    </aside>
  );
};

export default Sidebar;
