




import React from 'react';
import { WordInteractionConfig, InteractionTrigger, ModifierKey, MouseAction, BubblePosition } from '../../types';
import { Volume2, Info, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { playTextToSpeech } from '../../utils/audio';

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  return (
    <div className="group relative flex items-center">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg max-w-[200px] whitespace-normal text-center">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
      </div>
    </div>
  );
};

const TriggerInput = ({ label, value, onChange }: { label: string, value: InteractionTrigger, onChange: (val: InteractionTrigger) => void }) => {
  const handleChange = (field: keyof InteractionTrigger, newVal: any) => {
     const updated = { ...value, [field]: newVal };
     if (field !== 'delay') {
        if (updated.modifier === 'None' && updated.action === 'Hover') {
           updated.delay = 600;
        } else {
           updated.delay = 0;
        }
     }
     onChange(updated);
  };

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">{label}</label>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <label className="text-[10px] text-slate-500 mb-1 block">控制键</label>
          <select 
            value={value.modifier} 
            onChange={(e) => handleChange('modifier', e.target.value as ModifierKey)}
            className="w-full text-sm border-slate-300 rounded-lg focus:ring-blue-500"
          >
            <option value="None">无 (None)</option>
            <option value="Alt">Alt</option>
            <option value="Ctrl">Ctrl</option>
            <option value="Shift">Shift</option>
            <option value="Meta">Command / Win</option>
          </select>
        </div>
        <span className="text-slate-300 pt-4">+</span>
        <div className="flex-1">
           <label className="text-[10px] text-slate-500 mb-1 block">鼠标动作</label>
           <select 
             value={value.action} 
             onChange={(e) => handleChange('action', e.target.value as MouseAction)}
             className="w-full text-sm border-slate-300 rounded-lg focus:ring-blue-500"
           >
             <option value="Hover">悬浮 (Hover)</option>
             <option value="Click">单击 (Click)</option>
             <option value="DoubleClick">双击 (Double)</option>
             <option value="RightClick">右键 (Right)</option>
           </select>
        </div>
        <span className="text-slate-300 pt-4">@</span>
        <div className="w-20">
           <div className="flex items-center mb-1 gap-1">
              <label className="text-[10px] text-slate-500 block">延迟 (ms)</label>
              <Tooltip text="仅在鼠标悬浮时建议设置延迟，避免误触。">
                 <Info className="w-3 h-3 text-slate-400 cursor-help" />
              </Tooltip>
           </div>
           <input 
             type="number" 
             step="100" min="0" 
             value={value.delay} 
             onChange={(e) => handleChange('delay', parseInt(e.target.value))}
             className="w-full text-sm border-slate-300 rounded-lg focus:ring-blue-500"
           />
        </div>
      </div>
    </div>
  );
};

interface InteractionSectionProps {
  config: WordInteractionConfig;
  setConfig: React.Dispatch<React.SetStateAction<WordInteractionConfig>>;
}

