
import React, { useState } from 'react';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (text: string, translation: string) => void;
}

export const AddWordModal: React.FC<AddWordModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [newWord, setNewWord] = useState({ text: '', translation: '' });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4">手动添加单词</h3>
            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">单词拼写</label>
                <input type="text" className="w-full border rounded-lg px-3 py-2" autoFocus value={newWord.text} onChange={e => setNewWord({...newWord, text: e.target.value})} />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">中文释义</label>
                <input type="text" className="w-full border rounded-lg px-3 py-2" value={newWord.translation} onChange={e => setNewWord({...newWord, translation: e.target.value})} />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                    <button onClick={() => { onConfirm(newWord.text, newWord.translation); setNewWord({text:'',translation:''}); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">确认添加</button>
                </div>
            </div>
        </div>
    </div>
  );
};
