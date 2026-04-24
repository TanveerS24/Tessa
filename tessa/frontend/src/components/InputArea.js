import React, { useState, useRef, useEffect } from 'react';

// Detect Brave browser
const isBrave = () => {
  return navigator?.brave?.isBrave?.() || false;
};

// Speech Recognition hook
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [isBraveBrowser, setIsBraveBrowser] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check for Brave browser
    const braveCheck = isBrave();
    setIsBraveBrowser(braveCheck);
    if (braveCheck) {
      console.warn('Brave browser detected: Speech recognition may be blocked. Try Chrome or Edge for voice input.');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        setError(null);
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        const isFinal = event.results[current].isFinal;
        console.log('Speech result:', transcript, 'Final:', isFinal);
        setTranscript(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(event.error);
        setIsListening(false);
        
        // Show helpful error messages
        if (event.error === 'network') {
          console.error('Network error: Speech recognition requires internet connection. Try:');
          console.error('1. Check your internet connection');
          console.error('2. Refresh the page and try again');
          console.error('3. If using Chrome/Edge, ensure speech services are enabled');
          if (isBrave()) {
            alert('Brave browser blocks speech recognition by default for privacy.\n\nTo use voice input:\n1. Try Chrome or Edge browser instead, OR\n2. Disable Brave shields for this site\n\nAlternatively, just type your message.');
          } else {
            alert('Speech recognition requires internet. Please check your connection and try again.');
          }
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          alert('Microphone access denied. Please allow microphone permission in your browser.');
        } else if (event.error === 'no-speech') {
          console.log('No speech detected - you can restart by clicking the mic button again');
        }
      };

      recognitionRef.current.onspeechend = () => {
        console.log('Speech ended');
      };
    }
  }, []);

  const startListening = async () => {
    if (!recognitionRef.current || isListening) return;
    
    try {
      // Check for microphone permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      setError(null);
      setTranscript('');
      recognitionRef.current.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        alert('Microphone permission denied. Please allow microphone access in your browser settings.');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  return { isListening, transcript, isSupported, isBraveBrowser, error, startListening, stopListening };
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    gap: '12px',
  },
  input: {
    flex: 1,
    padding: '12px 18px',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  inputDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  inputFocus: {
    border: '1px solid rgba(102, 126, 234, 0.5)',
    background: 'rgba(255, 255, 255, 0.08)',
  },
  button: {
    padding: '12px 20px',
    borderRadius: '24px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  buttonHover: {
    transform: 'translateY(-1px)',
    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
  },
  micButton: (isListening, hasError) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    background: hasError
      ? 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)'
      : isListening 
        ? 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)' 
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    fontSize: '18px',
    transition: 'all 0.2s ease',
    boxShadow: hasError
      ? '0 0 15px rgba(255, 152, 0, 0.5)'
      : isListening 
        ? '0 0 15px rgba(244, 67, 54, 0.5)' 
        : '0 4px 15px rgba(102, 126, 234, 0.3)',
    animation: isListening ? 'pulse 1.5s infinite' : 'none',
  }),
};

function InputArea({ onSendMessage, isLoading, disabled }) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef(null);
  const { isListening, transcript, isSupported, isBraveBrowser, error, startListening, stopListening } = useSpeechRecognition();

  // Focus input on mount
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  // Update input with transcript while listening
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Submit when user stops listening (clicks stop button)
  const handleStopListening = () => {
    stopListening();
    // Only submit if we have a transcript
    if (transcript && transcript.trim()) {
      setTimeout(() => {
        onSendMessage(transcript.trim());
        setInput('');
      }, 100);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form style={styles.container} onSubmit={handleSubmit}>
      {isSupported && (
        <button
          type="button"
          onClick={isListening ? handleStopListening : startListening}
          disabled={disabled || isLoading}
          style={{
            ...styles.micButton(isListening, error === 'network'),
            opacity: disabled || isLoading ? 0.5 : 1,
            cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
          }}
          title={isBraveBrowser ? 'Brave blocks voice input - use Chrome/Edge' : error === 'network' ? 'Network error - check connection' : isListening ? 'Click to stop and send' : 'Click to speak'}
        >
          {error === 'network' ? '⚠️' : isListening ? '⏹️' : '🎙️'}
        </button>
      )}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={disabled ? "System offline..." : isListening ? "Listening... (click stop to send)" : "Say 'Hey Tessa' or type a message..."}
        disabled={isLoading || disabled}
        style={{
          ...styles.input,
          ...(isFocused ? styles.inputFocus : {}),
          ...((isLoading || disabled) ? styles.inputDisabled : {}),
        }}
      />
      <button
        type="submit"
        disabled={isLoading || disabled || !input.trim()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...styles.button,
          ...(isHovered && !isLoading && !disabled && input.trim() ? styles.buttonHover : {}),
          ...((isLoading || disabled || !input.trim()) ? styles.buttonDisabled : {}),
        }}
      >
        {isLoading ? '...' : 'Send'}
      </button>
    </form>
  );
}

export default InputArea;
