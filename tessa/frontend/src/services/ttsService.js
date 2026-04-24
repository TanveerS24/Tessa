/**
 * Text-to-Speech Service using Web Speech API
 */

class TTSService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    this.isEnabled = true;
    this.isAutoSpeak = false;
    this.onVoicesChanged = null;

    // Load saved preferences
    this.loadPreferences();

    // Initialize voices
    if (this.synth) {
      this.voices = this.synth.getVoices();
      this.selectPreferredVoice();

      // Voices may load asynchronously
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
        this.selectPreferredVoice();
        if (this.onVoicesChanged) {
          this.onVoicesChanged(this.voices);
        }
      };
    }
  }

  loadPreferences() {
    try {
      const saved = localStorage.getItem('tts_preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        this.isEnabled = prefs.isEnabled !== false;
        this.isAutoSpeak = prefs.isAutoSpeak === true;
      }
    } catch (e) {
      console.error('Failed to load TTS preferences:', e);
    }
  }

  savePreferences() {
    try {
      localStorage.setItem('tts_preferences', JSON.stringify({
        isEnabled: this.isEnabled,
        isAutoSpeak: this.isAutoSpeak
      }));
    } catch (e) {
      console.error('Failed to save TTS preferences:', e);
    }
  }

  selectPreferredVoice() {
    if (this.voices.length === 0) return;

    // Prefer a female voice for Tessa (if available)
    const preferredVoice = this.voices.find(v => 
      v.name.includes('Female') || 
      v.name.includes('Samantha') ||
      v.name.includes('Victoria') ||
      v.name.includes('Google US English')
    );

    this.selectedVoice = preferredVoice || this.voices[0];
  }

  getVoices() {
    return this.voices;
  }

  setVoice(voiceName) {
    const voice = this.voices.find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
    }
  }

  isSupported() {
    return 'speechSynthesis' in window;
  }

  speak(text) {
    if (!this.synth || !this.isEnabled) return;

    // Cancel any ongoing speech
    this.synth.cancel();

    // Clean text for speech (remove code blocks, markdown, etc.)
    const cleanText = this.cleanTextForSpeech(text);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    // Set Tessa-like voice properties
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log('TTS started');
    };

    utterance.onend = () => {
      console.log('TTS ended');
    };

    utterance.onerror = (e) => {
      console.error('TTS error:', e);
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  cleanTextForSpeech(text) {
    if (!text) return '';
    
    return text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, ' code block ')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown bold/italic
      .replace(/\*\*?([^*]+)\*\*?/g, '$1')
      // Remove markdown links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, ' link ')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  toggleEnabled() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.stop();
    }
    this.savePreferences();
    return this.isEnabled;
  }

  toggleAutoSpeak() {
    this.isAutoSpeak = !this.isAutoSpeak;
    this.savePreferences();
    return this.isAutoSpeak;
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!this.isEnabled) {
      this.stop();
    }
    this.savePreferences();
  }

  setAutoSpeak(autoSpeak) {
    this.isAutoSpeak = autoSpeak;
    this.savePreferences();
  }
}

// Create singleton instance
const ttsService = new TTSService();

export default ttsService;
