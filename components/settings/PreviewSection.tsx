
import React, { useState } from 'react';
import { TranslationEngine, WordEntry, StyleConfig, WordCategory, OriginalTextConfig } from '../../types';
import { RefreshCw, Play, AlertCircle, Zap } from 'lucide-react';
import { callTencentTranslation } from '../../utils/api';
import { findFuzzyMatches } from '../../utils/matching';
import { buildReplacementHtml } from '../../utils/dom-builder';

interface PreviewSectionProps {
    engines: TranslationEngine[];
    entries: WordEntry[];
    styles: Record<WordCategory, StyleConfig>;
    originalTextConfig: OriginalTextConfig;
}

export const PreviewSection: React.FC<PreviewSectionProps> = ({ engines, entries, styles, originalTextConfig }) => {
    const [inputText, setInputText] = useState("我非常喜欢吃苹果，因为它们很健康。");
    const [translatedText, setTranslatedText] = useState("");
    const [replacementResult, setReplacementResult] = useState<React.ReactNode>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGeneratePreview = async () => {
        setIsLoading(true);
        setError(null);
        setTranslatedText("");
        setReplacementResult(null);

        try {
            const activeEngine = engines.find(e => e.isEnabled);
            if (!activeEngine) throw new Error("请先启用一个翻译引擎");

            // STEP 1: API Call (Full Translation)
            let apiResult = "";
            if (activeEngine.id === 'tencent') {
                const res = await callTencentTranslation(activeEngine, inputText, 'en');
                apiResult = res.Response?.TargetText || "";
            } else {
                 apiResult = "Simulated: I really like eating apples because they are healthy.";
            }
            setTranslatedText(apiResult);

            if (!apiResult) {
                setReplacementResult(<span>{inputText}</span>);
                return;
            }

            // STEP 2: English Verification (Context Check)
            const verifiedEntries = entries.filter(e => {
                const engWord = e.text.toLowerCase();
                return apiResult.toLowerCase().includes(engWord);
            });

            // STEP 3: Chinese Alignment & Fuzzy Matching (Using Shared Logic)
            const finalMatches = findFuzzyMatches(inputText, verifiedEntries);

            // STEP 4: Render
            const sortedEntries = finalMatches.sort((a, b) => b.text.length - a.text.length);
            
            if (sortedEntries.length === 0) {
                 setReplacementResult(<span>{inputText}</span>);
                 return;
            }

            const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`(${sortedEntries.map(e => escapeRegExp(e.text)).join('|')})`, 'g');
            const parts = inputText.split(pattern);
            
            const result = parts.map((part, idx) => {
                const match = sortedEntries.find(e => e.text === part);
                if (match) {
                     // Using buildReplacementHtml to ensure preview matches actual content script logic exactly
                     const html = buildReplacementHtml(
                         match.text,
                         match.entry.text,
                         match.entry.category,
                         styles,
                         originalTextConfig,
                         match.entry.id
                     );
                     
                     return <span key={idx} dangerouslySetInnerHTML={{__html: html}}></span>;
                }
                return <span key={idx}>{part}</span>;
            });

            setReplacementResult(<div>{result}</div>);

        } catch (err: any) {
            setError(err.message || "生成预览失败");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="border-t border-slate-200 bg-slate-50 p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-amber-500" />
                真实效果预览 (API Context Verification)
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">输入中文文本</label>
                    <textarea 
                        className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 h-32"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder="输入一段包含你词库中单词的中文文本..."
                    />
                    <div className="flex justify-between items-center">
                         <span className="text-xs text-slate-400">提示: 只有 API 译文中出现了词库里的英文词，才会执行替换。</span>
                         <button 
                            onClick={handleGeneratePreview}
                            disabled={isLoading}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                         >
                            {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <Play className="w-4 h-4 mr-2 fill-current"/>}
                            生成预览
                         </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">引擎翻译结果 (English for Validation)</label>
                         <div className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 min-h-[3rem] shadow-sm">
                             {translatedText || <span className="text-slate-300 italic">等待 API 响应...</span>}
                         </div>
                    </div>
                    <div>
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">插件替换效果 (Mixed Content)</label>
                         <div className="p-4 bg-white border border-slate-200 rounded-lg text-base leading-relaxed text-slate-800 min-h-[5rem] shadow-sm">
                             {replacementResult || <span className="text-slate-300 italic">等待生成...</span>}
                         </div>
                    </div>
                    {error && (
                        <div className="flex items-center text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
