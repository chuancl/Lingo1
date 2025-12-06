
/**
 * Plays text using the browser's SpeechSynthesis API.
 * Includes logic to wake up the engine and handle browser quirks.
 * 
 * @param text The text to speak
 * @param accent 'US' or 'UK'
 * @param rate Playback speed (0.25 to 3.0), default 1.0
 * @param repeat Number of times to repeat (default 1)
 */
export const playTextToSpeech = (text: string, accent: 'US' | 'UK' = 'US', rate: number = 1.0, repeat: number = 1) => {
  if (!text || repeat <= 0) return;

  const synth = window.speechSynthesis;

  // Chrome sometimes gets stuck in a paused state
  if (synth.paused) {
    synth.resume();
  }

  // Cancel any pending utterances to ensure immediate playback
  synth.cancel();

  // Helper to create and speak utterance
  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = accent === 'UK' ? 'en-GB' : 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1.0;
    
    // Error handling to prevent queue blocking
    utterance.onerror = (e) => {
      console.error('TTS Error:', e);
      synth.cancel();
    };

    synth.speak(utterance);
  };

  // Queue up the utterances
  for (let i = 0; i < repeat; i++) {
    speak();
  }
};
