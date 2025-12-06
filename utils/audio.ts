

let voicesLoadedPromise: Promise<SpeechSynthesisVoice[]> | null = null;

const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
  // If voices are already available, return them immediately
  const synth = window.speechSynthesis;
  const currentVoices = synth.getVoices();
  
  if (currentVoices.length > 0) {
    return Promise.resolve(currentVoices);
  }

  // If we are already waiting, return the existing promise
  if (voicesLoadedPromise) {
    return voicesLoadedPromise;
  }

  // Otherwise, create a new promise waiting for 'voiceschanged'
  voicesLoadedPromise = new Promise((resolve) => {
    const handler = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        synth.removeEventListener('voiceschanged', handler);
        resolve(voices);
        voicesLoadedPromise = null; // Clear promise so we check fresh next time if needed
      }
    };
    synth.addEventListener('voiceschanged', handler);

    // Fallback timeout in case event never fires (some browsers/environments)
    setTimeout(() => {
        synth.removeEventListener('voiceschanged', handler);
        resolve(synth.getVoices());
        voicesLoadedPromise = null;
    }, 2000);
  });

  return voicesLoadedPromise;
};

/**
 * Plays text using the browser's SpeechSynthesis API.
 * Waits for voices to load before speaking to fix "first time silent" bug.
 * 
 * @param text The text to speak
 * @param accent 'US' or 'UK'
 * @param rate Playback speed (0.25 to 3.0), default 1.0
 * @param repeat Number of times to repeat (default 1)
 */
export const playTextToSpeech = async (text: string, accent: 'US' | 'UK' = 'US', rate: number = 1.0, repeat: number = 1) => {
  if (!text || repeat <= 0) return;

  const synth = window.speechSynthesis;

  // Try to resume if stuck (Chrome quirk)
  if (synth.paused) {
    synth.resume();
  }

  // Cancel pending
  synth.cancel();

  try {
      // Wait for voices to be ready
      const voices = await getVoices();
      
      // Determine preferred language tag
      const langTag = accent === 'UK' ? 'en-GB' : 'en-US';
      
      // Find best matching voice
      // Priority: Exact region match > General 'en' match > First available
      const targetVoice = voices.find(v => v.lang === langTag) || 
                          voices.find(v => v.lang.startsWith(langTag)) || 
                          voices.find(v => v.lang.startsWith('en'));

      for (let i = 0; i < repeat; i++) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Strict rate clamping
        const safeRate = Math.max(0.1, Math.min(10, rate)); 
        utterance.rate = safeRate;
        utterance.pitch = 1.0;

        if (targetVoice) {
            utterance.voice = targetVoice;
            utterance.lang = targetVoice.lang;
        } else {
            // Fallback if no voice object found
            utterance.lang = langTag;
        }
        
        utterance.onerror = (e) => {
          console.error('TTS Error:', e);
        };

        synth.speak(utterance);

        // Optional: Add a pause utterance between repeats if needed, 
        // but typically speak queue handles strictly sequential playback.
      }
  } catch (err) {
      console.error("Failed to load voices or play audio", err);
  }
};