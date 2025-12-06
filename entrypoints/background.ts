
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
  });
});
