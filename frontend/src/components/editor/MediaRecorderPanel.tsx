'use client';

/**
 * MediaRecorderPanel
 * Three-tab panel rendered inside the markdown editor:
 *   1. 🎙 Voice note  – record audio → upload → insert <audio> tag
 *   2. 🎥 Record video – camera preview → record → upload → insert <video> tag
 *   3. 📤 Upload video – file picker / drop-zone → upload → insert <video> tag
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Upload,
  Square,
  Play,
  Pause,
  Loader2,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import { uploadMedia } from '@/lib/api';

/* ─── Types ────────────────────────────────────────────────────────────────── */

type Tab = 'voice' | 'video' | 'upload';
type RecordState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'uploading' | 'done';

interface MediaRecorderPanelProps {
  token: string;
  onInsert: (markdown: string) => void;
  onClose: () => void;
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function buildMarkdown(url: string, mime: string, label: string): string {
  const isAudio = mime.startsWith('audio/');
  if (isAudio) {
    return `\n<audio controls src="${url}" style="width:100%;margin:1rem 0"></audio>\n`;
  }
  return `\n<video controls src="${url}" style="width:100%;max-width:700px;margin:1rem 0" title="${label}"></video>\n`;
}

/* ─── Waveform animation ───────────────────────────────────────────────────── */

function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full transition-all"
          style={{
            background: active ? '#6366f1' : '#d1d5db',
            height: active ? `${20 + Math.sin(i * 1.3) * 14}px` : '6px',
            animation: active ? `wave 0.8s ease-in-out ${i * 0.07}s infinite alternate` : 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  );
}

/* ─── Tab button ────────────────────────────────────────────────────────────── */

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ─── Shared action button ──────────────────────────────────────────────────── */

function ActionBtn({
  onClick,
  disabled,
  variant = 'primary',
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'ghost';
  children: React.ReactNode;
}) {
  const base = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40';
  const styles: Record<string, string> = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    danger:  'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    ghost:   'border border-gray-300 text-gray-600 hover:bg-gray-50',
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  );
}

/* ─── Voice-note tab ────────────────────────────────────────────────────────── */

