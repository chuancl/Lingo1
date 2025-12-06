
import ReactDOM from 'react-dom/client';
import React, { useState, useEffect, useRef } from 'react';
import { PageWidget } from '../../components/PageWidget';
import { WordBubble } from '../../components/WordBubble';
import '../../index.css'; 
import { entriesStorage, pageWidgetConfigStorage, autoTranslateConfigStorage, stylesStorage, originalTextConfigStorage, enginesStorage, interactionConfigStorage } from '../../utils/storage';
import { WordEntry, PageWidgetConfig, WordInteractionConfig, WordCategory, AutoTranslateConfig, ModifierKey } from '../../types';
import { defineContentScript } from 'wxt/sandbox';
import { createShadowRootUi } from 'wxt/client';
import { findFuzzyMatches } from '../../utils/matching';
import { buildReplacementHtml } from '../../utils/dom-builder';
import { browser } from 'wxt/browser';
import { preloadVoices, unlockAudio } from '../../utils/audio';

// --- Overlay App Component (Manages Widget & Bubbles) ---
interface ContentOverlayProps {
  initialWidgetConfig: PageWidgetConfig;
  initialEntries: WordEntry[];
  initialInteractionConfig: WordInteractionConfig;
  initialAutoTranslateConfig: AutoTranslateConfig; // New Prop
}

