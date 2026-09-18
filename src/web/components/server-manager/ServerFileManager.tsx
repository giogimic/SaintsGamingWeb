'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/web/components/ui/card';
import { Button } from '@/web/components/ui/button';
import { Input } from '@/web/components/ui/input';
import { 
  DownloadCloud, Rocket, FileArchive, Loader2, AlertTriangle, 
  FileText, Folder, CornerUpLeft, Trash2, Edit2, Save, X, Plus, Upload, Type, Database, PackageOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  downloadAndExtractServer, installLatestOMP,
  listServerFiles, readServerFile, writeServerFile, deleteServerItem, renameServerItem, uploadServerFile,
  executeSqlFile, executeSqlFolder, unzipServerArchive
} from '@/../app/(ucp)/server-manager/actions';
import { setLauncherConfig } from '@/../app/(ucp)/server-manager/launcher';

export default function ServerFileManager() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [archiveUrl, setArchiveUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  // File Browser State
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  // Editor State
  const [editingFile, setEditingFile] = useState<{ path: string, content: string } | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // Load files when path changes
  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const loadFiles = async (dirPath: string) => {
    setIsLoadingFiles(true);
    const res = await listServerFiles(dirPath);
    if (res.success) {
      setFiles(res.files || []);
    } else {
      toast.error('Failed to load files: ' + res.error);
    }
    setIsLoadingFiles(false);
  };

  const handleInstallLatestOMP = async () => {
    setIsProcessing(true);
    addLog('Initiating open.mp (OMP) latest installation...');
    try {
      const res = await installLatestOMP();
      if (res.success) {
        addLog('Installation successful! You can now start the server.');
        toast.success('open.mp installed successfully!');
        loadFiles(currentPath);
      } else {
        addLog(`Error: ${res.error}`);
        toast.error('Failed to install open.mp');
      }
    } catch (e: any) {
      addLog(`Exception: ${e.message}`);
    }
    setIsProcessing(false);
  };

  const handleCustomArchiveDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveUrl.trim()) return;

    setIsProcessing(true);
    addLog(`Downloading archive from: ${archiveUrl}`);
    try {
      const res = await downloadAndExtractServer(archiveUrl);
      if (res.success) {
        addLog('Archive downloaded and extracted successfully.');
        toast.success('Archive installed!');
        setArchiveUrl('');
        loadFiles(currentPath);
      } else {
        addLog(`Error: ${res.error}`);
        toast.error('Failed to install archive');
      }
    } catch (e: any) {
      addLog(`Exception: ${e.message}`);
    }
    setIsProcessing(false);
  };

  const handleNavigate = (dirName: string) => {
    setCurrentPath(prev => prev ? `${prev}/${dirName}` : dirName);
  };

  const handleNavigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const handleEditFile = async (fileName: string) => {
    const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
    setIsLoadingFiles(true);
    const res = await readServerFile(filePath);
    if (res.success) {
      setEditingFile({ path: filePath, content: res.content || '' });
    } else {
      toast.error('Failed to read file: ' + res.error);
    }
    setIsLoadingFiles(false);
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    setIsProcessing(true);
    const res = await writeServerFile(editingFile.path, editingFile.content);
    if (res.success) {
      toast.success('File saved successfully');
      setEditingFile(null);
      loadFiles(currentPath);
    } else {
      toast.error('Failed to save file: ' + res.error);
    }
    setIsProcessing(false);
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;
    const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
    const res = await deleteServerItem(filePath);
    if (res.success) {
      toast.success('Deleted successfully');
      loadFiles(currentPath);
    } else {
      toast.error('Failed to delete: ' + res.error);
    }
  };
  
  const handleCreateFile = async () => {
    const fileName = prompt("Enter new file name:");
    if (!fileName) return;
    const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
    const res = await writeServerFile(filePath, "");
    if (res.success) {
      toast.success('File created');
      handleEditFile(fileName);
      loadFiles(currentPath);
    } else {
      toast.error('Failed to create file: ' + res.error);
    }
  };

  const handleRename = async (fileName: string) => {
    const newName = prompt(`Enter new name for ${fileName}:`, fileName);
    if (!newName || newName === fileName) return;
    
    const oldPath = currentPath ? `${currentPath}/${fileName}` : fileName;
    const newPath = currentPath ? `${currentPath}/${newName}` : newName;
    
    setIsProcessing(true);
    const res = await renameServerItem(oldPath, newPath);
    if (res.success) {
      toast.success('Renamed successfully');
      loadFiles(currentPath);
    } else {
      toast.error('Failed to rename: ' + res.error);
    }
    setIsProcessing(false);
  };

  const handleSetLaunchScript = async (fileName: string) => {
    const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
    const executableStr = `./${filePath}`;
    setIsProcessing(true);
    
    try {
      const res = await setLauncherConfig(executableStr);
      if (res.success) {
        toast.success(`Set ${executableStr} as launch script! Reloading...`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error('Failed to set launch script: ' + res.error);
      }
    } catch (err: any) {
      toast.error('Failed to set launch script');
    }
    setIsProcessing(false);
  };

  const handleCreateFile = async () => {
    const fileName = prompt("Enter new file name:");
    if (!fileName) return;
    const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
    const res = await writeServerFile(filePath, "");
    if (res.success) {
      toast.success('File created');
      handleEditFile(fileName);
      loadFiles(currentPath);
    } else {
      toast.error('Failed to create file: ' + res.error);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dirPath', currentPath);

    setIsProcessing(true);
    setUploadProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/samp/upload', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setIsProcessing(false);
      setUploadProgress(null);
      if (e.target) e.target.value = '';

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            toast.success('File uploaded successfully');
            loadFiles(currentPath);
          } else {
            toast.error('Failed to upload file: ' + (res.error || 'Unknown error'));
          }
        } catch (err) {
          toast.error('Upload failed with invalid response');
        }
      } else {
        toast.error('Upload failed with status: ' + xhr.status);
      }
    };

    xhr.onerror = () => {
      setIsProcessing(false);
      setUploadProgress(null);
      if (e.target) e.target.value = '';
      toast.error('Upload failed due to network error');
    };

    xhr.send(formData);
  };

  const handleExecuteSqlFile = async (fileName: string) => {
    if (!confirm(`Are you sure you want to execute ${fileName} on the database? This cannot be undone.`)) return;
    setIsProcessing(true);
    const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
    const res = await executeSqlFile(filePath);
    if (res.success) {
      toast.success(`Executed ${res.executedCount} statements successfully`);
    } else {
      toast.error('SQL Execution failed: ' + res.error);
    }
    setIsProcessing(false);
  };

  const handleExecuteSqlFolder = async (folderName: string) => {
    if (!confirm(`Are you sure you want to execute all .sql files in ${folderName} on the database?`)) return;
    setIsProcessing(true);
    const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
    const res = await executeSqlFolder(folderPath);
    if (res.success) {
      toast.success(`Executed ${res.totalExecuted} statements across files`);
    } else {
      toast.error('SQL Folder Execution failed: ' + res.error);
    }
    setIsProcessing(false);
  };

  const handleUnzip = async (fileName: string) => {
    if (!confirm(`Are you sure you want to extract ${fileName} here? Files may be overwritten.`)) return;
    setIsProcessing(true);
    const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
    const res = await unzipServerArchive(filePath);
    if (res.success) {
      toast.success('Archive extracted successfully');
      loadFiles(currentPath);
    } else {
      toast.error('Extraction failed: ' + res.error);
    }
    setIsProcessing(false);
  };

  if (editingFile) {
    return (
      <div className="flex flex-col h-full bg-background/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Editing: {editingFile.path}
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditingFile(null)} disabled={isProcessing}>
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSaveFile} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
        <textarea
          className="flex-1 w-full bg-black/60 border border-border/40 rounded p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          value={editingFile.content}
          onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/50 overflow-hidden">
      <div className="p-4 space-y-6 flex-1 overflow-auto">
        
        {/* Quick Setups & Archive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-black/40 border-border/40 p-4 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-1">
                <Rocket className="w-4 h-4" /> Quick Setup
              </h3>
              <p className="text-xs text-muted-foreground">Downloads the latest compatible Windows/Linux open.mp server binaries directly from GitHub.</p>
            </div>
            <Button 
              onClick={handleInstallLatestOMP} 
              disabled={isProcessing}
              className="bg-primary text-black hover:bg-primary/80 font-bold w-full"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Install open.mp'}
            </Button>
          </Card>

          <Card className="bg-black/40 border-border/40 p-4 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2 mb-1">
                <DownloadCloud className="w-4 h-4" /> Custom Archive
              </h3>
              <p className="text-xs text-muted-foreground">
                Extract a <code className="text-primary">.zip</code> or <code className="text-primary">.tar.gz</code> server archive URL into the root.
              </p>
            </div>
            <form onSubmit={handleCustomArchiveDownload} className="flex gap-2">
              <Input
                placeholder="https://example.com/gamemode.zip"
                value={archiveUrl}
                onChange={(e) => setArchiveUrl(e.target.value)}
                disabled={isProcessing}
                className="font-mono text-xs bg-black/60 h-9"
              />
              <Button type="submit" disabled={isProcessing || !archiveUrl} variant="secondary" className="h-9 px-3">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
              </Button>
            </form>
          </Card>
        </div>

        {/* File Browser */}
        <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-t-lg border border-border/30 border-b-0">
            <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground overflow-hidden">
              <span className="text-primary">/samp-server</span>
              {currentPath && <span className="truncate">/{currentPath}</span>}
            </div>
            <div className="flex gap-2">
              {uploadProgress !== null && (
                <div className="text-xs font-mono text-emerald-400 flex items-center bg-emerald-400/10 px-2 rounded">
                  Uploading: {uploadProgress}%
                </div>
              )}
              <label className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2">
                <Upload className="w-4 h-4 mr-1" /> Upload
                <input type="file" className="hidden" onChange={handleUploadFile} disabled={isProcessing} />
              </label>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleCreateFile} disabled={isProcessing}>
                <Plus className="w-4 h-4 mr-1" /> New File
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => loadFiles(currentPath)} disabled={isLoadingFiles || isProcessing}>
                <Loader2 className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          <div className="bg-[#0a0a0a] border border-border/30 rounded-b-lg flex-1 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-black/40 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium w-24">Size</th>
                  <th className="px-4 py-2 font-medium w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPath && (
                  <tr className="border-b border-border/10 hover:bg-white/5 cursor-pointer" onClick={handleNavigateUp}>
                    <td className="px-4 py-2 flex items-center gap-2 text-primary font-medium">
                      <CornerUpLeft className="w-4 h-4" /> ..
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                )}
                {files.map((file, i) => (
                  <tr key={i} className="border-b border-border/10 hover:bg-white/5 group">
                    <td className="px-4 py-2 flex items-center gap-2">
                      {file.isDirectory ? (
                        <Folder className="w-4 h-4 text-amber-400" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-400" />
                      )}
                      {file.isDirectory ? (
                        <span className="cursor-pointer hover:underline" onClick={() => handleNavigate(file.name)}>
                          {file.name}
                        </span>
                      ) : (
                        <span>{file.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {file.isDirectory ? '--' : `${(file.size / 1024).toFixed(1)} KB`}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!file.isDirectory && (file.name.endsWith('.sh') || file.name.endsWith('.exe') || file.name.includes('samp03svr') || file.name.includes('omp-server') || file.name.includes('announce')) && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-purple-400 hover:bg-purple-400/20" onClick={() => handleSetLaunchScript(file.name)} title="Set as Launch Script">
                            <Rocket className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {!file.isDirectory && file.name.endsWith('.sql') && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:bg-emerald-400/20" onClick={() => handleExecuteSqlFile(file.name)} title="Execute SQL File">
                            <Database className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {!file.isDirectory && (file.name.endsWith('.zip') || file.name.endsWith('.tar.gz')) && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-cyan-400 hover:bg-cyan-400/20" onClick={() => handleUnzip(file.name)} title="Extract Archive Here">
                            <PackageOpen className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {file.isDirectory && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:bg-emerald-400/20" onClick={() => handleExecuteSqlFolder(file.name)} title="Execute all SQL in folder">
                            <Database className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {!file.isDirectory && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:bg-blue-400/20" onClick={() => handleEditFile(file.name)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-400 hover:bg-amber-400/20" onClick={() => handleRename(file.name)}>
                          <Type className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-400 hover:bg-rose-400/20" onClick={() => handleDelete(file.name)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {files.length === 0 && !isLoadingFiles && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">
                      Directory is empty
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