export const InteractionSection: React.FC<InteractionSectionProps> = ({ config, setConfig }) => {
  
  // Dynamic positioning for the preview bubble
  const getPreviewPositionClass = (pos: BubblePosition) => {
     switch(pos) {
         case 'top': return 'bottom-full left-1/2 -translate-x-1/2 mb-3';
         case 'bottom': return 'top-full left-1/2 -translate-x-1/2 mt-3';
         case 'left': return 'right-full top-1/2 -translate-y-1/2 mr-3';
         case 'right': return 'left-full top-1/2 -translate-y-1/2 ml-3';
         default: return 'bottom-full left-1/2 -translate-x-1/2 mb-3';
     }
  };

  const getArrowClass = (pos: BubblePosition) => {
     switch(pos) {
         case 'top': return 'bottom-[-6px] left-[calc(50%-6px)] border-b-transparent border-r-transparent';
         case 'bottom': return 'top-[-6px] left-[calc(50%-6px)] border-t-transparent border-l-transparent';
         case 'left': return 'right-[-6px] top-[calc(50%-6px)] border-b-transparent border-l-transparent';
         case 'right': return 'left-[-6px] top-[calc(50%-6px)] border-t-transparent border-r-transparent';
         default: return 'bottom-[-6px] left-[calc(50%-6px)]';
     }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">单词交互气泡</h2>
          <p className="text-sm text-slate-500">当鼠标与页面上被替换的单词交互时触发。</p>
        </div>
        
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <TriggerInput 
                    label="主触发方式 (查词弹窗)" 
                    value={config.mainTrigger} 
                    onChange={(val) => setConfig({...config, mainTrigger: val})}
                />

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">气泡位置</label>
                    <div className="flex gap-2">
                        {(['top', 'bottom', 'left', 'right'] as BubblePosition[]).map(pos => (
                             <button
                                key={pos}
                                onClick={() => setConfig({...config, bubblePosition: pos})}
                                className={`flex-1 py-2 rounded-lg border flex flex-col items-center justify-center transition-all ${config.bubblePosition === pos ? 'bg-blue-50 border-blue-200 text-blue-600 font-bold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                             >
                                 {pos === 'top' && <ArrowUp className="w-4 h-4 mb-1"/>}
                                 {pos === 'bottom' && <ArrowDown className="w-4 h-4 mb-1"/>}
                                 {pos === 'left' && <ArrowLeft className="w-4 h-4 mb-1"/>}
                                 {pos === 'right' && <ArrowRight className="w-4 h-4 mb-1"/>}
                                 <span className="text-xs capitalize">{pos}</span>
                             </button>
                        ))}
                    </div>
                </div>

                <TriggerInput 
                    label="快速添加 (至正在学)" 
                    value={config.quickAddTrigger} 
                    onChange={(val) => setConfig({...config, quickAddTrigger: val})}
                />

                {/* Auto Pronounce Settings */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">自动朗读设置</label>
                   <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 mb-1 block">默认口音</label>
                        <select 
                          value={config.autoPronounceAccent} 
                          onChange={(e) => setConfig({...config, autoPronounceAccent: e.target.value as 'US' | 'UK'})}
                          className="w-full text-sm border-slate-300 rounded-lg focus:ring-blue-500"
                        >
                          <option value="US">美式 (US)</option>
                          <option value="UK">英式 (UK)</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 mb-1 block">气泡显示时朗读次数</label>
                        <div className="flex items-center">
                           <input 
                             type="number" 
                             min="0"
                             max="5"
                             value={config.autoPronounceCount} 
                             onChange={(e) => setConfig({...config, autoPronounceCount: parseInt(e.target.value), autoPronounce: parseInt(e.target.value) > 0})}
                             className="w-full text-sm border-slate-300 rounded-lg focus:ring-blue-500"
                           />
                        </div>
                      </div>
                   </div>
                   <p className="text-[10px] text-slate-400 mt-2">* 设置为 0 则不自动朗读。</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">气泡内容展示</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={config.showPhonetic} onChange={e => setConfig({...config, showPhonetic: e.target.checked})} className="rounded text-blue-600 mr-3"/>
                        <span className="text-sm">显示音标</span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={config.showOriginalText} onChange={e => setConfig({...config, showOriginalText: e.target.checked})} className="rounded text-blue-600 mr-3"/>
                        <span className="text-sm">显示原中文</span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={config.showDictExample} onChange={e => setConfig({...config, showDictExample: e.target.checked})} className="rounded text-blue-600 mr-3"/>
                        <span className="text-sm">显示例句</span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={config.showDictTranslation} onChange={e => setConfig({...config, showDictTranslation: e.target.checked})} className="rounded text-blue-600 mr-3"/>
                        <span className="text-sm">显示释义</span>
                    </label>
                  </div>
              </div>
           </div>

           {/* Preview Bubble */}
           <div className="flex flex-col">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">样式预览</h3>
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-8 flex items-center justify-center relative overflow-hidden min-h-[300px]">
                 <div className="absolute inset-0 grid grid-cols-[1fr_20px_1fr] grid-rows-[1fr_20px_1fr] opacity-5">
                    <div className="border-r border-slate-900 col-start-2 row-span-3"></div>
                    <div className="border-b border-slate-900 row-start-2 col-span-3"></div>
                 </div>
                 
                 <div className="relative">
                    <span className="text-xl font-serif text-slate-800 cursor-pointer border-b-2 border-red-200">ephemeral</span>
                    
                    {/* The Bubble - Dynamically Positioned */}
                    <div className={`absolute w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-5 z-10 transition-all duration-300 ${getPreviewPositionClass(config.bubblePosition)}`}>
                       
                       {/* Arrow - Dynamically Positioned */}
                       <div className={`absolute w-3 h-3 bg-white border border-slate-200 transform rotate-45 z-[-1] ${getArrowClass(config.bubblePosition)}`}></div>

                       <div className="flex justify-between items-start mb-3">
                          <div>
                             <h4 className="font-bold text-xl text-slate-900 leading-tight mb-1">ephemeral</h4>
                             {config.showPhonetic && <span className="text-xs text-slate-400 font-mono block">/əˈfem(ə)rəl/</span>}
                          </div>
                          <div className="flex gap-2">
                             <button 
                                 className="text-slate-400 hover:text-blue-600 p-1.5 rounded-full transition-colors bg-transparent"
                                 onClick={() => playTextToSpeech("ephemeral", config.autoPronounceAccent, 1.0, 1)}
                                 title="点击播放"
                             >
                                 <Volume2 className="w-4 h-4"/>
                             </button>
                             <button 
                                 className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-full transition-colors"
                                 title="添加到正在学"
                             >
                                 <Plus className="w-4 h-4"/>
                             </button>
                          </div>
                       </div>
                       
                       {config.showDictTranslation && (
                          <div className="text-sm text-slate-700 font-medium mb-3 leading-snug">adj. 短暂的；朝生暮死的</div>
                       )}

                       {config.showOriginalText && (
                          <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md mb-3 border border-slate-100">
                             <span className="mr-2 text-slate-400">原文:</span>
                             <span className="text-slate-700 font-medium">短暂的</span>
                          </div>
                       )}

                       {config.showDictExample && (
                          <div className="text-xs text-slate-600 italic border-l-2 border-blue-400 pl-3 py-0.5 leading-relaxed cursor-pointer hover:text-blue-600" onClick={() => playTextToSpeech("Her success was ephemeral", config.autoPronounceAccent)}>
                             Her success was ephemeral.
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
    </section>
  );
};
