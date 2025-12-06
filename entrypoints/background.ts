
import { defineBackground } from 'wxt/sandbox';
import { browser } from 'wxt/browser';
import { callTencentTranslation } from '../utils/api';

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
             // Standard Engine Fallback:
             // Since standard translation API only gives 1 string, we just Translate it.
             // We can't easily get phonetics or examples without a dictionary API.
             // So we return a basic entry.
             const res = await callTencentTranslation(engine, text, 'zh');
             const trans = res.Response?.TargetText || preferredTranslation || "API Error";
             
             const result = {
                 text: text,
                 phoneticUs: '', // Not available from MT
                 phoneticUk: '',
                 meanings: [
                     {
                         translation: trans,
                         contextSentence: `Auto-generated context for ${text}.`,
                         mixedSentence: `${text} (${trans})`,
                         dictionaryExample: ''
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
