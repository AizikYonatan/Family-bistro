import React, { useState, useEffect } from 'react';
import { X, Copy, Download, Upload, Check } from 'lucide-react';
import { getExportString, importDataString } from '../services/storageService';

interface SyncModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ onClose, onImportSuccess }) => {
  const [exportCode, setExportCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    setExportCode(getExportString());
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleImport = () => {
    if (!importCode) return;
    const success = importDataString(importCode);
    if (success) {
      setImportStatus('success');
      onImportSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setImportStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-orange-50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Upload size={24} className="text-orange-600" />
            Sync Devices
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-orange-100 rounded-full text-gray-500">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          {/* EXPORT SECTION */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-orange-700 font-semibold">
              <Download size={20} />
              <h3>Send Data (Copy This)</h3>
            </div>
            <p className="text-sm text-gray-500">
              Copy this code and send it to another phone to share your Menu and Orders.
            </p>
            <div className="relative">
              <textarea 
                readOnly
                value={exportCode}
                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button 
                onClick={handleCopy}
                className={`absolute top-2 right-2 p-2 rounded-md shadow-sm transition-all flex items-center gap-1 text-xs font-bold ${copySuccess ? 'bg-green-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border'}`}
              >
                {copySuccess ? <Check size={14} /> : <Copy size={14} />}
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100"></div>

          {/* IMPORT SECTION */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-semibold">
              <Upload size={20} />
              <h3>Receive Data (Paste Here)</h3>
            </div>
            <p className="text-sm text-gray-500">
              Paste a code from another device here to update this phone.
            </p>
            <textarea 
              value={importCode}
              onChange={(e) => {
                setImportCode(e.target.value);
                setImportStatus('idle');
              }}
              placeholder="Paste code here..."
              className="w-full h-24 bg-white border border-slate-300 rounded-lg p-3 text-xs font-mono text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {importStatus === 'error' && (
              <p className="text-red-500 text-xs font-medium">Invalid code. Please try again.</p>
            )}
            {importStatus === 'success' && (
              <p className="text-green-500 text-xs font-medium flex items-center gap-1">
                <Check size={12} /> Sync Successful!
              </p>
            )}
            <button 
              onClick={handleImport}
              disabled={!importCode}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Load Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