const ContentOverlay: React.FC<ContentOverlayProps> = ({ 
    initialWidgetConfig, 
    initialEntries, 
    initialInteractionConfig,
    initialAutoTranslateConfig 
}) => {
  const [widgetConfig, setWidgetConfig] = useState(initialWidgetConfig);
  const [interactionConfig, setInteractionConfig] = useState(initialInteractionConfig);
  const [autoTranslateConfig, setAutoTranslateConfig] = useState(initialAutoTranslateConfig);
  const [entries, setEntries] = useState(initialEntries);
  
  // Widget Logic
  const [pageWords, setPageWords] = useState<WordEntry[]>([]);

  // Bubble Logic
  const [hoveredEntry, setHoveredEntry] = useState<WordEntry | null>(null);
  const [hoveredOriginalText, setHoveredOriginalText] = useState<string>("");
  const [hoverTargetRect, setHoverTargetRect] = useState<DOMRect | null>(null);
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Refs for Event Listeners (Fix Stale Closures) ---
  const interactionConfigRef = useRef(interactionConfig);
  const entriesRef = useRef(entries);
  const isBubbleVisibleRef = useRef(isBubbleVisible);
  const hoveredEntryRef = useRef(hoveredEntry);

  useEffect(() => { interactionConfigRef.current = interactionConfig; }, [interactionConfig]);
  useEffect(() => { entriesRef.current = entries; }, [entries]);
  useEffect(() => { isBubbleVisibleRef.current = isBubbleVisible; }, [isBubbleVisible]);
  useEffect(() => { hoveredEntryRef.current = hoveredEntry; }, [hoveredEntry]);

  useEffect(() => {
    // Sync Storage Listeners
    const unsubs = [
        pageWidgetConfigStorage.watch(v => v && setWidgetConfig(v)),
        interactionConfigStorage.watch(v => v && setInteractionConfig(v)),
        entriesStorage.watch(v => v && setEntries(v)),
        autoTranslateConfigStorage.watch(v => v && setAutoTranslateConfig(v)) 
    ];

    const pageContent = document.body.innerText;
    const relevant = entries.filter(e => pageContent.includes(e.translation || ''));
    setPageWords(relevant);

    return () => unsubs.forEach(u => u());
  }, [entries]);

  // Keep hoveredEntry up to date if entries change (e.g. category update)
  useEffect(() => {
      if (hoveredEntry) {
          const updated = entries.find(e => e.id === hoveredEntry.id);
          if (updated && updated.category !== hoveredEntry.category) {
              setHoveredEntry(updated);
          }
      }
  }, [entries, hoveredEntry]);

  // --- Audio Unlocker ---
  useEffect(() => {
      const handleUserInteraction = () => {
          unlockAudio();
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('keydown', handleUserInteraction);
      };

      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);

      return () => {
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('keydown', handleUserInteraction);
      };
  }, []);

  // Helper for modifiers
  const checkModifier = (e: MouseEvent, mod: ModifierKey) => {
      if (mod === 'None') return true;
      if (mod === 'Alt') return e.altKey;
      if (mod === 'Ctrl') return e.ctrlKey || e.metaKey; // Windows Ctrl or Mac Cmd
      if (mod === 'Shift') return e.shiftKey;
      if (mod === 'Meta') return e.metaKey;
      return true;
  };

  // Global Event Listener for Bubbles (Using Refs)
  useEffect(() => {
     // 1. Mouse Over (Hover)
     const handleMouseOver = (e: MouseEvent) => {
         const config = interactionConfigRef.current;
         const currentEntries = entriesRef.current;
         const isVisible = isBubbleVisibleRef.current;
         const currentHovered = hoveredEntryRef.current;

         const target = e.target as HTMLElement;
         const entryEl = target.closest('[data-entry-id]') as HTMLElement;
         
         if (entryEl) {
             const id = entryEl.getAttribute('data-entry-id');
             const originalText = entryEl.getAttribute('data-original-text') || '';
             const entry = currentEntries.find(w => w.id === id);
             
             if (entry) {
                 // Always cancel any pending hide action when entering a valid word
                 if (hideTimer.current) {
                     clearTimeout(hideTimer.current);
                     hideTimer.current = null;
                 }
                 
                 // If already visible and same entry, do nothing
                 if (isVisible && currentHovered?.id === entry.id) {
                     return;
                 }

                 // Only trigger SHOW if configured action is 'Hover'
                 if (config.mainTrigger.action === 'Hover') {
                     // Check modifier
                     if (checkModifier(e, config.mainTrigger.modifier)) {
                         if (showTimer.current) clearTimeout(showTimer.current);
                         
                         const delay = config.mainTrigger.delay;
                         showTimer.current = setTimeout(() => {
                            setHoveredEntry(entry);
                            setHoveredOriginalText(originalText);
                            setHoverTargetRect(entryEl.getBoundingClientRect());
                            setIsBubbleVisible(true);
                         }, delay);
                     }
                 }
             }
         }
     };

     const handleMouseOut = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const entryEl = target.closest('[data-entry-id]');
        
        if (entryEl) {
            // Cancel pending show
            if (showTimer.current) {
                clearTimeout(showTimer.current);
                showTimer.current = null;
            }

            // Start hiding sequence
            if (hideTimer.current) clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => {
                setIsBubbleVisible(false);
                setHoveredEntry(null);
            }, 300);
        }
     };

     // 2. Click / DoubleClick / RightClick Triggers
     const handleTriggerEvent = (e: MouseEvent, actionType: 'Click' | 'DoubleClick' | 'RightClick') => {
         const config = interactionConfigRef.current;
         
         // STRICT CHECK: Action must match config
         if (config.mainTrigger.action !== actionType) return;
         
         // Check modifier
         if (!checkModifier(e, config.mainTrigger.modifier)) return;

         const target = e.target as HTMLElement;
         const entryEl = target.closest('[data-entry-id]') as HTMLElement;
         
         if (entryEl) {
             const currentEntries = entriesRef.current;
             const id = entryEl.getAttribute('data-entry-id');
             const originalText = entryEl.getAttribute('data-original-text') || '';
             const entry = currentEntries.find(w => w.id === id);
             
             if (entry) {
                 if (actionType === 'RightClick') e.preventDefault();

                 // Clear timers
                 if (showTimer.current) clearTimeout(showTimer.current);
                 if (hideTimer.current) clearTimeout(hideTimer.current);

                 // Show immediately
                 setHoveredEntry(entry);
                 setHoveredOriginalText(originalText);
                 setHoverTargetRect(entryEl.getBoundingClientRect());
                 setIsBubbleVisible(true);
             }
         }
     };

     const handleClick = (e: MouseEvent) => handleTriggerEvent(e, 'Click');
     const handleDblClick = (e: MouseEvent) => handleTriggerEvent(e, 'DoubleClick');
     const handleContextMenu = (e: MouseEvent) => handleTriggerEvent(e, 'RightClick');

     document.addEventListener('mouseover', handleMouseOver);
     document.addEventListener('mouseout', handleMouseOut);
     document.addEventListener('click', handleClick);
     document.addEventListener('dblclick', handleDblClick);
     document.addEventListener('contextmenu', handleContextMenu);

     return () => {
         document.removeEventListener('mouseover', handleMouseOver);
         document.removeEventListener('mouseout', handleMouseOut);
         document.removeEventListener('click', handleClick);
         document.removeEventListener('dblclick', handleDblClick);
         document.removeEventListener('contextmenu', handleContextMenu);
     };
  }, []); // Bound ONCE, using refs for state

  // Handle Bubble Interaction (Keep Alive)
  const handleBubbleMouseEnter = () => {
      if (hideTimer.current) {
          clearTimeout(hideTimer.current);
          hideTimer.current = null;
      }
  };

  const handleBubbleMouseLeave = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
          setIsBubbleVisible(false);
          setHoveredEntry(null);
      }, 300);
  };

  const handleAddWordToLearning = async (id: string) => {
      const allEntries = await entriesStorage.getValue();
      const newEntries = allEntries.map(e => 
          e.id === id ? { ...e, category: WordCategory.LearningWord } : e
      );
      await entriesStorage.setValue(newEntries);
      setEntries(newEntries);
  };

  return (
    <div className="reset-shadow-dom" style={{
        all: 'initial', 
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '16px',
        lineHeight: '1.5',
        color: '#0f172a'
    }}>
       {/* 1. Page Widget (Floating Ball) */}
       <PageWidget 
          config={widgetConfig}
          setConfig={(v) => pageWidgetConfigStorage.setValue(v)}
          pageWords={pageWords}
          setPageWords={setPageWords}
       />

       {/* 2. Word Interaction Bubble */}
       <WordBubble 
          entry={hoveredEntry}
          originalText={hoveredOriginalText}
          targetRect={hoverTargetRect}
          config={interactionConfig}
          isVisible={isBubbleVisible}
          onMouseEnter={handleBubbleMouseEnter}
          onMouseLeave={handleBubbleMouseLeave}
          onAddWord={handleAddWordToLearning}
          ttsSpeed={autoTranslateConfig.ttsSpeed} 
       />
    </div>
  );
};


