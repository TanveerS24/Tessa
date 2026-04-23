import React, { useState, useEffect, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import InputArea from './components/InputArea';
import api from './services/api';

const styles = {
  app: {
    display: 'flex',
    height: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  sidebar: {
    width: '260px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#fff',
  },
  newChatBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '16px',
  },
  tempChatToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    marginBottom: '16px',
    cursor: 'pointer',
  },
  tempChatLabel: {
    fontSize: '13px',
    color: '#aaa',
    userSelect: 'none',
  },
  tempChatActive: {
    background: 'rgba(102, 126, 234, 0.2)',
    border: '1px solid rgba(102, 126, 234, 0.5)',
  },
  sessionsList: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: '#ccc',
    fontSize: '14px',
  },
  sessionItemHover: {
    background: 'rgba(255, 255, 255, 0.1)',
  },
  sessionItemActive: {
    background: 'rgba(102, 126, 234, 0.3)',
    color: '#fff',
  },
  sessionIcon: {
    fontSize: '14px',
  },
  sessionTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sessionDelete: {
    opacity: 0,
    fontSize: '12px',
    padding: '4px',
    borderRadius: '4px',
    ':hover': {
      opacity: 1,
      background: 'rgba(244, 67, 54, 0.3)',
    },
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
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
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  currentChatTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#fff',
  },
  tempBadge: {
    padding: '4px 8px',
    background: 'rgba(255, 152, 0, 0.3)',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#ff9800',
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
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#888',
    gap: '16px',
  },
  emptyStateIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  emptyStateText: {
    fontSize: '16px',
  },
  sectionTitle: {
    fontSize: '11px',
    textTransform: 'uppercase',
    color: '#666',
    marginTop: '16px',
    marginBottom: '8px',
    paddingLeft: '4px',
  },
};

function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isTemporary, setIsTemporary] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('New Chat');
  const [systemStatus, setSystemStatus] = useState({
    status: 'checking',
    ollama_connected: false,
    mongodb_connected: false,
    model: 'llama3'
  });
  const messagesEndRef = useRef(null);

  // Load sessions and check health on mount
  useEffect(() => {
    loadSessions();
    checkHealth();
    const healthInterval = setInterval(checkHealth, 30000);
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

  const loadSessions = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadSessionMessages = async (sessionId) => {
    try {
      const session = await api.getSession(sessionId);
      const history = session.messages.map(msg => ([
        { text: msg.user_message, isUser: true, timestamp: msg.timestamp },
        { text: msg.ai_response, isUser: false, timestamp: msg.timestamp }
      ])).flat();
      setMessages(history);
      setCurrentTitle(session.title);
      setIsTemporary(session.is_temporary);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setCurrentTitle('New Chat');
    setIsTemporary(false);
  };

  const handleSessionClick = (sessionId) => {
    setCurrentSessionId(sessionId);
    loadSessionMessages(sessionId);
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat?')) return;
    
    try {
      await api.deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
      loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleToggleTemporary = () => {
    if (currentSessionId) {
      // Can't toggle temp mode on existing session
      return;
    }
    setIsTemporary(!isTemporary);
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const isFirstMessage = messages.length === 0;
    
    // Add user message immediately
    const userMessage = { text, isUser: true, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call backend with session and temporary flags
      const response = await api.sendMessage(text, currentSessionId, isTemporary);
      
      // Add AI response
      const aiMessage = { 
        text: response.response, 
        isUser: false, 
        timestamp: new Date().toISOString() 
      };
      setMessages(prev => [...prev, aiMessage]);

      // If this was the first message in a new non-temporary chat, refresh sessions
      if (isFirstMessage && !currentSessionId && !isTemporary) {
        await loadSessions();
        // Get the newly created session (most recent)
        const sessionsData = await api.getSessions();
        if (sessionsData.sessions && sessionsData.sessions.length > 0) {
          const newSession = sessionsData.sessions[0];
          setCurrentSessionId(newSession.id);
          setCurrentTitle(newSession.title);
        }
      }
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
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={{ fontSize: '24px' }}>🎙️</span>
          <span style={styles.sidebarTitle}>Tessa</span>
        </div>

        <button 
          style={styles.newChatBtn}
          onClick={handleNewChat}
        >
          <span>+</span>
          <span>New Chat</span>
        </button>

        <div 
          style={{
            ...styles.tempChatToggle,
            ...(isTemporary ? styles.tempChatActive : {}),
            opacity: currentSessionId ? 0.5 : 1,
            cursor: currentSessionId ? 'not-allowed' : 'pointer',
          }}
          onClick={handleToggleTemporary}
        >
          <span style={{ fontSize: '16px' }}>🔒</span>
          <span style={styles.tempChatLabel}>
            {isTemporary ? 'Temporary Chat (No Memory)' : 'Enable Temporary Chat'}
          </span>
        </div>

        <div style={styles.sectionTitle}>Recent Chats</div>
        
        <div style={styles.sessionsList}>
          {sessions.map(session => (
            <div
              key={session.id}
              style={{
                ...styles.sessionItem,
                ...(currentSessionId === session.id ? styles.sessionItemActive : {}),
              }}
              onClick={() => handleSessionClick(session.id)}
            >
              <span style={styles.sessionIcon}>💬</span>
              <span style={styles.sessionTitle}>{session.title}</span>
              <span 
                style={styles.sessionDelete}
                onClick={(e) => handleDeleteSession(e, session.id)}
              >
                🗑️
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.currentChatTitle}>{currentTitle}</span>
            {isTemporary && (
              <span style={styles.tempBadge}>TEMPORARY</span>
            )}
          </div>
          <div style={styles.status}>
            <div style={isHealthy ? styles.statusDot : styles.statusDotError} />
            <span>
              {isHealthy ? 'Ready' : 'Offline'} • {systemStatus.model}
            </span>
          </div>
        </header>

        <div style={styles.chatContainer}>
          {messages.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyStateIcon}>🎙️</span>
              <span style={styles.emptyStateText}>
                {isTemporary 
                  ? "Temporary chat - messages won't be saved to memory"
                  : "Start a conversation with Tessa"}
              </span>
            </div>
          ) : (
            <ChatWindow 
              messages={messages} 
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
            />
          )}
          <InputArea 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading}
            disabled={!isHealthy}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
