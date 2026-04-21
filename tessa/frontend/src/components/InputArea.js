import React, { useState, useRef, useEffect } from 'react';

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
};

function InputArea({ onSendMessage, isLoading, disabled }) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

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
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={disabled ? "System offline..." : "Say 'Hey Tessa' or type a message..."}
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
