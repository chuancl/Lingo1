
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { WordCategory, WordEntry, MergeStrategyConfig, WordTab, Scenario } from '../types';
import { DEFAULT_MERGE_STRATEGY } from '../constants';
import { Upload, Download, Filter, Settings2, List, Search, Plus, Trash2, CheckSquare, Square, ArrowRight, BookOpen, GraduationCap, CheckCircle, RotateCcw, HelpCircle } from 'lucide-react';
import { MergeConfigModal } from './word-manager/MergeConfigModal';
import { AddWordModal } from './word-manager/AddWordModal';
import { WordList } from './word-manager/WordList';
import { Toast, ToastMessage } from './ui/Toast';
import { entriesStorage, enginesStorage } from '../utils/storage';
import { fetchWordDetails } from '../utils/dictionary-service';

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  return (
    <div className="group relative flex items-center">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 whitespace-pre-line text-center">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
      </div>
    </div>
  );
};

interface WordManagerProps {
  scenarios: Scenario[];
  entries: WordEntry[];
  setEntries: React.Dispatch<React.SetStateAction<WordEntry[]>>;
  ttsSpeed?: number;
}

export const WordManager: React.FC<WordManagerProps> = ({ scenarios, entries, setEntries, ttsSpeed = 1.0 }) => {
  const [activeTab, setActiveTab] = useState<WordTab>('all');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());

  // Modal States
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Configs
  const [showConfig, setShowConfig] = useState({
    showPhonetic: true,
    showMeaning: true,
  });
  const [mergeConfig, setMergeConfig] = useState<MergeStrategyConfig>(DEFAULT_MERGE_STRATEGY);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedWords(new Set());
  }, [activeTab, selectedScenarioId]);

  useEffect(() => {
    if (selectedScenarioId !== 'all' && !scenarios.find(s => s.id === selectedScenarioId)) {
      setSelectedScenarioId('all');
    }
  }, [scenarios, selectedScenarioId]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
      setToast({ id: Date.now(), message, type });
  };

  // Helper: Check if word exists in Known (Text + Translation must match strictly for the "Same Word" concept)
  const existsInKnown = (text: string, translation: string) => {
      return entries.some(e => 
          e.category === WordCategory.KnownWord && 
          e.text.toLowerCase().trim() === text.toLowerCase().trim() &&
          e.translation?.trim() === translation.trim()
      );
  };

  // Helper: Check if word exists in WantToLearn or Learning
  const findInLearningOrWant = (text: string, translation: string) => {
      return entries.find(e => 
          (e.category === WordCategory.WantToLearnWord || e.category === WordCategory.LearningWord) && 
          e.text.toLowerCase().trim() === text.toLowerCase().trim() &&
          e.translation?.trim() === translation.trim()
      );
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      // 1. Tab Filtering Logic
      if (activeTab !== 'all') {
        if (activeTab === WordCategory.WantToLearnWord) {
           // Rule: "Learning is a subset of WantToLearn". 
           // So if tab is WantToLearn, show both WantToLearn AND Learning.
           if (e.category !== WordCategory.WantToLearnWord && e.category !== WordCategory.LearningWord) return false;
        } else {
           // For Known and Learning tabs, show strictly their category
           if (e.category !== activeTab) return false;
        }
      }

      // 2. Scenario Filtering
      if (selectedScenarioId !== 'all') {
         if (e.scenarioId !== selectedScenarioId) return false;
      }

      // 3. Search Filtering
      if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        const matchText = e.text.toLowerCase().includes(lowerQ);
        const matchTrans = e.translation?.includes(lowerQ) || false;
        if (!matchText && !matchTrans) return false;
      }
      return true; 
    });
  }, [entries, activeTab, selectedScenarioId, searchQuery]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, WordEntry[]> = {};
    
    filteredEntries.forEach(entry => {
      let key = entry.text.toLowerCase().trim();
      if (mergeConfig.strategy === 'by_word_and_meaning') {
        key = `${key}::${entry.translation?.trim()}`;
      }
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });

    const sortedGroups = Object.values(groups).map(group => {
       return group.sort((a, b) => b.addedAt - a.addedAt);
    });

    return sortedGroups.sort((a, b) => {
       const maxA = a[0].addedAt; 
       const maxB = b[0].addedAt;
       return maxB - maxA;
    });
  }, [filteredEntries, mergeConfig.strategy]);

  const allVisibleIds = useMemo(() => filteredEntries.map(e => e.id), [filteredEntries]);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedWords.has(id));
  const isAllWordsTab = activeTab === 'all';

  const toggleSelectAll = () => {
    if (allSelected) {
      const newSet = new Set(selectedWords);
      allVisibleIds.forEach(id => newSet.delete(id));
      setSelectedWords(newSet);
    } else {
      const newSet = new Set(selectedWords);
      allVisibleIds.forEach(id => newSet.add(id));
      setSelectedWords(newSet);
    }
  };

  const toggleSelectGroup = (group: WordEntry[]) => {
    const newSet = new Set(selectedWords);
    const groupIds = group.map(g => g.id);
    const isGroupSelected = groupIds.every(id => newSet.has(id));

    if (isGroupSelected) {
      groupIds.forEach(id => newSet.delete(id));
    } else {
      groupIds.forEach(id => newSet.add(id));
    }
    setSelectedWords(newSet);
  };

  const isGroupSelected = (group: WordEntry[]) => {
    return group.every(e => selectedWords.has(e.id));
  };

  const handleDeleteSelected = () => {
    if (confirm(`确定从当前列表删除选中的 ${selectedWords.size} 个单词吗？`)) {
      setEntries(prev => prev.filter(e => !selectedWords.has(e.id)));
      setSelectedWords(new Set());
      showToast('删除成功', 'success');
    }
  };

  const handleBatchMove = (targetCategory: WordCategory) => {
      if (selectedWords.size === 0) return;
      
      const newEntries = entries.map(e => {
          if (selectedWords.has(e.id)) {
              return { ...e, category: targetCategory };
          }
          return e;
      });
      setEntries(newEntries);
      setSelectedWords(new Set()); // Clear selection after move
      showToast('移动成功', 'success');
  };

  const handleExport = () => {
     let dataToExport: WordEntry[];
     if (selectedWords.size > 0) {
        dataToExport = entries.filter(e => selectedWords.has(e.id));
     } else {
        dataToExport = filteredEntries;
     }

     if (dataToExport.length === 0) {
        showToast('当前列表为空，无法导出', 'warning');
        return;
     }

     const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     const prefix = selectedWords.size > 0 ? 'selected' : activeTab;
     a.download = `contextlingo_export_${prefix}_${dataToExport.length}words_${Date.now()}.json`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
     showToast(`成功导出 ${dataToExport.length} 个单词`, 'success');
  };

  const triggerImport = () => {
     if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;

     const reader = new FileReader();
     reader.onload = async (event) => {
        const text = event.target?.result as string;
        let candidates: { text: string, translation?: string }[] = [];
        
        try {
           // Try JSON first
           const json = JSON.parse(text);
           if (Array.isArray(json)) {
               // Supports simple [{"text": "apple", "translation": "苹果"}] or just [{"text": "apple"}]
               candidates = json.map(item => ({ text: item.text, translation: item.translation || item.preferredTranslation }));
           }
        } catch (err) {
           // Fallback to TXT
           // Supports: "apple, banana, orange" OR "apple 苹果, banana 香蕉"
           // Split by common delimiters: newline, comma, Chinese comma
           const parts = text.split(/[\n,，]+/).filter(p => p.trim());
           
           candidates = parts.map(part => {
               const cleaned = part.trim();
               // Regex to find "EnglishWord [Spaces] ChineseTranslation"
               // Looks for English part at start, optional space, then Chinese/Other part
               const match = cleaned.match(/^([a-zA-Z0-9\-\s]+?)(?:\s+([\u4e00-\u9fa5].*))?$/);
               if (match) {
                   return {
                       text: match[1].trim(),
                       translation: match[2]?.trim()
                   };
               }
               // If no chinese found, assume whole thing is word
               return { text: cleaned };
           });
        }

        const targetCategory = activeTab === 'all' ? WordCategory.WantToLearnWord : activeTab;
        const engines = await enginesStorage.getValue();
        const activeEngine = engines.find(e => e.isEnabled);
        
        if (!activeEngine) {
            showToast("未启用任何翻译引擎，无法完成智能导入", "error");
            return;
        }

        // Process in batches or sequential to avoid rate limits? 
        // For now, sequential to be safe with AI engines.
        let successCount = 0;
        let conflictCount = 0;
        let duplicateCount = 0;
        let failCount = 0;

        showToast(`开始处理 ${candidates.length} 个单词，请稍候...`, 'info');

        const newEntriesToAdd: WordEntry[] = [];

        // We process import by reusing the logic: fetch details -> check existence -> add
        for (const candidate of candidates) {
            if (!candidate.text) continue;
            
            try {
                // 1. Fetch details
                const detailsList = await fetchWordDetails(candidate.text, candidate.translation, activeEngine);

                for (const details of detailsList) {
                     if (!details.text || !details.translation) continue;

                     // 2. Check Exclusivity (Known vs Learning/Want)
                     if (targetCategory === WordCategory.WantToLearnWord || targetCategory === WordCategory.LearningWord) {
                        if (existsInKnown(details.text, details.translation)) {
                            conflictCount++;
                            continue;
                        }
                     } else if (targetCategory === WordCategory.KnownWord) {
                        const existing = findInLearningOrWant(details.text, details.translation);
                        if (existing) {
                            conflictCount++;
                            continue;
                        }
                     }

                     // 3. Check Duplicate in current list
                     const existsInTarget = entries.some(e => 
                        e.category === targetCategory && 
                        e.text.toLowerCase().trim() === details.text!.toLowerCase().trim() &&
                        e.translation?.trim() === details.translation!.trim()
                     ) || newEntriesToAdd.some(e => 
                        e.category === targetCategory && 
                        e.text.toLowerCase().trim() === details.text!.toLowerCase().trim() &&
                        e.translation?.trim() === details.translation!.trim()
                     );

                     if (existsInTarget) {
                         duplicateCount++;
                         continue;
                     }

                     newEntriesToAdd.push({
                        id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        text: details.text!,
                        translation: details.translation!,
                        phoneticUs: details.phoneticUs,
                        phoneticUk: details.phoneticUk,
                        contextSentence: details.contextSentence,
                        mixedSentence: details.mixedSentence,
                        dictionaryExample: details.dictionaryExample,
                        category: targetCategory,
                        addedAt: Date.now(),
                        scenarioId: selectedScenarioId === 'all' ? '1' : selectedScenarioId,
                     });
                     successCount++;
                }

            } catch (err) {
                console.error(`Failed to import ${candidate.text}:`, err);
                failCount++;
            }
        }

        if (newEntriesToAdd.length > 0) {
            setEntries(prev => [...prev, ...newEntriesToAdd]);
            showToast(`导入完成: 成功 ${successCount}, 重复 ${duplicateCount}, 互斥跳过 ${conflictCount}, 失败 ${failCount}`, 'success');
        } else {
             showToast(`导入结束，未添加任何新词 (重复/互斥/失败)`, 'warning');
        }
     };
     reader.readAsText(file);
     e.target.value = ''; 
  };

  const handleAddWord = async (text: string, translation: string) => {
     const engines = await enginesStorage.getValue();
     const activeEngine = engines.find(e => e.isEnabled);

     if (!activeEngine) {
         showToast("请先在设置中启用一个翻译引擎", "error");
         setIsAddModalOpen(false); // Close modal
         return;
     }

     try {
         // 1. Call Dictionary Service
         const detailsList = await fetchWordDetails(text, translation, activeEngine);

         if (detailsList.length === 0) {
             showToast("未能获取该单词的详细信息", "error");
             setIsAddModalOpen(false);
             return;
         }

         const targetCategory = activeTab === 'all' ? WordCategory.WantToLearnWord : activeTab;
         const newEntriesToAdd: WordEntry[] = [];
         let conflictCount = 0;
         let duplicateCount = 0;

         for (const details of detailsList) {
             if (!details.text || !details.translation) continue;

             // 2. Logic for adding to Want/Learning -> Check Known
             if (targetCategory === WordCategory.WantToLearnWord || targetCategory === WordCategory.LearningWord) {
                 if (existsInKnown(details.text, details.translation)) {
                     conflictCount++;
                     continue;
                 }
             }
             
             // 3. Logic for adding to Known -> Check Want/Learning
             if (targetCategory === WordCategory.KnownWord) {
                 const existing = findInLearningOrWant(details.text, details.translation);
                 if (existing) {
                     conflictCount++;
                     continue;
                 }
             }
             
             // 4. Check duplicate in current category
             const existsInTarget = entries.some(e => 
                e.category === targetCategory && 
                e.text.toLowerCase().trim() === details.text!.toLowerCase().trim() &&
                e.translation?.trim() === details.translation!.trim()
             );
             if (existsInTarget) {
                 duplicateCount++;
                 continue;
             }

             // Add entry
             newEntriesToAdd.push({
                id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                text: details.text,
                translation: details.translation,
                phoneticUs: details.phoneticUs,
                phoneticUk: details.phoneticUk,
                contextSentence: details.contextSentence,
                mixedSentence: details.mixedSentence,
                dictionaryExample: details.dictionaryExample,
                category: targetCategory,
                addedAt: Date.now(),
                scenarioId: selectedScenarioId === 'all' ? '1' : selectedScenarioId,
             });
         }

         setIsAddModalOpen(false);

         if (newEntriesToAdd.length > 0) {
             setEntries(prev => [...newEntriesToAdd, ...prev]);
             if (conflictCount > 0 || duplicateCount > 0) {
                 showToast(`成功添加 ${newEntriesToAdd.length} 个含义 (跳过: ${conflictCount + duplicateCount})`, 'success');
             } else {
                 showToast('添加成功', 'success');
             }
         } else {
             if (conflictCount > 0) {
                 showToast(`未添加: 单词已存在于其他列表 (请检查"已掌握"或"正在学")`, 'warning');
             } else if (duplicateCount > 0) {
                 showToast(`未添加: 单词已在当前列表中`, 'warning');
             }
         }

     } catch (err: any) {
         console.error(err);
         setIsAddModalOpen(false);
         showToast(`查询失败: ${err.message}`, 'error');
     }
  };

  const handleDragStart = (index: number) => setDraggedItemIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newOrder = [...mergeConfig.exampleOrder];
    const draggedItem = newOrder[draggedItemIndex];
    newOrder.splice(draggedItemIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setMergeConfig({ ...mergeConfig, exampleOrder: newOrder });
    setDraggedItemIndex(index);
  };
  const handleDragEnd = () => setDraggedItemIndex(null);
  
  const getTabLabel = (tab: WordTab) => tab === 'all' ? '所有单词' : tab;

  const importTooltip = `
支持格式:
1. JSON: [{"text": "apple", "translation": "苹果"}]
2. TXT (逗号分隔): apple, banana, orange
3. TXT (空格+中文): apple 苹果, banana 香蕉
  `;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col relative min-h-[600px]">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json,.txt" onChange={handleImportFile} />

      {/* Global Toast Container */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="border-b border-slate-200 px-6 py-5 bg-slate-50 rounded-t-xl flex justify-between items-center flex-wrap gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-800">词汇库管理</h2>
           <p className="text-sm text-slate-500 mt-1">管理、筛选及编辑您的个性化词库</p>
        </div>
        <div>
           <Tooltip text="配置合并策略、显示内容及顺序">
              <button 
                onClick={() => setIsMergeModalOpen(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm shadow-blue-200"
              >
                <Settings2 className="w-4 h-4 mr-2" /> 显示配置
              </button>
           </Tooltip>
        </div>
      </div>
      
      <AddWordModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onConfirm={handleAddWord} 
      />

      <MergeConfigModal 
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        mergeConfig={mergeConfig}
        setMergeConfig={setMergeConfig}
        showConfig={showConfig}
        setShowConfig={setShowConfig}
        handleDragStart={handleDragStart}
        handleDragOver={handleDragOver}
        handleDragEnd={handleDragEnd}
        draggedItemIndex={draggedItemIndex}
      />

      <div className="border-b border-slate-200 bg-white p-4 space-y-4">
        {/* Tab Selection */}
        <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
          {(['all', ...Object.values(WordCategory)] as WordTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all flex items-center ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab === 'all' && <List className="w-4 h-4 mr-2" />}
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
        
        {/* Toolbar */}
        <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-50/50 p-3 rounded-xl border border-slate-100">
           <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center">
                 <button onClick={toggleSelectAll} className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 select-none">
                    {allSelected ? <CheckSquare className="w-5 h-5 mr-2 text-blue-600"/> : <Square className="w-5 h-5 mr-2 text-slate-400"/>}
                    全选
                 </button>
              </div>
              
              <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select 
                    value={selectedScenarioId}
                    onChange={(e) => setSelectedScenarioId(e.target.value)}
                    className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 font-medium cursor-pointer hover:bg-slate-100 rounded"
                  >
                    <option value="all">所有场景</option>
                    {scenarios.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
              </div>

              <div className="flex items-center space-x-2 border-l border-slate-200 pl-4 flex-1 max-w-xs">
                 <Search className="w-4 h-4 text-slate-400" />
                 <input 
                    type="text" 
                    placeholder="搜索单词或释义..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-sm border-none bg-transparent focus:ring-0 text-slate-700 placeholder:text-slate-400"
                 />
              </div>
           </div>

           <div className="flex gap-2 items-center">
              {selectedWords.size > 0 ? (
                 <>
                    {/* Batch Actions based on Category */}
                    
                    {/* Known Tab Actions */}
                    {activeTab === WordCategory.KnownWord && (
                        <>
                           <button onClick={() => handleBatchMove(WordCategory.WantToLearnWord)} className="flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition animate-in slide-in-from-right-2">
                              <RotateCcw className="w-4 h-4 mr-2" /> 移至想学
                           </button>
                           <button onClick={() => handleBatchMove(WordCategory.LearningWord)} className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition animate-in slide-in-from-right-2">
                              <BookOpen className="w-4 h-4 mr-2" /> 移至正在学
                           </button>
                        </>
                    )}

                    {/* Want To Learn Tab Actions */}
                    {activeTab === WordCategory.WantToLearnWord && (
                        <>
                            <button onClick={() => handleBatchMove(WordCategory.LearningWord)} className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition animate-in slide-in-from-right-2">
                               <ArrowRight className="w-4 h-4 mr-2" /> 开始学习
                            </button>
                            <button onClick={() => handleBatchMove(WordCategory.KnownWord)} className="flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition animate-in slide-in-from-right-2">
                               <CheckCircle className="w-4 h-4 mr-2" /> 设为已掌握
                            </button>
                        </>
                    )}

                    {/* Learning Tab Actions */}
                    {activeTab === WordCategory.LearningWord && (
                         <>
                            <button onClick={() => handleBatchMove(WordCategory.WantToLearnWord)} className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition animate-in slide-in-from-right-2">
                               <RotateCcw className="w-4 h-4 mr-2" /> 移回想学
                            </button>
                            <button onClick={() => handleBatchMove(WordCategory.KnownWord)} className="flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition animate-in slide-in-from-right-2">
                               <GraduationCap className="w-4 h-4 mr-2" /> 设为已掌握
                            </button>
                         </>
                    )}
                    
                    <div className="w-px h-6 bg-slate-300 mx-2"></div>

                    {/* Export Selected Button */}
                    <button onClick={handleExport} className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition animate-in slide-in-from-right-2">
                        <Download className="w-4 h-4 mr-2" /> 导出 ({selectedWords.size})
                    </button>
                    
                    <button onClick={handleDeleteSelected} className="flex items-center px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition animate-in slide-in-from-right-2">
                        <Trash2 className="w-4 h-4 mr-2" /> 删除 ({selectedWords.size})
                    </button>
                 </>
              ) : (
                  /* Standard Add/Import/Export Buttons - Available for ALL specific tabs */
                  <>
                    {!isAllWordsTab && (
                        <>
                        <Tooltip text={`手动添加单词至"${getTabLabel(activeTab)}"`}>
                            <button 
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition"
                            >
                                <Plus className="w-4 h-4 mr-2" /> 新增
                            </button>
                        </Tooltip>

                        <Tooltip text={importTooltip}>
                            <button 
                                onClick={triggerImport}
                                className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition"
                            >
                            <Upload className="w-4 h-4 mr-2" /> 导入
                            </button>
                        </Tooltip>
                        </>
                    )}

                    <Tooltip text="导出当前列表">
                        <button 
                            onClick={handleExport}
                            className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                        >
                        <Download className="w-4 h-4 mr-2" /> 导出
                        </button>
                    </Tooltip>
                  </>
              )}
           </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 space-y-4 flex-1">
        <WordList 
           groupedEntries={groupedEntries}
           selectedWords={selectedWords}
           toggleSelectGroup={toggleSelectGroup}
           isGroupSelected={isGroupSelected}
           showConfig={showConfig}
           mergeConfig={mergeConfig}
           isAllWordsTab={isAllWordsTab}
           searchQuery={searchQuery}
           ttsSpeed={ttsSpeed}
        />
      </div>
    </div>
  );
};
