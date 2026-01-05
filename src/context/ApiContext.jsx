import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import axios from 'axios';

const ApiContext = createContext(null);

// Configuration
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_FILE_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave',
  'audio/x-wav', 'audio/mp4', 'audio/webm', 'audio/ogg',
  'video/mp4', 'video/webm', 'audio/m4a', 'audio/flac'
];

// Polling configuration
const POLL_INTERVAL = 3000; // Poll every 3 seconds
const MAX_POLL_TIME = 30 * 60 * 1000; // Max 30 minutes of polling

export const ApiProvider = ({ children }) => {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentJobId, setCurrentJobId] = useState(null);
  
  // Ref to track polling state
  const pollingRef = useRef(null);

  const instance = React.useMemo(() => {
    const axiosInstance = axios.create({ 
      baseURL: baseUrl,
      timeout: 1800000, // 30 minutes timeout for large files and cold starts
    });

    // Add request interceptor for API key
    axiosInstance.interceptors.request.use(
      (config) => {
        if (apiKey) {
          config.headers['X-API-Key'] = apiKey;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for better error handling
    axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server responded with error
          const message = error.response.data?.message || 
                         error.response.data?.detail || 
                         `Server error: ${error.response.status}`;
          error.message = message;
        } else if (error.request) {
          // Request made but no response
          error.message = 'No response from server. Please check your connection.';
        } else {
          // Something else happened
          error.message = error.message || 'An unexpected error occurred';
        }
        return Promise.reject(error);
      }
    );

    return axiosInstance;
  }, [baseUrl, apiKey]);

  const validateFile = (file) => {
    if (!file) {
      throw new Error('No file selected');
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    if (file.size === 0) {
      throw new Error('File is empty');
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type) && file.type !== '') {
      // If browser doesn't detect type, check extension
      const ext = file.name.split('.').pop().toLowerCase();
      const validExtensions = ['mp3', 'wav', 'mp4', 'webm', 'ogg', 'm4a', 'flac'];
      if (!validExtensions.includes(ext)) {
        throw new Error(`Invalid file type. Allowed types: ${validExtensions.join(', ')}`);
      }
    }
  };

  const getErrorMessage = (err) => {
    if (err.response?.status === 400) {
      return err.response.data?.detail || err.response.data?.message || 'Invalid request';
    }
    if (err.response?.status === 401) {
      return 'Authentication required. Please provide a valid API key.';
    }
    if (err.response?.status === 403) {
      return 'Access denied. Invalid API key.';
    }
    if (err.response?.status === 413) {
      return 'File too large. Please use a smaller file.';
    }
    if (err.response?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (err.response?.status === 500) {
      return 'Server error. Please try again later.';
    }
    return err.message || 'An unexpected error occurred';
  };

  const connect = useCallback(async (inputUrl, inputApiKey = '') => {
    // Ensure no trailing slash to avoid double //
    const url = inputUrl.trim().replace(/\/+$/, '');
    setBaseUrl(url);
    setApiKey(inputApiKey.trim());
    setLoading(true);
    setError('');
    
    try {
      // Test connection with health endpoint
      const headers = inputApiKey ? { 'X-API-Key': inputApiKey } : {};
      const health = await axios.get(`${url}/health`, { headers, timeout: 10000 });
      
      if (health.status === 200 && health.data.status === 'healthy') {
        setIsConnected(true);
        
        // Fetch languages
        try {
          const langRes = await axios.get(`${url}/languages?limit=2000`, { headers, timeout: 10000 });
          setLanguages(langRes.data.languages || []);
        } catch (langErr) {
          console.error('Failed to fetch languages:', langErr);
          // Don't fail connection if languages can't be fetched
          setError('Connected, but failed to load languages. You may need to provide an API key.');
        }
      } else {
        throw new Error('Service unhealthy');
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(getErrorMessage(err));
      setIsConnected(false);
      setLanguages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    // Cancel any ongoing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setCurrentJobId(null);
    setIsConnected(false);
    setBaseUrl('');
    setApiKey('');
    setLanguages([]);
    setError('');
  }, []);

  // Poll for job status
  const pollJobStatus = async (jobId, onProgress) => {
    try {
      const { data } = await instance.get(`/jobs/${jobId}`, { timeout: 10000 });
      
      if (onProgress) {
        onProgress({
          stage: 'processing',
          progress: data.progress || 0,
          message: data.message,
          status: data.status,
        });
      }
      
      return data;
    } catch (err) {
      console.error('Error polling job status:', err);
      throw err;
    }
  };

  // Submit async transcription job
  const submitAsyncJob = async (file, language, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    
    // Update progress - uploading
    if (onProgress) {
      onProgress({ stage: 'uploading', progress: 0 });
    }
    
    const { data } = await instance.post('/transcribe_async', form, {
      params: { language },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minutes for upload
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
        if (onProgress) {
          onProgress({ stage: 'uploading', progress: percentCompleted });
        }
      },
    });
    
    return data;
  };

  // Wait for job completion with polling
  const waitForJobCompletion = (jobId, onProgress) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      setCurrentJobId(jobId);
      
      // Initial progress update
      if (onProgress) {
        onProgress({
          stage: 'processing',
          progress: 0,
          message: 'Job submitted, waiting for processing...',
          status: 'pending',
        });
      }
      
      const poll = async () => {
        try {
          // Check if we've exceeded max poll time
          if (Date.now() - startTime > MAX_POLL_TIME) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setCurrentJobId(null);
            reject(new Error('Job timed out. Please try again or check the job status later.'));
            return;
          }
          
          const jobData = await pollJobStatus(jobId, onProgress);
          
          if (jobData.status === 'completed') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setCurrentJobId(null);
            
            if (onProgress) {
              onProgress({ stage: 'receiving', progress: 100 });
            }
            
            resolve(jobData.result);
          } else if (jobData.status === 'failed') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setCurrentJobId(null);
            reject(new Error(jobData.message || 'Transcription failed'));
          }
          // If pending or processing, continue polling
        } catch (err) {
          // Don't stop polling on temporary errors
          console.error('Polling error:', err);
          // Only reject if it's a 404 (job not found)
          if (err.response?.status === 404) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setCurrentJobId(null);
            reject(new Error('Job not found. It may have expired.'));
          }
        }
      };
      
      // Start polling
      poll(); // Initial poll
      pollingRef.current = setInterval(poll, POLL_INTERVAL);
    });
  };

  // Cancel ongoing job/polling
  const cancelJob = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setCurrentJobId(null);
  }, []);

  // Main transcribe function - automatically chooses sync vs async
  const transcribe = async ({ file, language, large, useAsync = null }, onProgress) => {
    if (!isConnected) {
      throw new Error('Not connected to API. Please connect first.');
    }

    // Validate file
    try {
      validateFile(file);
    } catch (validationError) {
      throw validationError;
    }

    if (!language) {
      throw new Error('Please select a language');
    }

    // Determine whether to use async based on file size and mode
    // Auto-use async for large files (>5MB) or when explicitly requested
    const shouldUseAsync = useAsync !== null 
      ? useAsync 
      : (large && file.size > 5 * 1024 * 1024); // Auto-async for large mode files >5MB

    if (shouldUseAsync) {
      // Use async endpoint with polling
      console.log('Using async transcription with polling...');
      
      // Submit job
      const submitResponse = await submitAsyncJob(file, language, onProgress);
      const jobId = submitResponse.job_id;
      
      console.log(`Job submitted: ${jobId}, estimated time: ${submitResponse.estimated_time}s`);
      
      // Update progress
      if (onProgress) {
        onProgress({
          stage: 'processing',
          progress: 5,
          message: `Job submitted. Estimated time: ${Math.ceil(submitResponse.estimated_time / 60)} minutes`,
          jobId: jobId,
        });
      }
      
      // Wait for completion
      const result = await waitForJobCompletion(jobId, onProgress);
      return result;
    } else {
      // Use synchronous endpoint
      console.log('Using synchronous transcription...');
      
      const endpoint = large ? '/transcribe_large' : '/transcribe';
      const form = new FormData();
      form.append('file', file);
      
      const { data } = await instance.post(endpoint, form, {
        params: { language },
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
          if (onProgress) {
            onProgress({ stage: 'uploading', progress: percentCompleted });
          }
        },
        onDownloadProgress: (progressEvent) => {
          // Response is being received - transcription is complete
          if (onProgress) {
            onProgress({ stage: 'receiving', progress: 100 });
          }
        },
      });
      
      return data;
    }
  };

  // Get job status (for manual checking)
  const getJobStatus = async (jobId) => {
    if (!isConnected) {
      throw new Error('Not connected to API. Please connect first.');
    }
    
    const { data } = await instance.get(`/jobs/${jobId}`, { timeout: 10000 });
    return data;
  };

  const value = {
    baseUrl,
    apiKey,
    isConnected,
    languages,
    loading,
    error,
    currentJobId,
    connect,
    disconnect,
    transcribe,
    validateFile,
    cancelJob,
    getJobStatus,
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within ApiProvider');
  }
  return context;
};
