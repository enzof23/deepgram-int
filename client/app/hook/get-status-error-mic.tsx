"use client"

import { useState, useEffect, useCallback, useRef } from 'react';

// Types
export interface MicrophoneError {
  code: string;
  message: string;
  name: string;
}

export type MicrophoneStatus = 'idle' | 'requesting' | 'recording' | 'error' | 'denied';

export interface UseMicrophoneOptions {
  onStart?: (stream: MediaStream) => void;
  onStop?: () => void;
  onError?: (error: MicrophoneError) => void;
}

export interface UseMicrophoneReturn {
  status: MicrophoneStatus;
  isRecording: boolean;
  error: MicrophoneError | null;
  stream: MediaStream | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  toggleRecording: () => Promise<void>;
}

// Error mapping for better error messages
const getErrorMessage = (error: unknown): MicrophoneError => {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
        return {
          code: 'PERMISSION_DENIED',
          message: 'Microphone access denied. Please grant permission to use your microphone.',
          name: error.name,
        };
      case 'NotFoundError':
        return {
          code: 'NO_DEVICE',
          message: 'No microphone found. Please ensure a microphone is connected.',
          name: error.name,
        };
      case 'NotReadableError':
        return {
          code: 'DEVICE_IN_USE',
          message: 'Microphone is already in use by another application.',
          name: error.name,
        };
      case 'OverconstrainedError':
        return {
          code: 'CONSTRAINTS_ERROR',
          message: 'Unable to satisfy microphone constraints.',
          name: error.name,
        };
      case 'SecurityError':
        return {
          code: 'SECURITY_ERROR',
          message: 'Microphone access blocked due to security restrictions.',
          name: error.name,
        };
      default:
        return {
          code: 'UNKNOWN_ERROR',
          message: error.message || 'An unknown error occurred.',
          name: error.name,
        };
    }
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred.',
    name: 'UnknownError',
  };
};

export const useMicrophone = (options: UseMicrophoneOptions = {}): UseMicrophoneReturn => {
  const {
    onStart,
    onStop,
    onError,
  } = options;

  const [status, setStatus] = useState<MicrophoneStatus>('idle');
  const [error, setError] = useState<MicrophoneError | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const isRecording = status === 'recording';

  // Clean up stream
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      // Check if already recording
      if (status === 'recording') {
        return;
      }

      setStatus('requesting');
      setError(null);

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser');
      }

      // Request microphone access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
            noiseSuppression: true,
            echoCancellation: true,
          },
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus('recording');
      
      onStart?.(mediaStream);
    } catch (err) {
      const micError = getErrorMessage(err);
      setError(micError);
      setStatus(micError.code === 'PERMISSION_DENIED' ? 'denied' : 'error');
      onError?.(micError);
      cleanupStream();
    }
  }, [status, onStart, onError, cleanupStream]);

  // Stop recording
  const stopRecording = useCallback((): void => {
    if (status !== 'recording') {
      return;
    }

    cleanupStream();
    setStatus('idle');
    onStop?.();
  }, [status, cleanupStream, onStop]);

  // Toggle recording
  const toggleRecording = useCallback(async (): Promise<void> => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, stopRecording, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  // Handle visibility change (stop recording when tab becomes hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRecording) {
        stopRecording();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRecording, stopRecording]);

  return {
    status,
    isRecording,
    error,
    stream,
    startRecording,
    stopRecording,
    toggleRecording,
  };
};

// Example usage component
export const MicrophoneExample: React.FC = () => {
  const {
    status,
    isRecording,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
  } = useMicrophone({
    onStart: (stream) => {
      console.log('Microphone started', stream);
    },
    onStop: () => {
      console.log('Microphone stopped');
    },
    onError: (error) => {
      console.error('Microphone error:', error);
    },
  });

  const getStatusDisplay = () => {
    switch (status) {
      case 'idle':
        return 'Ready';
      case 'requesting':
        return 'Requesting permission...';
      case 'recording':
        return 'Recording';
      case 'denied':
        return 'Permission denied';
      case 'error':
        return 'Error occurred';
      default:
        return 'Error unknown';
    }
  };

  const getStatusColour = () => {
    switch (status) {
      case 'recording':
        return 'text-green-600';
      case 'denied':
      case 'error':
        return 'text-red-500';
      case 'requesting':
        return 'text-yellow-600';
      default:
        return 'text-red-500';
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Microphone Control</h2>
      
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${
            isRecording ? 'bg-red-500 animate-pulse' : 'bg-grey-300'
          }`} />
          <span className={`font-medium ${getStatusColour()}`}>
            {getStatusDisplay()}
          </span>
        </div>
        
        {error && (
          <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
            {error.message}
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={startRecording}
          disabled={isRecording || status === 'requesting'}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-grey-300 disabled:cursor-not-allowed"
        >
          Start
        </button>
        
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-grey-300 disabled:cursor-not-allowed"
        >
          Stop
        </button>
        
        <button
          onClick={toggleRecording}
          disabled={status === 'requesting'}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-grey-300 disabled:cursor-not-allowed"
        >
          Toggle
        </button>
      </div>
    </div>
  );
};