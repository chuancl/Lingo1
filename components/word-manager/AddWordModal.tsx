
import React, { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (text: string, translation: string) => Promise<void>;
  isLoading?: boolean;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({ isOpen, onClose, onConfirm, isLoading = false }) => {
  const [newWord, setNewWord] = useState({ text: '', translation: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
      if (!newWord.text.trim()) return;
      setIsSubmitting(true);
      try {
          await onConfirm(newWord.text, newWord.translation);
          setNewWord({ text: '', translation: '' });
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4 flex items-center">
                <Wand2 className="w-5 h-5 mr-2 text-blue-500" />
                智能添加单词
            </h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">单词拼写 <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" 
                        autoFocus 
                        value={newWord.text} 
                        onChange={e => setNewWord({...newWord, text: e.target.value})} 
                        placeholder="例如: ephemeral"
                    />
                </div>
                <div>
                    <label className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                        <span>中文释义 (可选)</span>
                        <span className="text-xs text-slate-400 font-normal">留空则自动获取所有释义</span>
                    </label>
                    <input 
                        type="text" 
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={newWord.translation} 
                        onChange={e => setNewWord({...newWord, translation: e.target.value})} 
                        placeholder="指定特定意思，如: 短暂的"
                    />
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                        系统将自动通过 API 查询该单词的音标、例句及上下文混合句。如果该单词有多个含义且未指定释义，将自动添加多条记录。
                    </p>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                        disabled={isSubmitting}
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !newWord.text.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isSubmitting ? '查询并添加...' : '智能添加'}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
