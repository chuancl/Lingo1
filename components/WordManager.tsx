
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { WordCategory, WordEntry, MergeStrategyConfig, WordTab, Scenario } from '../types';
import { DEFAULT_MERGE_STRATEGY } from '../constants';
import { Upload, Download, Filter, Settings2, List, Search, Plus, Trash2, CheckSquare, Square, ArrowRight, BookOpen, GraduationCap, CheckCircle, RotateCcw } from 'lucide-react';
import { MergeConfigModal } from './word-manager/MergeConfigModal';
import { AddWordModal } from './word-manager/AddWordModal';
import { WordList } from './word-manager/WordList';
import { Toast, ToastMessage } from './ui/Toast';
import { entriesStorage } from '../utils/storage';

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  return (
    <div className="group relative flex items-center">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
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
}

export const WordManager: React.FC<WordManagerProps> = ({ scenarios, entries, setEntries }) => {
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
     const dataToExport = filteredEntries;
     const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `contextlingo_export_${activeTab}_${Date.now()}.json`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
     showToast('导出成功', 'success');
  };

  const triggerImport = () => {
     if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;

     const reader = new FileReader();
     reader.onload = (event) => {
        const text = event.target?.result as string;
        let candidates: Partial<WordEntry>[] = [];
        
        try {
           const json = JSON.parse(text);
           if (Array.isArray(json)) {
               candidates = json;
           }
        } catch (err) {
           const lines = text.split('\n').filter(l => l.trim());
           candidates = lines.map((line) => ({
              text: line.trim(),
              translation: '',
           }));
        }

        const targetCategory = activeTab === 'all' ? WordCategory.WantToLearnWord : activeTab;
        const validEntries: WordEntry[] = [];
        let duplicateCount = 0; // Already in strict category
        let conflictCount = 0; // Exists in mutually exclusive set

        candidates.forEach((c, idx) => {
            if (c.text) {
                 const text = c.text;
                 const trans = c.translation || '';

                 // 1. Same category duplicate check
                 const existsInTarget = entries.some(e => 
                    e.category === targetCategory && 
                    e.text.toLowerCase().trim() === text.toLowerCase().trim() &&
                    e.translation?.trim() === trans.trim()
                 );

                 if (existsInTarget) {
                     duplicateCount++;
                     return;
                 }

                 // 2. Cross-category exclusivity check
                 if (targetCategory === WordCategory.WantToLearnWord || targetCategory === WordCategory.LearningWord) {
                     if (existsInKnown(text, trans)) {
                         conflictCount++;
                         return;
                     }
                 } else if (targetCategory === WordCategory.KnownWord) {
                     const existing = findInLearningOrWant(text, trans);
                     if (existing) {
                         conflictCount++;
                         return;
                     }
                 }
                 
                 validEntries.push({
                    id: c.id || `import-${Date.now()}-${idx}`,
                    text: text,
                    translation: c.translation || '待获取...',
                    category: targetCategory,
                    addedAt: c.addedAt || Date.now(),
                    scenarioId: c.scenarioId || (selectedScenarioId === 'all' ? '1' : selectedScenarioId),
                    phoneticUs: c.phoneticUs || '',
                    contextSentence: c.contextSentence || 'Imported word.'
                 } as WordEntry);
            }
        });

        if (validEntries.length > 0) {
            setEntries(prev => [...prev, ...validEntries]);
            let msg = `成功导入 ${validEntries.length} 个单词。`;
            if (duplicateCount > 0) msg += ` (跳过 ${duplicateCount} 个重复)`;
            if (conflictCount > 0) msg += ` (跳过 ${conflictCount} 个互斥冲突)`;
            showToast(msg, 'success');
        } else {
            if (conflictCount > 0 || duplicateCount > 0) {
                showToast(`导入失败: ${duplicateCount} 个重复，${conflictCount} 个冲突`, 'warning');
            } else {
                showToast('未能解析有效单词或文件为空', 'error');
            }
        }
     };
     reader.readAsText(file);
     e.target.value = ''; 
  };

  const handleAddWord = (text: string, translation: string) => {
     if (!text) {
         showToast('请输入单词拼写', 'warning');
         return;
     }

     const targetCategory = activeTab === 'all' ? WordCategory.WantToLearnWord : activeTab;

     // 1. Logic for adding to Want/Learning -> Check Known
     if (targetCategory === WordCategory.WantToLearnWord || targetCategory === WordCategory.LearningWord) {
         if (existsInKnown(text, translation)) {
             showToast('该单词已在“已掌握”列表中，无法重复添加。', 'error');
             return;
         }
     }
     
     // 2. Logic for adding to Known -> Check Want/Learning
     if (targetCategory === WordCategory.KnownWord) {
         const existing = findInLearningOrWant(text, translation);
         if (existing) {
             const categoryName = existing.category === WordCategory.WantToLearnWord ? '想学习' : '正在学';
             showToast(`该单词已在“${categoryName}”中。请前往该列表将其“移至已掌握”，勿重复新建。`, 'error');
             return;
         }
     }
     
     // 3. Check duplicate in current category (Basic check)
     const existsInTarget = entries.some(e => 
        e.category === targetCategory && 
        e.text.toLowerCase().trim() === text.toLowerCase().trim() &&
        e.translation?.trim() === translation.trim()
     );
     if (existsInTarget) {
         showToast('该单词已存在于当前列表中', 'warning');
         return;
     }

     const entry: WordEntry = {
        id: `manual-${Date.now()}`,
        text: text,
        translation: translation || '自定义释义',
        category: targetCategory,
        addedAt: Date.now(),
        scenarioId: selectedScenarioId === 'all' ? '1' : selectedScenarioId,
        contextSentence: 'Manually added word.',
        phoneticUs: ''
     };
     setEntries(prev => [entry, ...prev]);
     
     showToast('添加成功', 'success');
     setIsAddModalOpen(false); // Auto close modal on success
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
                    
                    <button onClick={handleDeleteSelected} className="flex items-center px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition animate-in slide-in-from-right-2">
                        <Trash2 className="w-4 h-4 mr-2" /> 删除 ({selectedWords.size})
                    </button>
                 </>
              ) : (
                  /* Standard Add/Import/Export Buttons - Available for ALL tabs including Known */
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

                        <Tooltip text={`导入 TXT/JSON 文件至"${getTabLabel(activeTab)}"`}>
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
        />
      </div>
    </div>
  );
};
