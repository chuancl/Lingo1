
/**
 * Plays text using the browser's SpeechSynthesis API.
 * Cancels any pending utterances to ensure immediate playback.
 */
export const playTextToSpeech = (text: string, accent: 'US' | 'UK' = 'US') => {
  if (!text) return;

  // Cancel any currently playing audio to avoid queue backups/silence
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = accent === 'UK' ? 'en-GB' : 'en-US';
  
  // Optional: Adjust rate/pitch if needed
  utterance.rate = 1.0; 
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
};
