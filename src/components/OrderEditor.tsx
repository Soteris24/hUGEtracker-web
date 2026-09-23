import React, { useRef, useEffect } from 'react';
import { Plus, Copy, Trash2, ArrowUp, ArrowDown, Layers } from 'lucide-react';
import { TSong } from '../types/uge';

interface OrderEditorProps {
  song: TSong;
  currentOrder: number;
  playingOrder: number;
  isPlaying: boolean;
  onSelectOrder: (order: number) => void;
  onInsertOrder: (order: number, clonePatterns: boolean) => void;
  onDeleteOrder: (order: number) => void;
  onMoveOrder: (order: number, direction: 'up' | 'down') => void;
  onUpdateOrderCell: (channel: number, orderIndex: number, newPatternIndex: number) => void;
  colorTheme?: 'dark' | 'light';
}

export const OrderEditor: React.FC<OrderEditorProps> = ({
  song,
  currentOrder,
  playingOrder,
  isPlaying,
  onSelectOrder,
  onInsertOrder,
  onDeleteOrder,
  onMoveOrder,
  onUpdateOrderCell,
  colorTheme = 'dark',
}) => {
  const isLight = colorTheme === 'light';
  const containerRef = useRef<HTMLDivElement>(null);
  const activeOrder = isPlaying ? playingOrder : currentOrder;

  // Max number of orders across all 4 channels
  const maxOrders = Math.max(
    song.orderMatrix[0]?.length || 1,
    song.orderMatrix[1]?.length || 1,
    song.orderMatrix[2]?.length || 1,
    song.orderMatrix[3]?.length || 1
  );

  // Auto-scroll active order into view
  useEffect(() => {
    const el = document.getElementById(`order-row-${activeOrder}`);
    if (el && containerRef.current) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeOrder]);

  return (
    <div
      className={`flex flex-col border-r text-xs w-64 shrink-0 select-none ${
        isLight ? 'bg-[#f0f2f5] border-[#d1d5db] text-slate-800' : 'bg-zinc-900 border-zinc-800 text-zinc-200'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b ${
          isLight ? 'bg-[#e5e7eb] border-[#d1d5db]' : 'bg-zinc-950 border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-1.5 font-semibold font-mono">
          <Layers className="w-4 h-4 text-emerald-500" />
          <span>ORDER MATRIX</span>
        </div>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            isLight ? 'bg-white border border-gray-300 text-gray-700' : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {maxOrders} Orders
        </span>
      </div>

      {/* Action buttons toolbar */}
      <div
        className={`flex items-center justify-between p-1.5 border-b gap-1 ${
          isLight ? 'bg-white border-[#d1d5db]' : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        <button
          onClick={() => onInsertOrder(currentOrder, false)}
          title="Insert Order Row (duplicate references)"
          className={`flex-1 flex items-center justify-center gap-1 py-1 px-1 rounded transition text-[11px] border ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 border-zinc-700'
          }`}
        >
          <Plus className="w-3 h-3 text-emerald-500" />
          <span>Add</span>
        </button>

        <button
          onClick={() => onInsertOrder(currentOrder, true)}
          title="Duplicate with New Patterns (Replicate)"
          className={`flex-1 flex items-center justify-center gap-1 py-1 px-1 rounded transition text-[11px] border ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 border-zinc-700'
          }`}
        >
          <Copy className="w-3 h-3 text-amber-500" />
          <span>Clone</span>
        </button>

        <button
          onClick={() => onMoveOrder(currentOrder, 'up')}
          disabled={currentOrder <= 0}
          title="Move Order Up"
          className={`p-1 disabled:opacity-30 disabled:cursor-not-allowed rounded border transition ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
          }`}
        >
          <ArrowUp className="w-3 h-3" />
        </button>

        <button
          onClick={() => onMoveOrder(currentOrder, 'down')}
          disabled={currentOrder >= maxOrders - 1}
          title="Move Order Down"
          className={`p-1 disabled:opacity-30 disabled:cursor-not-allowed rounded border transition ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
          }`}
        >
          <ArrowDown className="w-3 h-3" />
        </button>

        <button
          onClick={() => onDeleteOrder(currentOrder)}
          disabled={maxOrders <= 1}
          title="Delete Order Row"
          className="p-1 bg-rose-950/40 hover:bg-rose-900 disabled:opacity-30 disabled:cursor-not-allowed text-rose-300 rounded border border-rose-800/60 transition"
        >
          <Trash2 className="w-3 h-3 text-rose-500" />
        </button>
      </div>

      {/* Orders Table Headers */}
      <div
        className={`grid grid-cols-5 px-2 py-1 text-[10px] font-mono border-b text-center ${
          isLight ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
        }`}
      >
        <div>#</div>
        <div className="text-red-500 font-bold">CH1</div>
        <div className="text-orange-500 font-bold">CH2</div>
        <div className="text-yellow-600 dark:text-yellow-400 font-bold">CH3</div>
        <div className="text-emerald-600 dark:text-emerald-400 font-bold">CH4</div>
      </div>

      {/* Orders List Container */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto overflow-x-hidden font-mono divide-y ${
          isLight ? 'divide-slate-200 bg-white' : 'divide-zinc-800/40'
        }`}
      >
        {Array.from({ length: maxOrders }, (_, ordIdx) => {
          const isSelected = ordIdx === currentOrder;
          const isPlayingThis = isPlaying && ordIdx === playingOrder;

          return (
            <div
              key={ordIdx}
              id={`order-row-${ordIdx}`}
              onClick={() => onSelectOrder(ordIdx)}
              className={`grid grid-cols-5 px-2 py-1 items-center cursor-pointer transition text-center ${
                isPlayingThis
                  ? isLight
                    ? 'bg-emerald-100 text-emerald-900 font-bold border-l-2 border-emerald-600'
                    : 'bg-emerald-950/80 text-emerald-200 font-bold border-l-2 border-emerald-400'
                  : isSelected
                  ? isLight
                    ? 'bg-blue-100 text-blue-950 font-bold border-l-2 border-blue-600'
                    : 'bg-zinc-800 text-white font-medium border-l-2 border-amber-400'
                  : isLight
                  ? 'hover:bg-slate-100 text-slate-600'
                  : 'hover:bg-zinc-800/50 text-zinc-400'
              }`}
            >
              {/* Order Number */}
              <div className={`text-[11px] font-bold ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                {ordIdx.toString().padStart(2, '0')}
              </div>

              {/* 4 Channels */}
              {[0, 1, 2, 3].map((ch) => {
                const patVal = song.orderMatrix[ch]?.[ordIdx] ?? 0;
                return (
                  <div key={ch} className="px-0.5">
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={patVal}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          onUpdateOrderCell(ch, ordIdx, Math.max(0, Math.min(255, val)));
                        }
                      }}
                      className={`w-full text-center rounded text-xs py-0.5 font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border ${
                        isLight
                          ? 'bg-slate-50 hover:bg-white text-slate-800 border-slate-200 focus:border-blue-500'
                          : 'bg-zinc-950/60 hover:bg-zinc-950 focus:bg-zinc-950 text-zinc-200 border-transparent focus:border-emerald-500'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
