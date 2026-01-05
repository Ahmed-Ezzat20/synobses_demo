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
  const [progressInfo, setProgressInfo] = useState({ stage: '', progress: 0 });
  const [estimatedTime, setEstimatedTime] = useState(null);

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
      setProgressInfo({ stage: 'uploading', progress: 0 });
      
      // Estimate processing time
      if (audioDuration) {
        // Large mode: ~2-5x real-time, Standard mode: ~5-10 seconds
        const estimate = largeMode 
          ? Math.ceil(audioDuration * 3) // 3x real-time average
          : 10; // 10 seconds for standard
        setEstimatedTime(estimate);
      }
      
      const data = await transcribe(
        { file, language, large: largeMode },
        (progress) => {
          setProgressInfo(progress);
        }
      );
      
      setResult(data);
      setProgressInfo({ stage: 'complete', progress: 100 });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Transcription failed');
      setProgressInfo({ stage: 'error', progress: 0 });
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
              className="px-6 py-3 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Processing...' : 'Transcribe'}
            </button>
            
            {/* Progress Indicator */}
            {loading && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    {progressInfo.stage === 'uploading' && '📤 Uploading audio file...'}
                    {progressInfo.stage === 'receiving' && '✅ Transcription complete, receiving results...'}
                    {!progressInfo.stage && '⏳ Processing transcription...'}
                  </h3>
                  {progressInfo.stage === 'uploading' && (
                    <span className="text-indigo-400 font-mono text-sm">
                      {progressInfo.progress}%
                    </span>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out"
                    style={{ 
                      width: progressInfo.stage === 'uploading' 
                        ? `${progressInfo.progress}%` 
                        : '100%',
                      animation: progressInfo.stage !== 'uploading' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                    }}
                  />
                </div>
                
                {/* Status Messages */}
                <div className="space-y-2 text-sm text-gray-400">
                  {progressInfo.stage === 'uploading' && (
                    <p>⏱️ Uploading your audio file to the server...</p>
                  )}
                  {progressInfo.stage === 'receiving' && (
                    <p>📥 Receiving transcription results...</p>
                  )}
                  {!progressInfo.stage && (
                    <div className="space-y-1">
                      <p>🤖 AI model is processing your audio...</p>
                      {estimatedTime && (
                        <p className="text-indigo-400">
                          ⏱️ Estimated processing time: ~{estimatedTime < 60 ? `${estimatedTime}s` : `${Math.ceil(estimatedTime / 60)} min`}
                        </p>
                      )}
                      {largeMode && (
                        <p className="text-yellow-400">⚠️ Large File Mode: This may take several minutes depending on audio length.</p>
                      )}
                      <p className="text-gray-500 text-xs mt-2">
                        💡 Tip: First request may take 6-7 minutes due to model loading. Subsequent requests are much faster (~30 seconds).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
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