export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('ContextLingo: Content Script Initializing on', window.location.href);

    // 0. Preload voices immediately
    preloadVoices();

    // 1. Load State
    let currentEntries = await entriesStorage.getValue();
    let currentWidgetConfig = await pageWidgetConfigStorage.getValue();
    let currentAutoTranslate = await autoTranslateConfigStorage.getValue();
    let currentStyles = await stylesStorage.getValue();
    let currentOriginalTextConfig = await originalTextConfigStorage.getValue();
    let currentEngines = await enginesStorage.getValue();
    let currentInteractionConfig = await interactionConfigStorage.getValue();

    // Auto fix blacklist
    if (currentAutoTranslate.blacklist.includes('.*\\.cn$')) {
        currentAutoTranslate.blacklist = currentAutoTranslate.blacklist.filter(s => s !== '.*\\.cn$');
        await autoTranslateConfigStorage.setValue(currentAutoTranslate);
    }

    // --- Helper: Text Node Replacement ---
    const processTextNode = (textNode: Text, validMatches: { text: string, entry: WordEntry }[]) => {
        const text = textNode.nodeValue;
        if (!text) return;

        // Sort matches by length desc to replace longest first
        validMatches.sort((a, b) => b.text.length - a.text.length);
        const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(${validMatches.map(m => escapeRegExp(m.text)).join('|')})`, 'g');

        const parts = text.split(pattern);
        if (parts.length === 1) return;

        const fragment = document.createDocumentFragment();
        parts.forEach(part => {
             const match = validMatches.find(m => m.text === part);
             if (match) {
                 const span = document.createElement('span');
                 span.className = 'context-lingo-word'; 
                 span.innerHTML = buildReplacementHtml(
                    match.text, 
                    match.entry.text, 
                    match.entry.category,
                    currentStyles,
                    currentOriginalTextConfig,
                    match.entry.id // Pass ID here
                 );
                 fragment.appendChild(span);
             } else {
                 fragment.appendChild(document.createTextNode(part));
             }
        });

        if (textNode.parentNode) {
            textNode.parentNode.replaceChild(fragment, textNode);
        }
    };

    // --- Batch Translation Scheduler with Strict Rate Limiting ---
    class TranslationScheduler {
        private buffer: { block: HTMLElement, sourceText: string }[] = [];
        // The queue holds batches waiting to be sent
        private requestQueue: { combinedText: string, items: { block: HTMLElement, sourceText: string }[] }[] = [];
        private isProcessingQueue = false;
        private timer: ReturnType<typeof setTimeout> | null = null;
        private delimiter = "\n|||\n";
        
        // Settings to optimize throughput while staying under rate limits
        private maxBatchSize = 30; // Max blocks per request (increased)
        private maxCharCount = 3000; // Max chars per request
        private rateLimitDelay = 350; // ms to wait between requests (approx 2.8 QPS)

        add(block: HTMLElement) {
            // Check early to avoid processing already handled blocks
            if (block.hasAttribute('data-context-lingo-scanned')) return;
            
            const sourceText = block.innerText?.trim();
            if (!sourceText || sourceText.length < 2 || !/[\u4e00-\u9fa5]/.test(sourceText)) return;
            
            // Mark as pending immediately to prevent double-add
            block.setAttribute('data-context-lingo-scanned', 'pending');

            this.buffer.push({ block, sourceText });
            this.scheduleFlush();
        }

        private scheduleFlush() {
            // Check limits for the current buffer
            const currentChars = this.buffer.reduce((acc, item) => acc + item.sourceText.length, 0);
            
            if (this.buffer.length >= this.maxBatchSize || currentChars >= this.maxCharCount) {
                if (this.timer) clearTimeout(this.timer);
                this.flushBufferToQueue();
            } else {
                if (!this.timer) {
                    // Wait a bit to collect nearby paragraphs
                    this.timer = setTimeout(() => this.flushBufferToQueue(), 150);
                }
            }
        }

        private flushBufferToQueue() {
            if (this.buffer.length === 0) return;
            if (this.timer) { clearTimeout(this.timer); this.timer = null; }

            // Take current snapshot of buffer and clear it
            const batchItems = this.buffer.splice(0, this.buffer.length);
            const combinedText = batchItems.map(b => b.sourceText).join(this.delimiter);

            // Push to the processing queue (DO NOT SEND YET)
            this.requestQueue.push({ combinedText, items: batchItems });
            
            // Trigger the queue processor
            this.processQueue();
        }

        private async processQueue() {
            // If already running, let it continue. It will pick up new items from the array.
            if (this.isProcessingQueue) return;
            this.isProcessingQueue = true;

            // Process strictly one by one
            while (this.requestQueue.length > 0) {
                const batchRequest = this.requestQueue.shift();
                if (!batchRequest) break;

                const engine = currentEngines.find(e => e.isEnabled);
                if (!engine) {
                    console.warn("ContextLingo: No active engine found.");
                    this.isProcessingQueue = false;
                    return;
                }

                try {
                    const response = await browser.runtime.sendMessage({
                        action: 'TRANSLATE_TEXT',
                        engine: engine,
                        text: batchRequest.combinedText,
                        target: 'en'
                    });

                    if (response.success && response.data.Response?.TargetText) {
                         const fullTranslatedText = response.data.Response.TargetText;
                         // Robust split handling potential whitespace from API
                         const splitPattern = /\s*\|\|\|\s*/;
                         const translatedParts = fullTranslatedText.split(splitPattern);
    
                         batchRequest.items.forEach((item, index) => {
                             const translatedPart = translatedParts[index] || ""; 
                             this.applyTranslation(item.block, item.sourceText, translatedPart);
                         });
                    } else {
                        console.error("ContextLingo: Batch Error", response.error);
                        // Reset status so they might be retried or just ignored
                        batchRequest.items.forEach(item => item.block.setAttribute('data-context-lingo-scanned', 'error'));
                    }
                } catch (e) {
                    console.error("ContextLingo: Queue Processing Failed", e);
                    batchRequest.items.forEach(item => item.block.setAttribute('data-context-lingo-scanned', 'error'));
                }

                // *** CRITICAL RATE LIMITING ***
                // Force a delay before the next request loop to respect QPS limits.
                await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
            }

            this.isProcessingQueue = false;
        }

        private applyTranslation(block: HTMLElement, sourceText: string, translatedText: string) {
            // Verification & Fuzzy Matching logic
            const verifiedEntries = currentEntries.filter(entry => {
                // Simple check: does the English word appear in the translation?
                return translatedText.toLowerCase().includes(entry.text.toLowerCase());
            });

            if (verifiedEntries.length === 0) {
                block.setAttribute('data-context-lingo-scanned', 'skipped_no_en_match');
                return;
            }

            // Find fuzzy matches in the Chinese source text
            const replacementCandidates = findFuzzyMatches(sourceText, verifiedEntries);

            if (replacementCandidates.length > 0) {
                 block.setAttribute('data-context-lingo-scanned', 'true');
                 
                 // Perform replacement on text nodes
                 const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
                 const textNodes: Text[] = [];
                 let node;
                 while(node = walker.nextNode()) textNodes.push(node as Text);

                 textNodes.forEach(tn => {
                     // Skip if already inside a wrapper
                     if (tn.parentElement?.closest('.context-lingo-wrapper')) return;
                     if (tn.parentElement?.closest('.context-lingo-word')) return;
                     processTextNode(tn, replacementCandidates);
                 });
            } else {
                 block.setAttribute('data-context-lingo-scanned', 'skipped_fuzzy_fail');
            }
        }
    }

    const scheduler = new TranslationScheduler();

    // --- Page Scanner ---
    const scanAndTranslatePage = () => {
        // Use TreeWalker to scan text blocks. 
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
             acceptNode: (node) => {
                 const el = node as HTMLElement;
                 const tagsToSkip = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'IMG', 'INPUT', 'TEXTAREA', 'CODE', 'PRE', 'HEAD', 'META', 'BUTTON'];
                 if (tagsToSkip.includes(el.tagName)) return NodeFilter.FILTER_REJECT;
                 
                 if (el.isContentEditable) return NodeFilter.FILTER_REJECT;
                 if (el.closest('[data-context-lingo-container]')) return NodeFilter.FILTER_REJECT;
                 
                 // Skip if already processed or pending
                 if (el.hasAttribute('data-context-lingo-scanned')) return NodeFilter.FILTER_REJECT;

                 // Optimization: Skip invisible elements (basic check)
                 if (el.offsetParent === null) return NodeFilter.FILTER_REJECT;

                 // Check for direct Chinese text nodes
                 let hasDirectChinese = false;
                 for (let i = 0; i < el.childNodes.length; i++) {
                     const n = el.childNodes[i];
                     if (n.nodeType === Node.TEXT_NODE && (n.nodeValue || '').trim().length > 0 && /[\u4e00-\u9fa5]/.test(n.nodeValue || '')) {
                         hasDirectChinese = true;
                         break;
                     }
                 }
                 return hasDirectChinese ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
             }
        });

        while(walker.nextNode()) {
            const block = walker.currentNode as HTMLElement;
            scheduler.add(block);
        }
    };

    // --- Config Check & Init ---
    const hostname = window.location.hostname;
    const isBlacklisted = currentAutoTranslate.blacklist.some(d => hostname.match(new RegExp(d)));
    const isWhitelisted = currentAutoTranslate.whitelist.some(d => hostname.match(new RegExp(d)));
    
    if (isBlacklisted && !isWhitelisted) {
        console.log('ContextLingo: Site blacklisted, skipping.');
        return;
    }

    // Listen for manual triggers
    browser.runtime.onMessage.addListener((message) => {
       if (message.action === 'TRIGGER_TRANSLATION') {
           console.log('ContextLingo: Manual trigger');
           scanAndTranslatePage();
       }
    });

    // Auto Run
    if (isWhitelisted || currentAutoTranslate.enabled) {
        console.log('ContextLingo: Auto-translating...');
        
        // Initial scan
        setTimeout(scanAndTranslatePage, 1000); 

        // Dynamic content observer
        let debounceTimer: ReturnType<typeof setTimeout>;
        const observer = new MutationObserver((mutations) => {
            if (mutations.some(m => m.addedNodes.length > 0)) {
                clearTimeout(debounceTimer);
                // Wait for DOM to settle
                debounceTimer = setTimeout(scanAndTranslatePage, 2000);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- UI Mounting (Widget + Tooltip) ---
    await createShadowRootUi(ctx, {
      name: 'context-lingo-ui',
      position: 'inline',
      onMount: (container) => {
        const wrapper = document.createElement('div');
        wrapper.id = 'context-lingo-app-root';
        wrapper.setAttribute('data-context-lingo-container', 'true');
        container.append(wrapper);
        
        const root = ReactDOM.createRoot(wrapper);
        root.render(
            <React.StrictMode>
                <ContentOverlay 
                    initialWidgetConfig={currentWidgetConfig}
                    initialEntries={currentEntries}
                    initialInteractionConfig={currentInteractionConfig}
                    initialAutoTranslateConfig={currentAutoTranslate}
                />
            </React.StrictMode>
        );
        return root;
      },
      onRemove: (root) => root?.unmount(),
    }).then(ui => ui.mount());

    // Storage watchers are now inside React Component <ContentOverlay> for UI updates
    // But we still need them for the translation logic in this script scope
    stylesStorage.watch((newVal) => { if(newVal) currentStyles = newVal; });
    originalTextConfigStorage.watch((newVal) => { if(newVal) currentOriginalTextConfig = newVal; });
    entriesStorage.watch((newVal) => { if(newVal) currentEntries = newVal; });
    enginesStorage.watch((newVal) => { if(newVal) currentEngines = newVal; });
  },
});
