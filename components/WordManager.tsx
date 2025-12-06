
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { WordCategory, WordEntry, MergeStrategyConfig, WordTab, Scenario } from '../types';
import { DEFAULT_MERGE_STRATEGY } from '../constants';
import { Upload, Download, Filter, Settings2, List, Search, Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { MergeConfigModal } from './word-manager/MergeConfigModal';
import { AddWordModal } from './word-manager/AddWordModal';
import { WordList } from './word-manager/WordList';

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

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (activeTab !== 'all') {
        if (activeTab === WordCategory.WantToLearnWord) {
           if (e.category !== WordCategory.WantToLearnWord && e.category !== WordCategory.LearningWord) return false;
        } else {
           if (e.category !== activeTab) return false;
        }
      }
      if (selectedScenarioId !== 'all') {
         if (e.scenarioId !== selectedScenarioId) return false;
      }
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
    }
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
        try {
           const json = JSON.parse(text);
           if (Array.isArray(json)) {
              const newEntries = json.map((item: any, idx: number) => ({
                 ...item,
                 id: `import-${Date.now()}-${idx}`,
                 category: activeTab === 'all' ? WordCategory.WantToLearnWord : activeTab
              }));
              setEntries(prev => [...prev, ...newEntries]);
              alert(`成功导入 ${newEntries.length} 个单词`);
           }
        } catch (err) {
           const lines = text.split('\n').filter(l => l.trim());
           const newEntries = lines.map((line, idx) => ({
              id: `import-txt-${Date.now()}-${idx}`,
              text: line.trim(),
              translation: '待获取...',
              category: activeTab === 'all' ? WordCategory.WantToLearnWord : activeTab,
              addedAt: Date.now(),
              scenarioId: selectedScenarioId === 'all' ? '1' : selectedScenarioId,
              phoneticUs: '',
              contextSentence: 'Imported via text file.'
           }));
           setEntries(prev => [...prev, ...newEntries]);
           alert(`成功导入 ${newEntries.length} 个单词 (文本模式)`);
        }
     };
     reader.readAsText(file);
     e.target.value = ''; 
  };

  const handleAddWord = (text: string, translation: string) => {
     if (!text) return;
     const entry: WordEntry = {
        id: `manual-${Date.now()}`,
        text: text,
        translation: translation || '自定义释义',
        category: activeTab === 'all' ? WordCategory.WantToLearnWord : activeTab,
        addedAt: Date.now(),
        scenarioId: selectedScenarioId === 'all' ? '1' : selectedScenarioId,
        contextSentence: 'Manually added word.',
        phoneticUs: ''
     };
     setEntries(prev => [entry, ...prev]);
     setIsAddModalOpen(false);
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
        
        <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-50/50 p-3 rounded-xl border border-slate-100">
           <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center">
                 <button onClick={toggleSelectAll} className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900">
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

           <div className="flex gap-2">
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
              
              {selectedWords.size > 0 && (
                <Tooltip text="删除选中的单词。">
                  <button onClick={handleDeleteSelected} className="flex items-center px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition ml-2 animate-in slide-in-from-right-2">
                    <Trash2 className="w-4 h-4 mr-2" /> 删除 ({selectedWords.size})
                  </button>
                </Tooltip>
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
