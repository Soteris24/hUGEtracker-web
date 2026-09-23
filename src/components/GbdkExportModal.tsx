import React, { useState } from 'react';
import { X, Copy, Download, Code2, Check, BookOpen } from 'lucide-react';
import { TSong } from '../types/uge';
import { generateGbdkC } from '../lib/gbdkExport';

interface GbdkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: TSong;
}

export const GbdkExportModal: React.FC<GbdkExportModalProps> = ({ isOpen, onClose, song }) => {
  const [descriptorName, setDescriptorName] = useState<string>(
    song.name ? song.name.toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'song'
  );
  const [bankNumber, setBankNumber] = useState<number>(2);
  const [isBanked, setIsBanked] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'c' | 'h' | 'docs'>('c');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const { cCode, hCode } = generateGbdkC(
    song,
    descriptorName || 'song',
    isBanked ? bankNumber : -1
  );

  const currentContent = activeTab === 'c' ? cCode : hCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (type: 'c' | 'h') => {
    const text = type === 'c' ? cCode : hCode;
    const filename = `${descriptorName || 'song'}.${type}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl text-xs text-zinc-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-zinc-100 font-mono">
                GBDK C & hUGEDriver EXPORT
              </h3>
              <p className="text-[11px] text-zinc-400">
                Native C code compiled directly with GBDK-2020 for Game Boy ROMs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-zinc-900 border-b border-zinc-800 gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-zinc-400 font-medium">Identifier:</label>
              <input
                type="text"
                value={descriptorName}
                onChange={(e) => setDescriptorName(e.target.value)}
                className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 font-mono text-xs w-36 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBanked}
                  onChange={(e) => setIsBanked(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-500 rounded"
                />
                <span className="text-zinc-300">ROM Bank:</span>
              </label>
              {isBanked && (
                <input
                  type="number"
                  min="1"
                  max="255"
                  value={bankNumber}
                  onChange={(e) => setBankNumber(parseInt(e.target.value, 10) || 1)}
                  className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-100 font-mono text-xs w-16 focus:border-emerald-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Tab selector */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded border border-zinc-800">
            <button
              onClick={() => setActiveTab('c')}
              className={`px-3 py-1 rounded font-mono transition ${
                activeTab === 'c'
                  ? 'bg-zinc-800 text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {descriptorName}.c
            </button>
            <button
              onClick={() => setActiveTab('h')}
              className={`px-3 py-1 rounded font-mono transition ${
                activeTab === 'h'
                  ? 'bg-zinc-800 text-emerald-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {descriptorName}.h
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1 rounded transition flex items-center gap-1 ${
                activeTab === 'docs'
                  ? 'bg-zinc-800 text-zinc-100 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Guide</span>
            </button>
          </div>
        </div>

        {/* Code Content View */}
        <div className="flex-1 overflow-auto bg-zinc-950 p-4 font-mono text-[11px] leading-relaxed select-text">
          {activeTab !== 'docs' ? (
            <pre className="text-emerald-300/90 whitespace-pre">{currentContent}</pre>
          ) : (
            <div className="space-y-4 max-w-2xl font-sans text-xs text-zinc-300">
              <h4 className="text-sm font-bold text-zinc-100 font-mono">
                Using Your Song in a GBDK-2020 Game Boy Project
              </h4>
              <p>
                1. Place the generated <code className="text-emerald-400 font-mono">{descriptorName}.c</code> and{' '}
                <code className="text-emerald-400 font-mono">{descriptorName}.h</code> files into your project source directory.
              </p>
              <p>
                2. Ensure <code className="text-emerald-400 font-mono">hUGEDriver.h</code> and{' '}
                <code className="text-emerald-400 font-mono">hUGEDriver.lib</code> (or source) are linked.
              </p>
              <p>3. Initialize and play the song in your Game Boy C loop:</p>
              <pre className="bg-zinc-900 border border-zinc-800 p-3 rounded font-mono text-[11px] text-zinc-200 overflow-x-auto">
{`#include <gb/gb.h>
#include "hUGEDriver.h"
#include "${descriptorName}.h"

void main(void) {
    // 1. Enable Game Boy sound hardware
    NR52_REG = 0x80;
    NR51_REG = 0xFF;
    NR50_REG = 0x77;

    // 2. Initialize song
    hUGE_init(&${descriptorName});

    // 3. Register audio tick on VBlank
    add_VBL(hUGE_dosound);

    // 4. Main game loop
    while (1) {
        wait_vbl_done();
    }
}`}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-950 border-t border-zinc-800 shrink-0">
          <div className="text-[11px] text-zinc-500 font-mono">
            Full compatibility with SuperDisk hUGEDriver & GBDK-2020 / ZGB
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== 'docs' && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-medium transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => handleDownload('c')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .c</span>
            </button>

            <button
              onClick={() => handleDownload('h')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .h</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
