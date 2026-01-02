import React, { useState } from 'react';
import { Copy, Check, Download, Clock, FileText, List } from 'lucide-react';

const ResultsCard = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const [showSegments, setShowSegments] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([data.transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSrt = () => {
    if (!data.segments || data.segments.length === 0) {
      alert('No segments available for SRT export');
      return;
    }

    let srt = '';
    data.segments.forEach((segment, index) => {
      const startTime = formatSrtTime(segment.start);
      const endTime = formatSrtTime(segment.end);
      srt += `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n\n`;
    });

    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSrtTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${String(secs).padStart(4, '0')}`;
  };

  const rtf = data.audio_duration > 0 ? (data.processing_time / data.audio_duration).toFixed(2) : 'N/A';

  return (
    <div className="space-y-4">
      {/* Metrics Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Audio Duration</span>
          </div>
          <p className="text-xl font-semibold text-white">{data.audio_duration}s</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Processing Time</span>
          </div>
          <p className="text-xl font-semibold text-white">{data.processing_time}s</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs">Language</span>
          </div>
          <p className="text-xl font-semibold text-white">{data.language}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <List className="w-4 h-4" />
            <span className="text-xs">RTF</span>
          </div>
          <p className="text-xl font-semibold text-white">{rtf}x</p>
          <p className="text-xs text-gray-500">Real-time factor</p>
        </div>
      </div>

      {/* Transcription Card */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Transcription
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <div className="relative group">
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-40 bg-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={handleDownloadTxt}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 rounded-t-lg"
                >
                  Download TXT
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600"
                >
                  Download JSON
                </button>
                <button
                  onClick={handleDownloadSrt}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 rounded-b-lg"
                  disabled={!data.segments || data.segments.length === 0}
                >
                  Download SRT
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
            {data.transcription}
          </p>
        </div>
      </div>

      {/* Segments Card */}
      {data.segments && data.segments.length > 1 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowSegments(!showSegments)}
            className="w-full p-4 border-b border-gray-700 flex items-center justify-between hover:bg-gray-750 transition-colors"
          >
            <h3 className="font-semibold text-white flex items-center gap-2">
              <List className="w-5 h-5" />
              Segments ({data.segments_count})
            </h3>
            <span className="text-gray-400 text-sm">
              {showSegments ? 'Hide' : 'Show'}
            </span>
          </button>
          
          {showSegments && (
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {data.segments.map((segment, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-900 rounded border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-indigo-400">
                      Segment {index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(segment.start)} - {formatTime(segment.end)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{segment.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Request ID */}
      {data.request_id && (
        <div className="text-xs text-gray-500 text-center">
          Request ID: {data.request_id}
        </div>
      )}
    </div>
  );
};

export default ResultsCard;
