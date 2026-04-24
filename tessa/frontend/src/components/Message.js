import React, { useState } from 'react';
import ttsService from '../services/ttsService';

const styles = {
  messageRow: (isUser) => ({
    display: 'flex',
    justifyContent: isUser ? 'flex-end' : 'flex-start',
    width: '100%',
  }),
  message: (isUser, isError) => ({
    maxWidth: '80%',
    padding: '12px 16px',
    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    background: isError 
      ? 'rgba(244, 67, 54, 0.2)' 
      : isUser 
        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
        : 'rgba(255, 255, 255, 0.1)',
    color: isUser ? '#fff' : '#eee',
    border: isError 
      ? '1px solid rgba(244, 67, 54, 0.5)' 
      : isUser 
        ? 'none' 
        : '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: !isUser ? 'blur(10px)' : 'none',
    boxShadow: isUser 
      ? '0 4px 15px rgba(102, 126, 234, 0.3)' 
      : '0 4px 15px rgba(0, 0, 0, 0.1)',
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  }),
  avatar: (isUser) => ({
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: isUser ? '0' : '8px',
    marginLeft: isUser ? '8px' : '0',
    background: isUser 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
      : 'rgba(255, 255, 255, 0.1)',
    fontSize: '14px',
    flexShrink: 0,
  }),
  container: (isUser) => ({
    display: 'flex',
    flexDirection: isUser ? 'row-reverse' : 'row',
    alignItems: 'flex-end',
    maxWidth: '90%',
  }),
  messageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  speakButton: (isPlaying) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: 'none',
    background: isPlaying ? 'rgba(102, 126, 234, 0.5)' : 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s ease',
    opacity: 0.7,
    ':hover': {
      opacity: 1,
      background: 'rgba(102, 126, 234, 0.3)',
    },
  }),
};

function Message({ text, isUser, isError, timestamp, autoSpeak }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
    } else {
      ttsService.speak(text);
      setIsSpeaking(true);
      
      // Reset after a reasonable time (speech synthesis doesn't always fire onend reliably)
      const estimatedDuration = Math.max(2000, text.length * 80);
      setTimeout(() => setIsSpeaking(false), estimatedDuration);
    }
  };

  return (
    <div style={styles.messageRow(isUser)}>
      <div style={styles.container(isUser)}>
        <div style={styles.avatar(isUser)}>
          {isUser ? '👤' : isError ? '⚠️' : '🎙️'}
        </div>
        <div style={styles.messageWrapper}>
          <div style={styles.message(isUser, isError)}>
            {text}
          </div>
          {!isUser && !isError && ttsService.isSupported() && (
            <button
              style={styles.speakButton(isSpeaking)}
              onClick={handleSpeak}
              title={isSpeaking ? 'Stop speaking' : 'Speak this message'}
            >
              {isSpeaking ? '⏹️' : '🔊'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Message;
