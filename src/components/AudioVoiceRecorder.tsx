/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Loader2 } from 'lucide-react';

interface AudioVoiceRecorderProps {
  onSendAudio: (audioBlob: Blob) => Promise<void>;
  onCancel: () => void;
}

export const AudioVoiceRecorder: React.FC<AudioVoiceRecorderProps> = ({
  onSendAudio,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      setErrorMessage('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    try {
      setIsUploading(true);
      await onSendAudio(audioBlob);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send audio.');
      setIsUploading(false);
    }
  };

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-3 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-lg animate-in fade-in">
      {errorMessage ? (
        <div className="flex items-center space-x-2 text-xs text-red-400 font-mono">
          <span>{errorMessage}</span>
          <button
            onClick={onCancel}
            className="underline hover:text-white cursor-pointer ml-2"
          >
            Cancel
          </button>
        </div>
      ) : isRecording ? (
        <div className="flex items-center justify-between w-full space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-mono text-red-400 font-bold">
              REC {formatSeconds(recordDuration)}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
              Speaking voice note...
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-zinc-400 hover:text-red-400 rounded transition-colors"
              title="Cancel recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-mono font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full space-x-3">
          <div className="flex items-center space-x-2">
            <Mic className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono text-zinc-200">
              Voice Note Ready ({formatSeconds(recordDuration)})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={onCancel}
              className="p-1.5 text-zinc-400 hover:text-red-400 rounded transition-colors disabled:opacity-50"
              title="Discard"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={handleSend}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Voice Note</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
