
import React, { useState } from 'react';
import { AutoTranslateConfig } from '../../types';
import { ShieldAlert, ShieldCheck, X } from 'lucide-react';

interface GeneralSectionProps {
  config: AutoTranslateConfig;
  setConfig: React.Dispatch<React.SetStateAction<AutoTranslateConfig>>;
}

export const GeneralSection: React.FC<GeneralSectionProps> = ({ config, setConfig }) => {
  const [newBlacklist, setNewBlacklist] = useState('');
  const [newWhitelist, setNewWhitelist] = useState('');

  const addBlacklist = () => {
    if (newBlacklist.trim()) {
      setConfig({ ...config, blacklist: [...config.blacklist, newBlacklist.trim()] });
      setNewBlacklist('');
    }
  };

  const addWhitelist = () => {
    if (newWhitelist.trim()) {
      setConfig({ ...config, whitelist: [...config.whitelist, newWhitelist.trim()] });
      setNewWhitelist('');
    }
  };

  const removeBlacklist = (item: string) => {
    setConfig({ ...config, blacklist: config.blacklist.filter(i => i !== item) });
  };

  const removeWhitelist = (item: string) => {
    setConfig({ ...config, whitelist: config.whitelist.filter(i => i !== item) });
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">常规选项</h2>
        <p className="text-sm text-slate-500">配置全局翻译开关及网站黑白名单规则。</p>
      </div>
      <div className="p-6 space-y-8">
        
        {/* Main Toggle */}
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
           <div>
              <h3 className="font-bold text-slate-900">默认开启翻译</h3>
              <p className="text-xs text-slate-500 mt-1">控制插件在新打开的网页上是否默认执行替换翻译。</p>
           </div>
           <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.enabled} 
                onChange={e => setConfig({...config, enabled: e.target.checked})} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
           </label>
        </div>

        {/* Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Blacklist */}
           <div>
              <div className="flex items-center gap-2 mb-3">
                 <ShieldAlert className="w-4 h-4 text-red-500" />
                 <h3 className="text-sm font-bold text-slate-800">黑名单 (不翻译)</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                 即使开启了“默认翻译”，匹配以下规则的网站也不会自动翻译。支持正则表达式。
              </p>
              <div className="flex gap-2 mb-3">
                 <input 
                    type="text" 
                    value={newBlacklist}
                    onChange={e => setNewBlacklist(e.target.value)}
                    placeholder="如: baidu.com, .*\\.cn$"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    onKeyDown={e => e.key === 'Enter' && addBlacklist()}
                 />
                 <button onClick={addBlacklist} className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs">添加</button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                 {config.blacklist.map(site => (
                    <div key={site} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded text-sm border border-slate-100">
                       <span className="font-mono text-slate-700 truncate">{site}</span>
                       <button onClick={() => removeBlacklist(site)} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                    </div>
                 ))}
                 {config.blacklist.length === 0 && <div className="text-center text-xs text-slate-400 py-4">暂无黑名单规则</div>}
              </div>
           </div>

           {/* Whitelist */}
           <div>
              <div className="flex items-center gap-2 mb-3">
                 <ShieldCheck className="w-4 h-4 text-green-500" />
                 <h3 className="text-sm font-bold text-slate-800">白名单 (强制翻译)</h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                 即使关闭了“默认翻译”，匹配以下规则的网站也会自动启用翻译。支持正则表达式。
              </p>
              <div className="flex gap-2 mb-3">
                 <input 
                    type="text" 
                    value={newWhitelist}
                    onChange={e => setNewWhitelist(e.target.value)}
                    placeholder="如: nytimes.com"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    onKeyDown={e => e.key === 'Enter' && addWhitelist()}
                 />
                 <button onClick={addWhitelist} className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs">添加</button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                 {config.whitelist.map(site => (
                    <div key={site} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded text-sm border border-slate-100">
                       <span className="font-mono text-slate-700 truncate">{site}</span>
                       <button onClick={() => removeWhitelist(site)} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                    </div>
                 ))}
                 {config.whitelist.length === 0 && <div className="text-center text-xs text-slate-400 py-4">暂无白名单规则</div>}
              </div>
           </div>
        </div>

      </div>
    </section>
  );
};
