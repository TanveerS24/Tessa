import React from 'react';
import Message from './Message';

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#888',
    textAlign: 'center',
    gap: '16px',
  },
  emptyIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '14px',
    maxWidth: '300px',
    lineHeight: '1.5',
  },
  loadingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    color: '#888',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  dot: {
    width: '6px',
    height: '6px',
    background: '#888',
    borderRadius: '50%',
    animation: 'pulse 1.4s infinite',
  },
};

function ChatWindow({ messages, isLoading, messagesEndRef }) {
  if (messages.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🎙️</div>
          <div style={styles.emptyText}>
            <strong>Hey, I'm Tessa!</strong>
            <br /><br />
            I'm your voice-first AI assistant. 
            <br />
            Type a message to start chatting!
            <br /><br />
            <em>Wake words: "Hey Tessa", "Hey Tess", "Tessa", "Tess"</em>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {messages.map((message, index) => (
        <Message
          key={index}
          text={message.text}
          isUser={message.isUser}
          isError={message.isError}
          timestamp={message.timestamp}
        />
      ))}
      
      {isLoading && (
        <div style={styles.loadingIndicator}>
          <span style={{...styles.dot, animationDelay: '0s'}}></span>
          <span style={{...styles.dot, animationDelay: '0.2s'}}></span>
          <span style={{...styles.dot, animationDelay: '0.4s'}}></span>
          <span>Tessa is thinking...</span>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}

export default ChatWindow;
