import React, { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import { Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import LanguageSelector from './components/LanguageSelector.jsx';
import ModeToggler from './components/ModeToggler.jsx';
import FileUpload from './components/FileUpload.jsx';
import ResultsCard from './components/ResultsCard.jsx';
import { useApi } from './context/ApiContext.jsx';

const App = () => {
  const { isConnected, transcribe, cancelJob, currentJobId } = useApi();
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
      setResult(null);
      setProgressInfo({ stage: 'uploading', progress: 0 });
      
      // Estimate processing time
      if (audioDuration) {
        // Large mode: ~2-5x real-time, Standard mode: ~5-10 seconds
        const estimate = largeMode 
          ? Math.ceil(audioDuration * 3) // 3x real-time average
          : 10; // 10 seconds for standard
        setEstimatedTime(estimate);
      }
      
      // Determine if we should use async (for files > 2 minutes)
      const useAsync = largeMode && audioDuration && audioDuration > 120;
      
      const data = await transcribe(
        { file, language, large: largeMode, useAsync },
        (progress) => {
          setProgressInfo(progress);
          // Update estimated time based on server response
          if (progress.message && progress.message.includes('Estimated time')) {
            const match = progress.message.match(/(\d+)\s*min/);
            if (match) {
              setEstimatedTime(parseInt(match[1]) * 60);
            }
          }
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

  const handleCancel = () => {
    cancelJob();
    setLoading(false);
    setProgressInfo({ stage: '', progress: 0 });
    setError('Transcription cancelled.');
  };

  // Get progress stage display info
  const getProgressStageInfo = () => {
    const { stage, progress, message, status, jobId } = progressInfo;
    
    switch (stage) {
      case 'uploading':
        return {
          icon: <Upload className="w-5 h-5 text-indigo-400" />,
          title: 'Uploading audio file...',
          showProgress: true,
          progressValue: progress,
          subtitle: `${progress}% uploaded`,
        };
      case 'processing':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />,
          title: status === 'pending' ? 'Job queued...' : 'Processing transcription...',
          showProgress: true,
          progressValue: progress || 0,
          subtitle: message || 'AI model is analyzing your audio...',
          isAnimated: true,
          jobId: jobId,
        };
      case 'receiving':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
          title: 'Transcription complete!',
          showProgress: true,
          progressValue: 100,
          subtitle: 'Receiving results...',
        };
      case 'complete':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
          title: 'Done!',
          showProgress: true,
          progressValue: 100,
          subtitle: 'Transcription completed successfully.',
        };
      case 'error':
        return {
          icon: <XCircle className="w-5 h-5 text-red-400" />,
          title: 'Error',
          showProgress: false,
          subtitle: 'Transcription failed.',
        };
      default:
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />,
          title: 'Processing...',
          showProgress: true,
          progressValue: 0,
          subtitle: 'Starting transcription...',
          isAnimated: true,
        };
    }
  };

  const stageInfo = getProgressStageInfo();

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
            
            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleTranscribe}
                disabled={loading}
                className="px-6 py-3 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {loading ? 'Processing...' : 'Transcribe'}
              </button>
              
              {loading && (
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 rounded bg-red-600 hover:bg-red-700 transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
            
            {/* Progress Indicator */}
            {loading && (
              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-600/60 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className={stageInfo.isAnimated ? 'opacity-80 animate-spin-slow' : ''}>
                      {stageInfo.icon}
                    </span>
                    {stageInfo.title}
                  </h3>
                  {stageInfo.showProgress && (
                    <span className="text-indigo-400 font-mono text-sm">
                      {stageInfo.progressValue}%
                    </span>
                  )}
                </div>
                
                {/* Progress Bar */}
                {stageInfo.showProgress && (
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ease-out ${
                        stageInfo.isAnimated 
                          ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_100%] animate-gradient'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }`}
                      style={{ 
                        width: `${Math.max(stageInfo.progressValue, stageInfo.isAnimated ? 100 : 0)}%`,
                      }}
                    />
                  </div>
                )}
                
                {/* Status Messages */}
                <div className="space-y-2 text-sm text-gray-400">
                  <p>{stageInfo.subtitle}</p>
                  
                  {/* Job ID for async jobs */}
                  {stageInfo.jobId && (
                    <p className="text-gray-500 font-mono text-xs">
                      Job ID: {stageInfo.jobId}
                    </p>
                  )}
                  
                  {/* Estimated time */}
                  {progressInfo.stage === 'processing' && estimatedTime && (
                    <p className="text-indigo-400">
                      ⏱️ Estimated time remaining: ~{estimatedTime < 60 ? `${estimatedTime}s` : `${Math.ceil(estimatedTime / 60)} min`}
                    </p>
                  )}
                  
                  {/* Large file mode tips */}
                  {largeMode && progressInfo.stage === 'processing' && (
                    <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded text-yellow-400 text-xs space-y-1">
                      <p>💡 <strong>Large File Mode</strong>: Using async processing for reliability.</p>
                      <p>📊 Progress updates every 3 seconds via polling.</p>
                      <p>🔄 You can safely close this tab - check back with the Job ID.</p>
                    </div>
                  )}
                  
                  {/* Cold start tip */}
                  {progressInfo.stage === 'processing' && progressInfo.progress < 10 && (
                    <p className="text-gray-500 text-xs mt-2">
                      💡 First request may take 6-7 minutes due to model loading. Subsequent requests are much faster.
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Error Display */}
            {error && (
              <div className={`p-4 rounded ${
                error.includes('Automatically switched') || error.includes('Please use Large File Mode') 
                  ? 'bg-yellow-900/30 border border-yellow-600 text-yellow-400' 
                  : error.includes('cancelled')
                    ? 'bg-gray-800/50 border border-gray-600 text-gray-400'
                    : 'bg-red-900/30 border border-red-600 text-red-400'
              }`}>
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            {/* Results */}
            {result && <ResultsCard data={result} />}
          </>
        )}
      </main>
      
      {/* Add gradient animation style */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 2s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
