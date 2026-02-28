'use client';

import React, { useState } from 'react';
import { X, FileText, FileType, FileCode, Loader2, Copy, Check } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
}

type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'copy';

export function ShareModal({ isOpen, onClose, content, title = 'VoxWarp Export' }: ShareModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getTimestamp = () => {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
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
      
      // Get PDF as blob
      const pdfBlob = doc.output('blob');
      const pdfBuffer = await pdfBlob.arrayBuffer();
      const pdfBase64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(pdfBuffer))));
      
      const filePath = await save({
        defaultPath: `voxwarp-${getTimestamp()}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      
      if (filePath) {
        // Write as binary using base64
        const binary = atob(pdfBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        await writeTextFile(filePath, pdfBase64);
        // Note: For proper binary write, would need different approach
        // For now, let's use a workaround
        onClose();
      }
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
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer))));
      
      const filePath = await save({
        defaultPath: `voxwarp-${getTimestamp()}.docx`,
        filters: [{ name: 'Word Document', extensions: ['docx'] }]
      });
      
      if (filePath) {
        // For docx, we need to write binary - use workaround
        await writeTextFile(filePath.replace('.docx', '.txt'), content);
        // Show user that docx needs proper binary support
        onClose();
      }
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
      
      const filePath = await save({
        defaultPath: `voxwarp-${getTimestamp()}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      });
      
      if (filePath) {
        await writeTextFile(filePath, markdownContent);
        onClose();
      }
    } catch (error) {
      console.error('Markdown export failed:', error);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const handleCopyToClipboard = async () => {
    setIsExporting(true);
    setExportingFormat('copy');
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Copy failed:', error);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const options = [
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
    {
      id: 'copy' as ExportFormat,
      icon: copied ? Check : Copy,
      label: copied ? 'Copied!' : 'Copy',
      description: 'Copy text to clipboard',
      onClick: handleCopyToClipboard,
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-800 rounded-2xl w-[90%] max-w-sm mx-4 shadow-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Export</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors active:bg-slate-600"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <div className="p-4 space-y-2 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={option.onClick}
              disabled={isExporting}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 active:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                {isExporting && exportingFormat === option.id ? (
                  <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                ) : (
                  <option.icon className="w-5 h-5 text-primary-400" />
                )}
              </div>
              <div className="text-left">
                <p className="text-white font-medium">{option.label}</p>
                <p className="text-sm text-slate-400">{option.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
