'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/web/components/ui/card';
import { Button } from '@/web/components/ui/button';
import { Input } from '@/web/components/ui/input';
import { 
  DownloadCloud, Rocket, FileArchive, Loader2, AlertTriangle, 
  FileText, Folder, CornerUpLeft, Trash2, Edit2, Save, X, Plus, Upload, Type, Database, PackageOpen,
  ChevronDown, ChevronRight, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  downloadAndExtractServer, installLatestOMP, getDeployKey, syncGitDeploy, getGitRemoteUrl,
  listServerFiles, readServerFile, writeServerFile, deleteServerItem, renameServerItem, uploadServerFile,
  executeSqlFile, executeSqlFolder, unzipServerArchive, grabMissingLibraries
} from '@/../app/(ucp)/server-manager/actions';
import { setLauncherConfig } from '@/../app/(ucp)/server-manager/launcher';

export default function ServerFileManager() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [archiveUrl, setArchiveUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  // Git State
  const [deployKey, setDeployKey] = useState<string>('');
  const [repoUrl, setRepoUrl] = useState<string>('');

  // File Browser State
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showDeployTools, setShowDeployTools] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [showSoFiles, setShowSoFiles] = useState(false);
  
  // Editor State
  const [editingFile, setEditingFile] = useState<{ path: string, content: string } | null>(null);

  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{ id: string; file: File; relativePath: string; status: 'pending' | 'uploading' | 'completed' | 'error' | 'collided'; error?: string }[]>([]);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [collisionItems, setCollisionItems] = useState<{ id: string; relativePath: string }[]>([]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  useEffect(() => {
    getDeployKey().then(res => {
      if (res.success && res.publicKey) {
        setDeployKey(res.publicKey);
      }
    });
    getGitRemoteUrl().then(res => {
      if (res.success && res.url) {
        setRepoUrl(res.url);
      }
    });
  }, []);

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

  const handleGrabMissingLibraries = async () => {
    setIsProcessing(true);
    addLog('Pulling missing Linux libraries into directory...');
    try {
      const res = await grabMissingLibraries();
      if (res.success) {
        addLog('Missing libraries pulled successfully!');
        toast.success('Libraries pulled into directory!');
        loadFiles(currentPath);
      } else {
        addLog(`Error: ${res.error}`);
        toast.error('Failed to pull missing libraries');
      }
    } catch (e: any) {
      addLog(`Exception: ${e.message}`);
    }
    setIsProcessing(false);
  };

  const handleGitDeploy = async () => {
    if (!repoUrl.trim()) return;
    setIsProcessing(true);
    addLog(`Initiating Git sync for ${repoUrl}...`);
    try {
      const res = await syncGitDeploy(repoUrl);
      if (res.success) {
        addLog('Git sync successful!');
        toast.success('Server synchronized with Git repository!');
        loadFiles(currentPath);
      } else {
        addLog(`Error: ${res.error}`);
        toast.error('Failed to sync with Git');
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
          className="flex-1 w-full min-h-[60vh] bg-black/60 border border-border/40 rounded p-4 font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-primary"
          value={editingFile.content}
          onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
          spellCheck={false}
        />
      </div>
    );
  }

  // --- Drag & Drop Queue Logic ---
  
  // Recursively read a directory entry
  const readDirectory = async (directoryReader: FileSystemDirectoryReader, pathPrefix: string, entries: any[] = []): Promise<void> => {
    return new Promise((resolve, reject) => {
      directoryReader.readEntries(async (results) => {
        if (!results.length) {
          resolve();
        } else {
          for (const entry of results) {
            if (entry.isFile) {
              const file = await new Promise<File>((res) => (entry as FileSystemFileEntry).file(res));
              entries.push({ file, relativePath: `${pathPrefix}${file.name}` });
            } else if (entry.isDirectory) {
              const dirReader = (entry as FileSystemDirectoryEntry).createReader();
              await readDirectory(dirReader, `${pathPrefix}${entry.name}/`, entries);
            }
          }
          await readDirectory(directoryReader, pathPrefix, entries);
          resolve();
        }
      }, reject);
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!e.dataTransfer.items) return;
    
    setIsProcessing(true);
    addLog('Parsing dropped files...');

    const newEntries: { file: File; relativePath: string }[] = [];

    const promises = Array.from(e.dataTransfer.items).map(async (item) => {
      if (item.kind !== 'file') return;
      const entry = item.webkitGetAsEntry();
      if (!entry) return;

      if (entry.isFile) {
        const file = item.getAsFile();
        if (file) newEntries.push({ file, relativePath: file.name });
      } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader();
        await readDirectory(dirReader, `${entry.name}/`, newEntries);
      }
    });

    await Promise.all(promises);

    if (newEntries.length === 0) {
      setIsProcessing(false);
      return;
    }

    addLog(`Checking ${newEntries.length} files for collisions...`);

    try {
      const res = await fetch('/api/samp/upload/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dirPath: currentPath,
          relativePaths: newEntries.map(e => e.relativePath)
        })
      });
      const data = await res.json();
      
      const toQueue = newEntries.map((e, idx) => ({
        id: Math.random().toString(36).substr(2, 9) + idx,
        file: e.file,
        relativePath: e.relativePath,
        status: 'pending' as const
      }));

      if (data.success && data.existingFiles.length > 0) {
        setCollisionItems(toQueue.filter(q => data.existingFiles.includes(q.relativePath)));
        setUploadQueue(prev => [...prev, ...toQueue]);
        setShowOverwriteModal(true);
      } else {
        setUploadQueue(prev => [...prev, ...toQueue]);
      }
    } catch (err) {
      toast.error('Failed to check file collisions');
    }

    setIsProcessing(false);
  };

  const handleOverwriteChoice = (overwrite: boolean) => {
    setShowOverwriteModal(false);
    setUploadQueue(prev => prev.map(item => {
      if (item.status === 'pending' && collisionItems.some(c => c.id === item.id)) {
        return { ...item, status: overwrite ? 'pending' : 'collided' };
      }
      return item;
    }));
    setCollisionItems([]);
  };

  // Queue Processor
  useEffect(() => {
    const processQueue = async () => {
      const MAX_CONCURRENT = 3;
      const activeCount = uploadQueue.filter(q => q.status === 'uploading').length;
      
      if (activeCount >= MAX_CONCURRENT) return;

      const pendingItems = uploadQueue.filter(q => q.status === 'pending');
      if (pendingItems.length === 0) {
        // If everything is completed/error/collided, maybe reload files once
        if (uploadQueue.length > 0 && activeCount === 0 && uploadQueue.some(q => q.status === 'completed')) {
          loadFiles(currentPath);
        }
        return;
      }

      const itemsToStart = pendingItems.slice(0, MAX_CONCURRENT - activeCount);
      
      setUploadQueue(prev => prev.map(item => 
        itemsToStart.some(start => start.id === item.id) ? { ...item, status: 'uploading' } : item
      ));

      for (const item of itemsToStart) {
        uploadItem(item);
      }
    };

    const uploadItem = async (item: any) => {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('dirPath', currentPath);
      formData.append('relativePath', item.relativePath);

      try {
        const res = await fetch('/api/samp/upload', {
          method: 'POST',
          body: formData
        });
        
        const data = await res.json();
        
        setUploadQueue(prev => prev.map(q => {
          if (q.id === item.id) {
            return { ...q, status: data.success ? 'completed' : 'error', error: data.error };
          }
          return q;
        }));
      } catch (err: any) {
        setUploadQueue(prev => prev.map(q => {
          if (q.id === item.id) return { ...q, status: 'error', error: err.message };
          return q;
        }));
      }
    };

    processQueue();
  }, [uploadQueue, currentPath]);

  const clearCompletedQueue = () => {
    setUploadQueue(prev => prev.filter(q => q.status === 'pending' || q.status === 'uploading'));
  };

  const filteredFiles = files.filter(f => {
    // Hide .so libraries unless explicitly enabled
    if (!showSoFiles && f.type === 'file' && (f.name.endsWith('.so') || f.name.includes('.so.'))) {
      return false;
    }
    // Apply search filter
    return !fileSearch.trim() || f.name.toLowerCase().includes(fileSearch.toLowerCase().trim());
  });

  return (
    <div 
      className={`flex-1 h-full w-full flex flex-col overflow-hidden rounded-b-lg transition-colors ${isDragging ? 'bg-primary/10 border-2 border-dashed border-primary' : 'bg-background/50'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
    >
      <div className="p-4 space-y-3 flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Top bar with quick toggle & path stats */}
        <div className="flex items-center justify-between gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDeployTools(prev => !prev)}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border-border/40 gap-1.5 bg-black/40"
          >
            {showDeployTools ? <ChevronDown className="w-3.5 h-3.5 text-primary" /> : <ChevronRight className="w-3.5 h-3.5 text-primary" />}
            <span>Deployment & Setup Tools</span>
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{files.length} items</span>
            {fileSearch && <span className="text-primary font-mono">({filteredFiles.length} matching)</span>}
          </div>
        </div>

        {/* Quick Setups & Archive (Collapsible) */}
        {showDeployTools && (
          <div className="flex flex-wrap gap-3 flex-shrink-0 pb-1">
            <Card className="flex-1 min-w-[260px] bg-black/40 border-border/40 p-3.5 flex flex-col justify-between space-y-2.5">
              <div>
                <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-0.5">
                  <Rocket className="w-3.5 h-3.5" /> Quick Setup
                </h3>
                <p className="text-[11px] text-muted-foreground">Downloads the latest compatible Linux/Windows open.mp binaries directly from GitHub.</p>
              </div>
              <div className="flex gap-2 w-full">
                <Button 
                  onClick={handleInstallLatestOMP} 
                  disabled={isProcessing}
                  size="sm"
                  className="bg-primary text-black hover:bg-primary/80 font-bold h-8 text-xs flex-1 px-2"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Install open.mp
                </Button>
                <Button 
                  onClick={handleGrabMissingLibraries} 
                  disabled={isProcessing}
                  size="sm"
                  variant="outline"
                  title="Fix missing .so library errors"
                  className="h-8 text-xs border-primary/40 text-primary hover:bg-primary hover:text-black flex-1 px-2"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Grab Libraries
                </Button>
              </div>
            </Card>

            <Card className="flex-[2] min-w-[300px] bg-black/40 border-border/40 p-3.5 flex flex-col justify-between space-y-2.5">
              <div>
                <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-0.5">
                  <Rocket className="w-3.5 h-3.5" /> Git Deployment
                </h3>
                <p className="text-[11px] text-muted-foreground mb-1.5">Sync server files directly from a private Git repository.</p>
                {deployKey && (
                  <div className="text-[10px] font-mono bg-black/60 p-1.5 rounded text-muted-foreground break-all mb-1.5 relative group cursor-pointer border border-border/30 hover:border-primary/50 transition-colors" onClick={() => { navigator.clipboard.writeText(deployKey); toast.success('SSH Key copied!'); }}>
                    {deployKey}
                    <span className="absolute right-2 top-1 opacity-0 group-hover:opacity-100 bg-black text-white px-1.5 py-0.5 rounded shadow text-[9px]">Copy Key</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="git@github.com:user/repo.git"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  disabled={isProcessing}
                  className="font-mono text-xs bg-black/60 h-8"
                />
                <Button 
                  onClick={handleGitDeploy} 
                  disabled={isProcessing || !repoUrl.trim()}
                  size="sm"
                  className="bg-primary text-black hover:bg-primary/80 font-bold h-8 text-xs whitespace-nowrap px-3"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Pull Latest
                </Button>
              </div>
            </Card>

            <Card className="flex-1 min-w-[260px] bg-black/40 border-border/40 p-3.5 flex flex-col justify-between space-y-2.5">
              <div>
                <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 mb-0.5">
                  <DownloadCloud className="w-3.5 h-3.5" /> Custom Archive
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Extract a <code className="text-primary">.zip</code> or <code className="text-primary">.tar.gz</code> archive URL into root.
                </p>
              </div>
              <form onSubmit={handleCustomArchiveDownload} className="flex gap-2">
                <Input
                  placeholder="https://example.com/gamemode.zip"
                  value={archiveUrl}
                  onChange={(e) => setArchiveUrl(e.target.value)}
                  disabled={isProcessing}
                  className="font-mono text-xs bg-black/60 h-8"
                />
                <Button type="submit" disabled={isProcessing || !archiveUrl} variant="secondary" size="sm" className="h-8 px-2.5">
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileArchive className="w-3.5 h-3.5" />}
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* File Browser Table Section */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border border-border/30 rounded-lg bg-[#0a0a0a]">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 border-b border-border/30 flex-shrink-0 gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground overflow-hidden">
              <span className="text-primary font-semibold">/samp-server</span>
              {currentPath && <span className="truncate text-foreground/80">/{currentPath}</span>}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Filter Search Box */}
              <div className="relative w-36 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Filter files..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  className="h-7 pl-8 pr-2 text-xs bg-black/60 border-border/40 font-mono"
                />
              </div>

              <Button
                variant={showSoFiles ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSoFiles(prev => !prev)}
                className={`h-7 px-2.5 text-xs border border-border/40 bg-black/40 ${showSoFiles ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                title="Toggle visibility of .so library files"
              >
                {showSoFiles ? "Hide .so" : "Show .so"}
              </Button>

              {uploadProgress !== null && (
                <div className="text-xs font-mono text-emerald-400 flex items-center bg-emerald-400/10 px-2 h-7 rounded border border-emerald-400/20">
                  Uploading: {uploadProgress}%
                </div>
              )}
              <label className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2.5 border border-border/40 bg-black/40">
                <Upload className="w-3.5 h-3.5 mr-1 text-primary" /> Upload
                <input type="file" className="hidden" onChange={handleUploadFile} disabled={isProcessing} />
              </label>
              <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs border border-border/40 bg-black/40" onClick={handleCreateFile} disabled={isProcessing}>
                <Plus className="w-3.5 h-3.5 mr-1 text-primary" /> New File
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground border border-border/40 bg-black/40" onClick={() => loadFiles(currentPath)} disabled={isLoadingFiles || isProcessing}>
                <Loader2 className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin text-primary' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* Scrollable File List */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-muted-foreground bg-black/50 uppercase sticky top-0 backdrop-blur-sm z-10 border-b border-border/20">
                <tr>
                  <th className="px-3.5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium w-24">Size</th>
                  <th className="px-3.5 py-2 font-medium w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPath && (
                  <tr className="border-b border-border/10 hover:bg-white/5 cursor-pointer transition-colors" onClick={handleNavigateUp}>
                    <td className="px-3.5 py-2 flex items-center gap-2 text-primary font-medium">
                      <CornerUpLeft className="w-3.5 h-3.5" /> ..
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                )}
                {filteredFiles.map((file, i) => (
                  <tr key={i} className="border-b border-border/10 hover:bg-white/5 group transition-colors">
                    <td className="px-3.5 py-1.5 flex items-center gap-2">
                      {file.isDirectory ? (
                        <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      )}
                      {file.isDirectory ? (
                        <span className="cursor-pointer hover:underline text-foreground font-medium" onClick={() => handleNavigate(file.name)}>
                          {file.name}
                        </span>
                      ) : (
                        <span className="text-foreground/90 font-mono text-[11px]">{file.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground text-[11px] font-mono">
                      {file.isDirectory ? '--' : `${(file.size / 1024).toFixed(1)} KB`}
                    </td>
                    <td className="px-3.5 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!file.isDirectory && (file.name.endsWith('.sh') || file.name.endsWith('.exe') || file.name.includes('samp03svr') || file.name.includes('omp-server') || file.name.includes('announce')) && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-purple-400 hover:bg-purple-400/20" onClick={() => handleSetLaunchScript(file.name)} title="Set as Launch Script">
                            <Rocket className="w-3 h-3" />
                          </Button>
                        )}
                        {!file.isDirectory && file.name.endsWith('.sql') && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-400 hover:bg-emerald-400/20" onClick={() => handleExecuteSqlFile(file.name)} title="Execute SQL File">
                            <Database className="w-3 h-3" />
                          </Button>
                        )}
                        {!file.isDirectory && (file.name.endsWith('.zip') || file.name.endsWith('.tar.gz')) && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-cyan-400 hover:bg-cyan-400/20" onClick={() => handleUnzip(file.name)} title="Extract Archive Here">
                            <PackageOpen className="w-3 h-3" />
                          </Button>
                        )}
                        {file.isDirectory && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-400 hover:bg-emerald-400/20" onClick={() => handleExecuteSqlFolder(file.name)} title="Execute all SQL in folder">
                            <Database className="w-3 h-3" />
                          </Button>
                        )}
                        {!file.isDirectory && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-400 hover:bg-blue-400/20" onClick={() => handleEditFile(file.name)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-amber-400 hover:bg-amber-400/20" onClick={() => handleRename(file.name)}>
                          <Type className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-400 hover:bg-rose-400/20" onClick={() => handleDelete(file.name)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredFiles.length === 0 && !isLoadingFiles && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic text-xs">
                      {fileSearch ? `No files match "${fileSearch}"` : 'Directory is empty'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Upload Queue Floating Panel */}
      {uploadQueue.length > 0 && (
        <div className="absolute bottom-4 right-4 w-80 bg-card border border-border/50 rounded-lg shadow-xl shadow-black/50 flex flex-col overflow-hidden z-50">
          <div className="bg-primary/10 p-3 border-b border-border/50 flex justify-between items-center">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Upload Queue
            </h4>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-black/40" onClick={clearCompletedQueue}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto p-2 space-y-1 bg-black/40">
            {uploadQueue.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 text-xs rounded bg-card/40">
                <span className="truncate max-w-[180px]" title={item.relativePath}>{item.relativePath}</span>
                <span className="flex-shrink-0 flex items-center gap-1">
                  {item.status === 'pending' && <span className="text-muted-foreground">Pending</span>}
                  {item.status === 'uploading' && <><Loader2 className="w-3 h-3 animate-spin text-blue-400" /> <span className="text-blue-400">Uploading</span></>}
                  {item.status === 'completed' && <span className="text-emerald-400 font-bold">Done</span>}
                  {item.status === 'error' && <span className="text-red-400" title={item.error}>Error</span>}
                  {item.status === 'collided' && <span className="text-yellow-400">Skipped</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-border/50 bg-black/60 text-[10px] text-muted-foreground flex justify-between">
            <span>{uploadQueue.filter(q => q.status === 'completed').length} / {uploadQueue.length} Completed</span>
            <span>{uploadQueue.filter(q => q.status === 'uploading').length} Active</span>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Modal */}
      {showOverwriteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-card border-border/50 shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-500/20 p-2 rounded-full">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">File Collision Detected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {collisionItems.length} of the files you are uploading already exist on the server. Do you want to overwrite them or skip them?
                </p>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto bg-black/40 rounded p-2 text-xs font-mono text-muted-foreground border border-border/40">
              {collisionItems.map(item => (
                <div key={item.id} className="truncate">{item.relativePath}</div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <Button variant="outline" className="border-border/50" onClick={() => handleOverwriteChoice(false)}>
                Skip Existing
              </Button>
              <Button className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold" onClick={() => handleOverwriteChoice(true)}>
                Overwrite All
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
