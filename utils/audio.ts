

/**
 * Plays text using the browser's SpeechSynthesis API.
 * Cancels any pending utterances to ensure immediate playback.
 * 
 * @param text The text to speak
 * @param accent 'US' or 'UK'
 * @param rate Playback speed (0.1 to 10), default 1.0
 * @param repeat Number of times to repeat (default 1)
 */
export const playTextToSpeech = (text: string, accent: 'US' | 'UK' = 'US', rate: number = 1.0, repeat: number = 1) => {
  if (!text || repeat <= 0) return;

  // Cancel any currently playing audio to avoid queue backups/silence
  window.speechSynthesis.cancel();

  // Queue up the utterances
  for (let i = 0; i < repeat; i++) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = accent === 'UK' ? 'en-GB' : 'en-US';
    utterance.rate = rate;
    
    // Optional: Pitch adjustment could be exposed too, but default is fine
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  }
};
