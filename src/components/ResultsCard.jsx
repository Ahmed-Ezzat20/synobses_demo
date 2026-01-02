import React from 'react';
import { ClipboardCopy, Clock, AudioLines } from 'lucide-react';

const ResultsCard = ({ data }) => {
  const { transcription, processing_time, audio_duration, segments } = data;

  const copyText = () => {
    navigator.clipboard.writeText(transcription);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded p-6 space-y-4">
      <div className="flex justify-between items-start">
        <h2 className="text-lg font-semibold">Transcription</h2>
        <button
          onClick={copyText}
          className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
        >
          <ClipboardCopy className="w-4 h-4" /> Copy
        </button>
      </div>
      <textarea
        readOnly
        value={transcription}
        className="w-full h-60 bg-gray-900 border border-gray-700 rounded p-3 text-sm resize-none"
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-1 bg-gray-700 px-2 py-1 rounded-full">
          <AudioLines className="w-4 h-4" /> Duration: {audio_duration?.toFixed?.(2) || audio_duration}s
        </span>
        <span className="inline-flex items-center gap-1 bg-gray-700 px-2 py-1 rounded-full">
          <Clock className="w-4 h-4" /> Processing: {processing_time?.toFixed?.(2) || processing_time}s
        </span>
        {segments !== undefined && (
          <span className="inline-flex items-center gap-1 bg-gray-700 px-2 py-1 rounded-full">
            Segments: {segments}
          </span>
        )}
      </div>
    </div>
  );
};

export default ResultsCard;