function VoiceTab({ token, onInsert }: { token: string; onInsert: (md: string) => void }) {
  const [state, setState] = useState<RecordState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError]   = useState('');
  const [blobUrl, setBlobUrl] = useState('');
  const [playing, setPlaying] = useState(false);

  const recorderRef   = useRef<MediaRecorder | null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const blobRef       = useRef<Blob | null>(null);

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function start() {
    setError('');
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';

      const mr = new MediaRecorder(stream, { mimeType });
      recorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        setBlobUrl(URL.createObjectURL(blob));
        setState('stopped');
        clearTimer();
      };

      mr.start(250);
      setState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      setError('Microphone access denied. Please allow mic access in your browser settings.');
      setState('idle');
    }
  }

  function stop() {
    recorderRef.current?.stop();
    clearTimer();
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  function reset() {
    blobRef.current = null;
    setBlobUrl('');
    setElapsed(0);
    setPlaying(false);
    setState('idle');
    setError('');
  }

  async function insert() {
    if (!blobRef.current) return;
    setState('uploading');
    setError('');
    try {
      const ext = blobRef.current.type.includes('ogg') ? 'ogg' : 'webm';
      const file = new File([blobRef.current], `voice-note-${Date.now()}.${ext}`, {
        type: blobRef.current.type,
      });
      const [uploaded] = await uploadMedia(file, token);
      onInsert(buildMarkdown(uploaded.url, uploaded.mime ?? file.type, file.name));
      setState('done');
      setTimeout(reset, 1500);
    } catch (err) {
      setError((err as Error).message || 'Upload failed. Please try again.');
      setState('stopped');
    }
  }

  useEffect(() => () => { clearTimer(); recorderRef.current?.stop(); }, []);

  return (
    <div className="space-y-4">
      {/* Waveform + timer */}
      <div className="flex flex-col items-center gap-3 py-4">
        <Waveform active={state === 'recording'} />
        <span className="font-mono text-2xl font-bold text-gray-700 tabular-nums">
          {formatTime(elapsed)}
        </span>
        <span className="text-xs text-gray-400">
          {state === 'recording' ? 'Recording…' : state === 'requesting' ? 'Requesting mic…' : 'Ready'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {state === 'idle' && (
          <ActionBtn onClick={start} variant="danger">
            <Mic className="h-4 w-4" /> Start recording
          </ActionBtn>
        )}
        {state === 'requesting' && (
          <ActionBtn onClick={() => {}} disabled variant="ghost">
            <Loader2 className="h-4 w-4 animate-spin" /> Waiting for mic…
          </ActionBtn>
        )}
        {state === 'recording' && (
          <ActionBtn onClick={stop} variant="danger">
            <Square className="h-4 w-4" /> Stop
          </ActionBtn>
        )}
        {state === 'stopped' && (
          <>
            <audio
              ref={audioRef}
              src={blobUrl}
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
            <ActionBtn onClick={togglePlay} variant="ghost">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? 'Pause' : 'Play back'}
            </ActionBtn>
            <ActionBtn onClick={insert}>
              <CheckCircle2 className="h-4 w-4" /> Insert voice note
            </ActionBtn>
            <ActionBtn onClick={reset} variant="ghost">
              <X className="h-4 w-4" /> Discard
            </ActionBtn>
          </>
        )}
        {state === 'uploading' && (
          <ActionBtn onClick={() => {}} disabled variant="ghost">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
          </ActionBtn>
        )}
        {state === 'done' && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" /> Voice note inserted!
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

/* ─── Video-record tab ──────────────────────────────────────────────────────── */

function VideoRecordTab({ token, onInsert }: { token: string; onInsert: (md: string) => void }) {
  const [state, setState] = useState<RecordState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError]   = useState('');
  const [blobUrl, setBlobUrl] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const streamRef   = useRef<MediaStream | null>(null);
  const liveVideoRef    = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef     = useRef<Blob | null>(null);

  function clearTimer() { if (timerRef.current) clearInterval(timerRef.current); }

  async function startCamera() {
    setError('');
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }
      setState('idle'); // camera ready, waiting for user to press record
    } catch {
      setError('Camera/mic access denied. Please allow access in your browser settings.');
      setState('idle');
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';

    const mr = new MediaRecorder(stream, { mimeType });
    recorderRef.current = mr;
    chunksRef.current = [];

    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      blobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setState('stopped');
      clearTimer();
    };

    mr.start(250);
    setState('recording');
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    // Stop the live preview stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    clearTimer();
  }

  function reset() {
    blobRef.current = null;
    setBlobUrl('');
    setElapsed(0);
    setState('idle');
    setError('');
  }

  async function insert() {
    if (!blobRef.current) return;
    setState('uploading');
    setError('');
    try {
      const ext = blobRef.current.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blobRef.current], `video-${Date.now()}.${ext}`, {
        type: blobRef.current.type,
      });
      const [uploaded] = await uploadMedia(file, token);
      onInsert(buildMarkdown(uploaded.url, uploaded.mime ?? file.type, file.name));
      setState('done');
      setTimeout(reset, 1500);
    } catch (err) {
      setError((err as Error).message || 'Upload failed. Please try again.');
      setState('stopped');
    }
  }

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      clearTimer();
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach stream to live preview element when available
  useEffect(() => {
    if (liveVideoRef.current && streamRef.current) {
      liveVideoRef.current.srcObject = streamRef.current;
    }
  });

  const showLive    = state === 'idle' || state === 'recording';
  const showPreview = state === 'stopped' || state === 'uploading' || state === 'done';

  return (
    <div className="space-y-4">
      {/* Video area */}
      <div className="relative overflow-hidden rounded-xl bg-gray-900" style={{ aspectRatio: '16/9' }}>
        {/* Live camera feed */}
        <video
          ref={liveVideoRef}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-cover transition-opacity ${showLive ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}`}
        />
        {/* Recorded preview */}
        {showPreview && (
          <video
            ref={previewVideoRef}
            src={blobUrl}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        )}
        {/* Recording indicator */}
        {state === 'recording' && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            REC {formatTime(elapsed)}
          </div>
        )}
        {/* Requesting placeholder */}
        {state === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Starting camera…</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {state === 'idle' && streamRef.current && (
          <ActionBtn onClick={startRecording} variant="danger">
            <Video className="h-4 w-4" /> Start recording
          </ActionBtn>
        )}
        {state === 'idle' && !streamRef.current && (
          <ActionBtn onClick={startCamera} variant="ghost">
            <Video className="h-4 w-4" /> Retry camera
          </ActionBtn>
        )}
        {state === 'recording' && (
          <ActionBtn onClick={stopRecording} variant="danger">
            <Square className="h-4 w-4" /> Stop
          </ActionBtn>
        )}
        {state === 'stopped' && (
          <>
            <ActionBtn onClick={insert}>
              <CheckCircle2 className="h-4 w-4" /> Insert video
            </ActionBtn>
            <ActionBtn onClick={reset} variant="ghost">
              <X className="h-4 w-4" /> Discard
            </ActionBtn>
          </>
        )}
        {state === 'uploading' && (
          <ActionBtn onClick={() => {}} disabled variant="ghost">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
          </ActionBtn>
        )}
        {state === 'done' && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" /> Video inserted!
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

/* ─── Video upload tab ──────────────────────────────────────────────────────── */

const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const MAX_VIDEO_MB = 200;

function VideoUploadTab({ token, onInsert }: { token: string; onInsert: (md: string) => void }) {
  const [state, setState]   = useState<RecordState>('idle');
  const [error, setError]   = useState('');
  const [preview, setPreview] = useState('');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<File | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError('');
      if (!ALLOWED_VIDEO_MIME.includes(file.type)) {
        setError('Unsupported format. Please use MP4, WebM, MOV, or AVI.');
        return;
      }
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        setError(`Video must be under ${MAX_VIDEO_MB} MB.`);
        return;
      }
      fileRef.current = file;
      setFileName(file.name);
      setPreview(URL.createObjectURL(file));
      setState('stopped');
    },
    []
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function reset() {
    fileRef.current = null;
    setPreview('');
    setFileName('');
    setState('idle');
    setError('');
  }

  async function insert() {
    if (!fileRef.current) return;
    setState('uploading');
    setError('');
    try {
      const [uploaded] = await uploadMedia(fileRef.current, token);
      onInsert(buildMarkdown(uploaded.url, uploaded.mime ?? fileRef.current.type, fileRef.current.name));
      setState('done');
      setTimeout(reset, 1500);
    } catch (err) {
      setError((err as Error).message || 'Upload failed. Please try again.');
      setState('stopped');
    }
  }

  return (
    <div className="space-y-4">
      {state === 'idle' && (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 py-10 text-gray-400 transition-colors hover:border-indigo-400 hover:bg-indigo-50/40"
        >
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mov,.avi"
            onChange={handleChange}
            className="sr-only"
          />
          <Upload className="h-8 w-8 text-indigo-400" />
          <span className="text-sm font-medium text-gray-600">Drop a video here, or click to browse</span>
          <span className="text-xs text-gray-400">MP4, WebM, MOV, AVI · Max {MAX_VIDEO_MB} MB</span>
        </label>
      )}

      {(state === 'stopped' || state === 'uploading') && preview && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl bg-gray-900" style={{ aspectRatio: '16/9' }}>
            <video src={preview} controls playsInline className="h-full w-full object-contain" />
          </div>
          <p className="truncate text-xs text-gray-500">{fileName}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {state === 'stopped' && (
          <>
            <ActionBtn onClick={insert}>
              <CheckCircle2 className="h-4 w-4" /> Insert video
            </ActionBtn>
            <ActionBtn onClick={reset} variant="ghost">
              <X className="h-4 w-4" /> Remove
            </ActionBtn>
          </>
        )}
        {state === 'uploading' && (
          <ActionBtn onClick={() => {}} disabled variant="ghost">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
          </ActionBtn>
        )}
        {state === 'done' && (
          <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" /> Video inserted!
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

/* ─── Main panel ────────────────────────────────────────────────────────────── */

export default function MediaRecorderPanel({ token, onInsert, onClose }: MediaRecorderPanelProps) {
  const [tab, setTab] = useState<Tab>('voice');

  return (
    <div className="rounded-xl border border-indigo-200 bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3">
        <div className="flex items-center gap-1">
          <TabBtn
            active={tab === 'voice'}
            onClick={() => setTab('voice')}
            icon={<Mic className="h-3.5 w-3.5" />}
            label="Voice note"
          />
          <TabBtn
            active={tab === 'video'}
            onClick={() => setTab('video')}
            icon={<Video className="h-3.5 w-3.5" />}
            label="Record video"
          />
          <TabBtn
            active={tab === 'upload'}
            onClick={() => setTab('upload')}
            icon={<Upload className="h-3.5 w-3.5" />}
            label="Upload video"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Close media panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tab content */}
      <div className="p-4">
        {tab === 'voice'  && <VoiceTab       token={token} onInsert={onInsert} />}
        {tab === 'video'  && <VideoRecordTab token={token} onInsert={onInsert} />}
        {tab === 'upload' && <VideoUploadTab token={token} onInsert={onInsert} />}
      </div>
    </div>
  );
}
