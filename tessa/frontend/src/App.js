import React, { useState, useEffect, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import InputArea from './components/InputArea';
import api from './services/api';

const styles = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#aaa',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4CAF50',
    boxShadow: '0 0 8px #4CAF50',
  },
  statusDotError: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#f44336',
    boxShadow: '0 0 8px #f44336',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
};

function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    status: 'checking',
    ollama_connected: false,
    mongodb_connected: false,
    model: 'llama3'
  });
  const messagesEndRef = useRef(null);

  // Load conversation history on mount
  useEffect(() => {
    loadConversations();
    checkHealth();
    const healthInterval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(healthInterval);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkHealth = async () => {
    try {
      const status = await api.healthCheck();
      setSystemStatus(status);
    } catch (error) {
      setSystemStatus({
        status: 'error',
        ollama_connected: false,
        mongodb_connected: false,
        model: 'unknown'
      });
    }
  };

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      const history = data.conversations.map(conv => [
        { text: conv.user_message, isUser: true, timestamp: conv.timestamp },
        { text: conv.ai_response, isUser: false, timestamp: conv.timestamp }
      ]).flat();
      setMessages(history);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    // Add user message immediately
    const userMessage = { text, isUser: true, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call backend
      const response = await api.sendMessage(text);
      
      // Add AI response
      const aiMessage = { 
        text: response.response, 
        isUser: false, 
        timestamp: new Date().toISOString() 
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = { 
        text: "Sorry, I'm having trouble connecting right now. Make sure the backend is running!", 
        isUser: false, 
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const isHealthy = systemStatus.ollama_connected && systemStatus.mongodb_connected;

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.title}>
          <span>🎙️</span>
          <span>Tessa</span>
        </div>
        <div style={styles.status}>
          <div style={isHealthy ? styles.statusDot : styles.statusDotError} />
          <span>
            {isHealthy ? 'Ready' : 'Offline'} • {systemStatus.model}
          </span>
        </div>
      </header>

      <main style={styles.main}>
        <ChatWindow 
          messages={messages} 
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />
        <InputArea 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading}
          disabled={!isHealthy}
        />
      </main>
    </div>
  );
}

export default App;
