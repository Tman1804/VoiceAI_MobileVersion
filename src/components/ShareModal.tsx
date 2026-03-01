'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, FileType, FileCode, Loader2, Share2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
}

type ExportFormat = 'share' | 'pdf' | 'docx' | 'markdown';

export function ShareModal({ isOpen, onClose, content, title = 'VoxWarp Export' }: ShareModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const getTimestamp = () => {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
  };

  // Helper function to download file using browser APIs
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportingFormat('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text(title, 20, 20);
      
      // Add content with word wrap
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(content, 170);
      doc.text(lines, 20, 35);
      
      // Get PDF as blob and download
      const pdfBlob = doc.output('blob');
      downloadFile(pdfBlob, `voxwarp-${getTimestamp()}.pdf`);
      onClose();
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    setExportingFormat('docx');
    try {
      const { Document, Paragraph, TextRun, Packer } = await import('docx');
      
      const paragraphs = content.split('\n').map(line => 
        new Paragraph({
          children: [new TextRun(line)],
        })
      );
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: title, bold: true, size: 32 })],
            }),
            new Paragraph({ children: [] }), // Empty line
            ...paragraphs
          ],
        }],
      });
      
      const blob = await Packer.toBlob(doc);
      downloadFile(blob, `voxwarp-${getTimestamp()}.docx`);
      onClose();
    } catch (error) {
      console.error('DOCX export failed:', error);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const handleExportMarkdown = async () => {
    setIsExporting(true);
    setExportingFormat('markdown');
    try {
      const markdownContent = `# ${title}\n\n${content}`;
      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
      downloadFile(blob, `voxwarp-${getTimestamp()}.md`);
      onClose();
    } catch (error) {
      console.error('Markdown export failed:', error);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const handleNativeShare = async () => {
    setIsExporting(true);
    setExportingFormat('share');
    try {
      // Use Web Share API - works on Android WebView
      if (navigator.share) {
        await navigator.share({ 
          title: title,
          text: content 
        });
        onClose();
        return;
      }
      
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1000);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        // User cancelled share, that's OK
        console.error('Share failed:', error);
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
            onClose();
          }, 1000);
        } catch {
          console.error('Clipboard fallback failed');
        }
      }
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const options = [
    {
      id: 'share' as ExportFormat,
      icon: Share2,
      label: 'Share',
      description: 'Share via apps',
      onClick: handleNativeShare,
    },
    {
      id: 'markdown' as ExportFormat,
      icon: FileCode,
      label: 'Markdown',
      description: 'Save as .md file',
      onClick: handleExportMarkdown,
    },
    {
      id: 'pdf' as ExportFormat,
      icon: FileText,
      label: 'PDF',
      description: 'Save as PDF document',
      onClick: handleExportPDF,
    },
    {
      id: 'docx' as ExportFormat,
      icon: FileType,
      label: 'Word',
      description: 'Save as Word document',
      onClick: handleExportDocx,
    },
  ];

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-t-2xl w-full shadow-2xl"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>
        
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Export</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors active:bg-slate-600"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        
        <div className="p-3 space-y-2">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={option.onClick}
              disabled={isExporting}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 active:bg-slate-600 transition-colors disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-full bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                {isExporting && exportingFormat === option.id ? (
                  <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                ) : (
                  <option.icon className="w-4 h-4 text-primary-400" />
                )}
              </div>
              <div className="text-left">
                <p className="text-white font-medium text-sm">{option.label}</p>
                <p className="text-xs text-slate-400">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
        
        <div className="px-3 pb-4">
          <button
            onClick={onClose}
            className="w-full p-3 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
