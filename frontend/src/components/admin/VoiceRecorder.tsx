import { useCallback, useEffect, useRef, useState } from 'react';
import { FaMicrophone, FaStop, FaTrash } from 'react-icons/fa';

/**
 * Browser voice recorder for issue reports.
 *
 * Records via MediaRecorder (webm/opus on Chrome, mp4/aac on Safari) with a
 * hard cap so a forgotten open mic cannot produce an hour-long upload. Hands
 * the finished clip to the parent as a Blob; uploading is the parent's job.
 */

const MAX_SECONDS = 5 * 60;

interface Props {
  onRecorded: (file: Blob, mime: string, durationSecs: number) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecorded, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob; mime: string; secs: number } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);

  const cleanupStream = () => {
    recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
  };

  useEffect(() => () => {
    // Unmount: stop the mic and drop any un-attached preview URL.
    if (timerRef.current) clearInterval(timerRef.current);
    cleanupStream();
    if (preview) URL.revokeObjectURL(preview.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof MediaRecorder === 'undefined') {
      setError('This browser cannot record audio.');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone access was refused.');
      return;
    }

    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      .find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    secondsRef.current = 0;
    setSeconds(0);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      cleanupStream();
      if (blob.size > 0) {
        setPreview({
          url: URL.createObjectURL(blob),
          blob,
          mime: type.split(';')[0],
          secs: secondsRef.current,
        });
      }
    };

    recorderRef.current = recorder;
    recorder.start(1000);
    setRecording(true);
    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
      if (secondsRef.current >= MAX_SECONDS) stop();
    }, 1000);
  }, [stop]);

  const discard = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const attach = () => {
    if (!preview) return;
    onRecorded(preview.blob, preview.mime, preview.secs);
    setPreview(null); // parent owns the blob now; keep its object URL out of our hands
  };

  const mmss = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!recording && !preview && (
        <button
          type="button"
          onClick={start}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <FaMicrophone className="text-red-500" /> Record voice note
        </button>
      )}

      {recording && (
        <>
          <span className="inline-flex items-center gap-2 text-sm text-red-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            Recording {mmss(seconds)} / {mmss(MAX_SECONDS)}
          </span>
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-red-600 text-white text-sm hover:bg-red-700"
          >
            <FaStop /> Stop
          </button>
        </>
      )}

      {preview && (
        <>
          <audio controls src={preview.url} className="h-9" />
          <span className="text-xs text-gray-500">{mmss(preview.secs)}</span>
          <button
            type="button"
            onClick={attach}
            className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
          >
            Attach
          </button>
          <button
            type="button"
            onClick={discard}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
          >
            <FaTrash /> Discard
          </button>
        </>
      )}

      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
