'use client';

import React from 'react';
import { Save, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { useSession } from 'next-auth/react';

export const ShopEditorPanel: React.FC = () => {
  const { data: session } = useSession();
  const isAdmin = (session?.user?.permissionLevel ?? 0) >= 3;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-slate-400 font-mono text-xs">
        <ShieldAlert className="w-8 h-8 mb-2 text-red-500/50" />
        <p>Admin permissions required to modify Shop definitions.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-300 font-mono text-xs">
      <div className="flex items-center justify-between p-2 border-b border-slate-800 bg-[#0a1120]">
        <h2 className="font-bold text-slate-100 flex items-center gap-2">
          <span>💰 Economy & Shops Studio</span>
        </h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors border border-blue-500/30">
            <Plus className="w-3 h-3" /> New Shop
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/40 transition-colors border border-green-500/30">
            <Save className="w-3 h-3" /> Save Changes
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-800 bg-[#0a1120] flex flex-col">
          <div className="p-2 border-b border-slate-800">
            <input 
              type="text" 
              placeholder="Search shops..." 
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="p-2 rounded bg-blue-900/30 border border-blue-500/50 cursor-pointer flex justify-between group">
              <span>Pallet Town Mart</span>
              <Trash2 className="w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="p-2 rounded hover:bg-slate-800/50 cursor-pointer flex justify-between group">
              <span>Event Token Vendor</span>
              <Trash2 className="w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-3xl space-y-6">
            
            <div className="space-y-4 bg-slate-900/50 p-4 rounded border border-slate-800">
              <h3 className="text-sm font-semibold text-blue-400 border-b border-slate-800 pb-2">Shop Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">ID</label>
                  <input type="text" className="w-full bg-black/50 border border-slate-700 rounded px-2 py-1 text-slate-300" disabled value="shop_pallet_mart" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Name</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:border-blue-500 outline-none" defaultValue="Pallet Town Mart" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Primary Currency</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:border-blue-500 outline-none" defaultValue="gold" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Refresh Interval (Seconds)</label>
                  <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:border-blue-500 outline-none" placeholder="Never (Static Inventory)" />
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-slate-900/50 p-4 rounded border border-slate-800">
              <h3 className="text-sm font-semibold text-amber-400 border-b border-slate-800 pb-2 flex justify-between items-center">
                <span>Inventory Items</span>
                <button className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="py-2 px-2 font-medium">Item ID</th>
                      <th className="py-2 px-2 font-medium w-32">Price</th>
                      <th className="py-2 px-2 font-medium w-32">Stock</th>
                      <th className="py-2 px-2 font-medium w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2 px-2 text-blue-300 font-medium">item_potion</td>
                      <td className="py-2 px-2"><input type="number" defaultValue="50" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300" /></td>
                      <td className="py-2 px-2"><input type="number" placeholder="Infinite" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300" /></td>
                      <td className="py-2 px-2 text-right">
                        <button className="p-1 hover:bg-red-900/50 rounded text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2 px-2 text-blue-300 font-medium">item_pokeball</td>
                      <td className="py-2 px-2"><input type="number" defaultValue="200" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300" /></td>
                      <td className="py-2 px-2"><input type="number" placeholder="Infinite" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300" /></td>
                      <td className="py-2 px-2 text-right">
                        <button className="p-1 hover:bg-red-900/50 rounded text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2 px-2 text-blue-300 font-medium">item_rare_candy</td>
                      <td className="py-2 px-2"><input type="number" defaultValue="5000" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300" /></td>
                      <td className="py-2 px-2"><input type="number" defaultValue="1" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300" /></td>
                      <td className="py-2 px-2 text-right">
                        <button className="p-1 hover:bg-red-900/50 rounded text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-slate-500 mt-2 leading-tight">
                Stock is decremented globally if specified. If stock is empty, the item will show as Sold Out. If left blank, supply is infinite.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopEditorPanel;
