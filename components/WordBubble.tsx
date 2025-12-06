
import React, { useEffect, useState, useRef } from 'react';
import { WordEntry, WordInteractionConfig } from '../types';
import { Volume2, ExternalLink } from 'lucide-react';

interface WordBubbleProps {
  entry: WordEntry | null;
  targetRect: DOMRect | null;
  config: WordInteractionConfig;
  isVisible: boolean;
}

export const WordBubble: React.FC<WordBubbleProps> = ({ entry, targetRect, config, isVisible }) => {
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && targetRect && bubbleRef.current) {
      const bubbleRect = bubbleRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // Calculate center position
      let left = targetRect.left + (targetRect.width / 2) - (bubbleRect.width / 2);
      
      // Prevent overflow left/right
      if (left < 10) left = 10;
      if (left + bubbleRect.width > viewportWidth - 10) left = viewportWidth - bubbleRect.width - 10;

      // Position above by default, below if not enough space
      let top = targetRect.top - bubbleRect.height - 10;
      if (top < 10) {
        top = targetRect.bottom + 10;
      }

      setPosition({ top, left });
    }
  }, [isVisible, targetRect, entry]);

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entry) return;
    const text = entry.text;
    // Simple TTS fallback or use entry.phoneticUrl if available in future
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = config.autoPronounceAccent === 'UK' ? 'en-GB' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  if (!entry || !isVisible) return null;

  return (
    <div 
      ref={bubbleRef}
      className="fixed z-[2147483647] bg-white rounded-lg shadow-xl border border-slate-200 p-4 w-64 text-left transition-opacity duration-200 pointer-events-none"
      style={{ 
        top: position.top, 
        left: position.left,
        opacity: isVisible ? 1 : 0,
        fontFamily: 'sans-serif'
      }}
    >
        <div className="flex justify-between items-start mb-2">
            <div>
                <h4 className="font-bold text-lg text-slate-900 leading-tight">{entry.text}</h4>
                {config.showPhonetic && (entry.phoneticUs || entry.phoneticUk) && (
                    <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                        {entry.phoneticUs || entry.phoneticUk}
                    </span>
                )}
            </div>
            <button 
                onClick={playAudio} 
                className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 pointer-events-auto transition-colors"
            >
                <Volume2 className="w-4 h-4"/>
            </button>
        </div>
        
        {config.showDictTranslation && (
            <div className="text-sm text-slate-700 font-medium mb-2 leading-snug">
                {entry.translation}
            </div>
        )}

        {config.showOriginalText && (
            <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded mb-2 border border-slate-100">
                原文: <span className="text-slate-700 font-medium">
                    {/* Note: We don't have exact original text here unless we pass it, 
                        using translation or context matching logic would be ideal, 
                        but for now displaying what we replaced or context hint if needed */}
                    {/* In a real scenario, we might pass the specific original Chinese word that was replaced via props */}
                    (当前位置原文)
                </span>
            </div>
        )}

        {config.showDictExample && entry.dictionaryExample && (
            <div className="text-xs text-slate-600 italic border-l-2 border-blue-400 pl-2 mt-2 leading-relaxed">
                {entry.dictionaryExample}
            </div>
        )}

        {/* Pointer Arrow logic could be added here, but complex with dynamic positioning */}
    </div>
  );
};
