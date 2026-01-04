import React, { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import LanguageSelector from './components/LanguageSelector.jsx';
import ModeToggler from './components/ModeToggler.jsx';
import FileUpload from './components/FileUpload.jsx';
import ResultsCard from './components/ResultsCard.jsx';
import { useApi } from './context/ApiContext.jsx';

const App = () => {
  const { isConnected, transcribe } = useApi();
  const [language, setLanguage] = useState('');
  const [largeMode, setLargeMode] = useState(false);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioDuration, setAudioDuration] = useState(null);

  // Detect audio duration when file changes
  React.useEffect(() => {
    if (!file) {
      setAudioDuration(null);
      return;
    }

    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      setAudioDuration(duration);
      
      // Auto-switch to Large File Mode if duration > 40s
      if (duration > 40 && !largeMode) {
        setLargeMode(true);
        setError(`Audio duration is ${duration.toFixed(1)}s. Automatically switched to Large File Mode (required for audio >40s).`);
      }
      
      URL.revokeObjectURL(objectUrl);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
    });
    
    audio.src = objectUrl;
  }, [file, largeMode]);

  const handleTranscribe = async () => {
    setError('');
    if (!file || !language) {
      setError('Please select language and file.');
      return;
    }
    
    // Validate mode selection based on audio duration
    if (audioDuration && audioDuration > 40 && !largeMode) {
      setError(`Audio duration is ${audioDuration.toFixed(1)}s. Please use Large File Mode for audio longer than 40 seconds.`);
      return;
    }
    try {
      setLoading(true);
      const data = await transcribe({ file, language, large: largeMode });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Transcription failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col sm:flex-row font-sans">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6">
        {!isConnected ? (
          <p className="text-gray-400">Connect to your OmniASR API to begin.</p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <LanguageSelector value={language} onChange={setLanguage} />
              <ModeToggler large={largeMode} onChange={setLargeMode} />
            </div>
            <FileUpload file={file} onFile={setFile} />
            <button
              onClick={handleTranscribe}
              disabled={loading}
              className="px-6 py-3 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Transcribe'}
            </button>
            {error && (
              <div className={`p-4 rounded ${
                error.includes('Automatically switched') || error.includes('Please use Large File Mode') 
                  ? 'bg-yellow-900/30 border border-yellow-600 text-yellow-400' 
                  : 'bg-red-900/30 border border-red-600 text-red-400'
              }`}>
                <p className="text-sm">{error}</p>
              </div>
            )}
            {result && <ResultsCard data={result} />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
