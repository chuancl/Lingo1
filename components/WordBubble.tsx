
import React, { useEffect, useState, useRef } from 'react';
import { WordEntry, WordInteractionConfig, WordCategory } from '../types';
import { Volume2, Plus, Check } from 'lucide-react';

interface WordBubbleProps {
  entry: WordEntry | null;
  originalText: string;
  targetRect: DOMRect | null;
  config: WordInteractionConfig;
  isVisible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onAddWord: (id: string) => void;
}

export const WordBubble: React.FC<WordBubbleProps> = ({ 
    entry, 
    originalText, 
    targetRect, 
    config, 
    isVisible, 
    onMouseEnter, 
    onMouseLeave,
    onAddWord
}) => {
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [isAdded, setIsAdded] = useState(false);

  // Reset added state when entry changes
  useEffect(() => {
    setIsAdded(false);
  }, [entry?.id]);

  useEffect(() => {
    if (isVisible && targetRect && bubbleRef.current) {
      const bubbleRect = bubbleRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let top = 0;
      let left = 0;
      const gap = 8; // space between bubble and word

      switch (config.bubblePosition) {
          case 'top':
              top = targetRect.top - bubbleRect.height - gap;
              left = targetRect.left + (targetRect.width / 2) - (bubbleRect.width / 2);
              break;
          case 'bottom':
              top = targetRect.bottom + gap;
              left = targetRect.left + (targetRect.width / 2) - (bubbleRect.width / 2);
              break;
          case 'left':
              top = targetRect.top + (targetRect.height / 2) - (bubbleRect.height / 2);
              left = targetRect.left - bubbleRect.width - gap;
              break;
          case 'right':
              top = targetRect.top + (targetRect.height / 2) - (bubbleRect.height / 2);
              left = targetRect.right + gap;
              break;
          default: // fallback to top
              top = targetRect.top - bubbleRect.height - gap;
              left = targetRect.left + (targetRect.width / 2) - (bubbleRect.width / 2);
      }

      // Boundary Checks
      if (left < 10) left = 10;
      if (left + bubbleRect.width > viewportWidth - 10) left = viewportWidth - bubbleRect.width - 10;
      
      if (top < 10) {
          // Flip if overflow top
          if (config.bubblePosition === 'top') top = targetRect.bottom + gap;
          else top = 10;
      }
      if (top + bubbleRect.height > viewportHeight - 10) {
          // Flip if overflow bottom
          if (config.bubblePosition === 'bottom') top = targetRect.top - bubbleRect.height - gap;
          else top = viewportHeight - bubbleRect.height - 10;
      }

      setPosition({ top, left });
    }
  }, [isVisible, targetRect, entry, config.bubblePosition]);

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entry) return;
    const text = entry.text;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = config.autoPronounceAccent === 'UK' ? 'en-GB' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleAdd = (e: React.MouseEvent) => {
      e.stopPropagation();
      if(entry) {
          onAddWord(entry.id);
          setIsAdded(true);
      }
  };

  if (!entry || !isVisible) return null;

  return (
    <div 
      ref={bubbleRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[2147483647] bg-white rounded-lg shadow-xl border border-slate-200 p-5 w-64 text-left transition-opacity duration-200 pointer-events-auto"
      style={{ 
        top: position.top, 
        left: position.left,
        opacity: isVisible ? 1 : 0,
        fontFamily: 'sans-serif'
      }}
    >
        <div className="flex justify-between items-start mb-3 relative">
            <div>
                <h4 className="font-bold text-xl text-slate-900 leading-tight mb-1">{entry.text}</h4>
                {config.showPhonetic && (entry.phoneticUs || entry.phoneticUk) && (
                    <span className="text-xs text-slate-400 font-mono block">
                        {entry.phoneticUs || entry.phoneticUk}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={playAudio} 
                    className="text-slate-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors"
                >
                    <Volume2 className="w-4 h-4"/>
                </button>
                {/* Add to Learning Button */}
                {entry.category !== WordCategory.LearningWord && entry.category !== WordCategory.KnownWord && (
                    <button 
                        onClick={handleAdd}
                        className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${isAdded ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                        title="添加到正在学"
                    >
                        {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                )}
            </div>
        </div>
        
        {config.showDictTranslation && (
            <div className="text-sm text-slate-700 font-medium mb-3 leading-snug">
                {entry.translation}
            </div>
        )}

        {config.showOriginalText && (
            <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md mb-3 border border-slate-100">
                <span className="mr-2 text-slate-400">原文:</span>
                <span className="text-slate-700 font-medium">
                    {originalText || '...'}
                </span>
            </div>
        )}

        {config.showDictExample && entry.dictionaryExample && (
            <div className="text-xs text-slate-600 italic border-l-2 border-blue-400 pl-3 py-0.5 leading-relaxed">
                {entry.dictionaryExample}
            </div>
        )}
    </div>
  );
};
