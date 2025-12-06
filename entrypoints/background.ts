

import { defineBackground } from 'wxt/sandbox';
import { browser } from 'wxt/browser';
import { callTencentTranslation } from '../utils/api';
import { dictionariesStorage } from '../utils/storage';
import { DictionaryEngine } from '../types';

export default defineBackground(() => {
  // Check if we need to seed data on install
  browser.runtime.onInstalled.addListener(() => {
    console.log('ContextLingo Extension Installed');
  });

  // Handle Extension Icon Click -> Open Dashboard (Options Page) in a NEW TAB
  browser.action.onClicked.addListener(() => {
    // Use browser.runtime.getURL to safely get the path to options.html
    const url = (browser.runtime as any).getURL('/options.html');
    browser.tabs.create({ url });
  });

  // Handle Shortcuts
  browser.commands.onCommand.addListener((command) => {
    if (command === 'translate-page') {
      // Send message to active tab to trigger translation
      browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs[0]?.id) {
          browser.tabs.sendMessage(tabs[0].id, { action: 'TRIGGER_TRANSLATION' });
        }
      });
    }
  });

  // --- Helper: Fetch Dictionary Data with Failover ---
  const fetchEnglishDictionaryData = async (word: string) => {
      const allDicts = await dictionariesStorage.getValue();
      const enabledDicts = allDicts.filter(d => d.isEnabled).sort((a, b) => a.priority - b.priority);

      for (const dict of enabledDicts) {
          try {
              // --- 1. ICBA (Kingsoft) - High Priority China Source ---
              if (dict.id === 'iciba') {
                  const key = "D2AE3342306915865405466432026857"; // Open public key for ICBA API
                  const res = await fetch(`https://dict-co.iciba.com/api/dictionary.php?w=${word}&type=json&key=${key}`);
                  if (!res.ok) continue;
                  
                  const data = await res.json();
                  // Check valid response
                  if (!data || !data.symbols || data.symbols.length === 0) continue;

                  const symbol = data.symbols[0];
                  
                  // Extract Example
                  let example = "";
                  // Try to find a good example from 'sent' (sentences)
                  if (data.sent && data.sent.length > 0) {
                      const ex = data.sent[0];
                      example = ex.orig ? ex.orig.trim() : "";
                  }

                  return {
                      phoneticUs: symbol.ph_am ? `/${symbol.ph_am}/` : '',
                      phoneticUk: symbol.ph_en ? `/${symbol.ph_en}/` : '',
                      example: example
                  };
              }

              // --- 2. Youdao (NetEase) - China Source ---
              if (dict.id === 'youdao') {
                  // Using jsonapi which is richer
                  const res = await fetch(`https://dict.youdao.com/jsonapi?q=${word}`);
                  if (!res.ok) continue;

                  const data = await res.json();
                  
                  let phoneticUs = "";
                  let phoneticUk = "";
                  let example = "";

                  // Youdao structure varies (ec, simple, etc)
                  if (data.simple && data.simple.word && data.simple.word.length > 0) {
                      const w = data.simple.word[0];
                      if(w['usphone']) phoneticUs = `/${w['usphone']}/`;
                      if(w['ukphone']) phoneticUk = `/${w['ukphone']}/`;
                  }
                  
                  // Fallback to 'ec' part if simple missing
                  if (!phoneticUs && data.ec && data.ec.word && data.ec.word.length > 0) {
                      const w = data.ec.word[0];
                      if(w['usphone']) phoneticUs = `/${w['usphone']}/`;
                      if(w['ukphone']) phoneticUk = `/${w['ukphone']}/`;
                  }

                  // Find examples in 'blng_sents_part' (bilingual sentences) or 'auth_sents_part'
                  if (data.blng_sents_part && data.blng_sents_part['sentence-pair']) {
                      const pairs = data.blng_sents_part['sentence-pair'];
                      if (pairs.length > 0) {
                          example = pairs[0].sentence || "";
                      }
                  }

                  if (phoneticUs || phoneticUk || example) {
                      return { phoneticUs, phoneticUk, example };
                  }
                  // If nothing found in Youdao, continue
              }

              // --- 3. Free Dictionary API (Google) - Blocked in China ---
              if (dict.id === 'free-dict') {
                  const res = await fetch(`${dict.endpoint}${word}`);
                  if (!res.ok) continue; 
                  const data = await res.json();
                  if (!Array.isArray(data) || data.length === 0) continue;
                  
                  const entry = data[0];
                  // Robust phonetic extraction
                  const usPhonetic = entry.phonetics?.find((p: any) => p.audio?.includes('-us.mp3') || p.text)?.text || entry.phonetic || '';
                  const ukPhonetic = entry.phonetics?.find((p: any) => p.audio?.includes('-uk.mp3'))?.text || '';

                  return {
                      phoneticUs: usPhonetic,
                      phoneticUk: ukPhonetic,
                      example: entry.meanings?.[0]?.definitions?.find((d: any) => d.example)?.example || ''
                  };
              } 
              
              // --- 4. Wiktionary (Fallback) ---
              if (dict.id === 'wiktionary') {
                   // Fallback to Wiktionary (Simple API call, robust parsing omitted for brevity)
                   // Just checking existence for now as a last resort
                   const res = await fetch(`${dict.endpoint}${word}`);
                   if (!res.ok) continue;
                   console.log(`Fallback to Wiktionary for ${word} (Parsing not fully implemented)`);
                   continue; 
              }
          } catch (e) {
              console.warn(`Dictionary ${dict.name} failed for ${word}`, e);
          }
      }
      return null;
  };

  // Message Handler for API Requests (Bypassing CORS)
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'TRANSLATE_TEXT') {
      // Use async IIFE to handle the promise and sendResponse
      (async () => {
        try {
          console.log('ContextLingo Background: Translating...', { text: message.text?.substring(0, 20) });
          // We currently only support Tencent in the demo logic, but this can be expanded
          if (message.engine.id === 'tencent') {
             const result = await callTencentTranslation(message.engine, message.text, message.target);
             sendResponse({ success: true, data: result });
          } else if (message.engine.id === 'custom-mock') {
             sendResponse({ success: true, data: { Response: { TargetText: `Simulated translation for: ${message.text}` } } });
          } else {
             throw new Error(`Engine ${message.engine.name} not supported in background proxy yet.`);
          }
        } catch (error: any) {
          console.error('ContextLingo Background Error:', error);
          sendResponse({ success: false, error: error.message || String(error) });
        }
      })();
      return true; // Return true to indicate we wish to send a response asynchronously
    }

    if (message.action === 'LOOKUP_WORD') {
      // Handle Dictionary Lookup logic (called from WordManager)
      (async () => {
        try {
          console.log('ContextLingo Background: Looking up word...', message.text);
          const { engine, text, preferredTranslation } = message;

          if (engine.id === 'custom-mock') {
              // Simulate Rich Data for testing
              const mockResult = {
                text: text,
                phoneticUs: `/${text}US/`,
                phoneticUk: `/${text}UK/`,
                meanings: [
                    {
                        translation: preferredTranslation || "示例释义1",
                        contextSentence: `This is a sentence for ${text} meaning 1.`,
                        mixedSentence: `这是一个关于 ${text} (示例释义1) 的句子。`,
                        dictionaryExample: `Example usage of ${text}.`
                    },
                    {
                        translation: "示例释义2 (多义)",
                        contextSentence: `Another context for ${text}.`,
                        mixedSentence: `另一个 ${text} (示例释义2) 的语境。`,
                        dictionaryExample: `Secondary usage of ${text}.`
                    }
                ]
              };
              // Simulate delay
              await new Promise(r => setTimeout(r, 800));
              sendResponse({ success: true, data: mockResult });
              return;
          }

          if (engine.id === 'tencent') {
             // 1. Fetch Real Dictionary Data First (Phonetics, Examples)
             const dictData = await fetchEnglishDictionaryData(text);

             // 2. Fetch Translation
             const res = await callTencentTranslation(engine, text, 'zh');
             const trans = res.Response?.TargetText || preferredTranslation || "API Error";
             
             // 3. Merge
             // Use US phonetic as fallback for both if one missing, or empty string
             const pUs = dictData?.phoneticUs || '';
             const pUk = dictData?.phoneticUk || pUs; // Fallback to US if UK missing

             const result = {
                 text: text,
                 phoneticUs: pUs,
                 phoneticUk: pUk,
                 meanings: [
                     {
                         translation: trans,
                         contextSentence: '', // Manual add has no context
                         mixedSentence: '', // Manual add has no mixed
                         dictionaryExample: dictData?.example || ''
                     }
                 ]
             };
             sendResponse({ success: true, data: result });
          } else {
             // For AI Engines (Gemini, OpenAI), you would construct the prompt here 
             // and call the LLM API to get the JSON structure.
             // For now, fall back to simple error or mock implementation if not integrated.
             throw new Error(`Engine ${engine.name} does not support dictionary lookup yet.`);
          }

        } catch (error: any) {
          console.error('ContextLingo Background Error:', error);
          sendResponse({ success: false, error: error.message || String(error) });
        }
      })();
      return true;
    }
  });
});
