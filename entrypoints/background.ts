

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
              if (dict.id === 'free-dict') {
                  const res = await fetch(`${dict.endpoint}${word}`);
                  if (!res.ok) continue; // Try next if 404
                  const data = await res.json();
                  if (!Array.isArray(data) || data.length === 0) continue;
                  
                  const entry = data[0];
                  return {
                      phoneticUs: entry.phonetics?.find((p: any) => p.audio?.includes('-us.mp3'))?.text || entry.phonetic || '',
                      phoneticUk: entry.phonetics?.find((p: any) => p.audio?.includes('-uk.mp3'))?.text || '',
                      // Extract first valid example from meanings
                      example: entry.meanings?.[0]?.definitions?.find((d: any) => d.example)?.example || ''
                  };
              } 
              
              if (dict.id === 'wiktionary') {
                   // Fallback to Wiktionary (Simple API call, robust parsing omitted for brevity, usually needs HTML parsing)
                   // Since user wants redundancy, we can just hit the API and verify it exists
                   const res = await fetch(`${dict.endpoint}${word}`);
                   if (!res.ok) continue;
                   // Wiktionary JSON structure is complex. For failover, we might just confirm existence 
                   // or implement a basic parser later. For now, if Free Dictionary fails, 
                   // we might return empty to avoid breaking flow with bad data.
                   // NOTE: Real implementation would parse 'en.wiktionary.org' HTML or Rest API.
                   console.log(`Fallback to Wiktionary for ${word} (Not fully parsed in this demo)`);
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
             const result = {
                 text: text,
                 phoneticUs: dictData?.phoneticUs || '', 
                 phoneticUk: dictData?.phoneticUk || '',
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