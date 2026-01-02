import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const ApiContext = createContext(null);

export const ApiProvider = ({ children }) => {
  const [baseUrl, setBaseUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const instance = React.useMemo(() => axios.create({ baseURL: baseUrl }), [baseUrl]);

  const connect = useCallback(async (inputUrl) => {
    // ensure no trailing slash to avoid double //
    const url = inputUrl.trim().replace(/\/+$/, '');
    setBaseUrl(url);
    setLoading(true);
    setError('');
    try {
      const health = await axios.get(`${url}/health`);
      if (health.status === 200 && health.data.status === 'healthy') {
        setIsConnected(true);
        // fetch languages
        const langRes = await axios.get(`${url}/languages?limit=2000`);
        setLanguages(langRes.data.languages || []);
      } else {
        throw new Error('Service unhealthy');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Connection failed');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const transcribe = async ({ file, language, large }) => {
    if (!isConnected) throw new Error('Not connected');
    const endpoint = large ? '/transcribe_large' : '/transcribe';
    const form = new FormData();
    form.append('file', file);
    const { data } = await instance.post(endpoint, form, {
      params: { language },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  };

  return (
    <ApiContext.Provider
      value={{ baseUrl, isConnected, languages, loading, error, connect, transcribe }}
    >
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => useContext(ApiContext);
