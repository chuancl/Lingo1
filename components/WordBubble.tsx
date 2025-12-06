
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
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
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

      // Initial positioning based on preference
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
          default:
              top = targetRect.top - bubbleRect.height - gap;
              left = targetRect.left + (targetRect.width / 2) - (bubbleRect.width / 2);
      }

      // Horizontal Boundary Check (Clamp)
      if (left < 10) left = 10;
      if (left + bubbleRect.width > viewportWidth - 10) left = viewportWidth - bubbleRect.width - 10;
      
      // Vertical Boundary Check (Flip or Clamp)
      if (config.bubblePosition === 'bottom') {
          // If strictly bottom preference, try to stay bottom unless totally offscreen
          if (top + bubbleRect.height > viewportHeight - 10) {
             // Overflowing bottom. Check if top has space.
             const spaceTop = targetRect.top - gap - 10;
             if (spaceTop > bubbleRect.height) {
                 // Flip to top
                 top = targetRect.top - bubbleRect.height - gap;
             } else {
                 // Both sides tight? Clamp to bottom edge
                 top = viewportHeight - bubbleRect.height - 10;
             }
          }
      } else if (config.bubblePosition === 'top') {
          if (top < 10) {
              // Overflowing top. Check bottom space.
              const spaceBottom = viewportHeight - (targetRect.bottom + gap) - 10;
              if (spaceBottom > bubbleRect.height) {
                  // Flip to bottom
                  top = targetRect.bottom + gap;
              } else {
                  top = 10; // Clamp top
              }
          }
      } else {
          // Left/Right: just clamp vertical
          if (top < 10) top = 10;
          if (top + bubbleRect.height > viewportHeight - 10) top = viewportHeight - bubbleRect.height - 10;
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
      className="fixed z-[2147483647] bg-white rounded-lg shadow-xl border border-slate-200 text-left transition-opacity duration-200 pointer-events-auto box-border"
      style={{ 
        top: position?.top ?? -9999, 
        left: position?.left ?? -9999,
        opacity: position ? 1 : 0,
        width: '260px',
        padding: '20px',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
        color: '#0f172a'
      }}
    >
        {/* Header */}
        <div className="flex justify-between items-start mb-[12px] relative leading-none">
            <div>
                <h4 className="font-bold text-slate-900 leading-tight mb-[4px]" style={{ fontSize: '20px', margin: 0, marginBottom: '4px' }}>{entry.text}</h4>
                {config.showPhonetic && (entry.phoneticUs || entry.phoneticUk) && (
                    <span className="text-slate-400 font-mono block" style={{ fontSize: '12px' }}>
                        {entry.phoneticUs || entry.phoneticUk}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-[8px]">
                <button 
                    onClick={playAudio} 
                    className="text-slate-400 hover:text-blue-600 rounded-full hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer"
                    style={{ padding: '6px', border: 'none', background: 'transparent' }}
                >
                    <Volume2 style={{ width: '16px', height: '16px' }}/>
                </button>
                {/* Add to Learning Button */}
                {entry.category !== WordCategory.LearningWord && entry.category !== WordCategory.KnownWord && (
                    <button 
                        onClick={handleAdd}
                        className={`rounded-full transition-colors flex items-center justify-center cursor-pointer ${isAdded ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                        style={{ padding: '6px', border: 'none' }}
                        title="添加到正在学"
                    >
                        {isAdded ? <Check style={{ width: '16px', height: '16px' }} /> : <Plus style={{ width: '16px', height: '16px' }} />}
                    </button>
                )}
            </div>
        </div>
        
        {config.showDictTranslation && (
            <div className="text-slate-700 font-medium mb-[12px] leading-snug" style={{ fontSize: '14px' }}>
                {entry.translation}
            </div>
        )}

        {config.showOriginalText && (
            <div className="flex items-center text-slate-500 bg-slate-50 rounded-md mb-[12px] border border-slate-100 box-border" style={{ fontSize: '12px', padding: '6px 12px' }}>
                <span className="mr-[8px] text-slate-400 select-none">原文:</span>
                <span className="text-slate-700 font-medium select-text">
                    {originalText || '...'}
                </span>
            </div>
        )}

        {config.showDictExample && entry.dictionaryExample && (
            <div className="text-slate-600 italic border-l-2 border-blue-400 box-border" style={{ fontSize: '12px', paddingLeft: '12px', lineHeight: '1.6' }}>
                {entry.dictionaryExample}
            </div>
        )}
    </div>
  );
};
