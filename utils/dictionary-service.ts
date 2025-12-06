
import { TranslationEngine, WordEntry, WordCategory } from "../types";
import { browser } from "wxt/browser";

interface DictionaryResult {
  text: string;
  phoneticUs: string;
  phoneticUk: string;
  meanings: {
    translation: string;
    definition?: string;
    contextSentence: string;
    mixedSentence: string;
    dictionaryExample: string;
  }[];
}

/**
 * Calculates a simple similarity score between two strings (0-1).
 * Used to match user-provided translation with API results.
 */
const similarity = (s1: string, s2: string): number => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance(longer, shorter)) / longer.length;
};

const editDistance = (s1: string, s2: string) => {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = new Array();
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i == 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
};

/**
 * Core Service: Fetches rich word info using the active engine.
 */
export const fetchWordDetails = async (
  word: string, 
  preferredTranslation: string | undefined, 
  engine: TranslationEngine
): Promise<Partial<WordEntry>[]> => {
  
  // 1. Send message to background to handle the actual API call (to avoid CORS)
  // The background script will route this to the appropriate API handler (AI or Standard)
  const response = await browser.runtime.sendMessage({
    action: 'LOOKUP_WORD',
    engine: engine,
    text: word,
    preferredTranslation: preferredTranslation
  });

  if (!response) {
    throw new Error("后台服务未响应，请刷新页面或重新加载扩展。");
  }

  if (!response.success) {
    throw new Error(response.error || "Lookup failed");
  }

  const result: DictionaryResult = response.data;

  // 2. Filter logic
  let selectedMeanings = result.meanings;

  // If user provided a specific translation, filter to find the closest match
  if (preferredTranslation && preferredTranslation.trim()) {
    // Find best match
    const sorted = [...result.meanings].sort((a, b) => {
        const scoreA = similarity(a.translation, preferredTranslation);
        const scoreB = similarity(b.translation, preferredTranslation);
        return scoreB - scoreA;
    });
    
    // If we have a match, take the top one. 
    // Ideally, if the API is good, the top one is the intended meaning.
    if (sorted.length > 0) {
        selectedMeanings = [sorted[0]];
    }
  }

  // 3. Map to WordEntry objects
  const timestamp = Date.now();
  
  return selectedMeanings.map((m, idx) => ({
    text: result.text, // Use returned casing
    phoneticUs: result.phoneticUs,
    phoneticUk: result.phoneticUk,
    translation: m.translation,
    contextSentence: m.contextSentence,
    mixedSentence: m.mixedSentence,
    dictionaryExample: m.dictionaryExample,
    addedAt: timestamp + idx // Offset slightly to ensure unique sort order
  }));
};
