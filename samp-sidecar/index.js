const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 24002;
const SAMP_DIR = '/samp-server';

let sampProcess = null;

// Middleware to check API key
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  const expectedKey = process.env.SAMP_API_KEY;
  
  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    isRunning: sampProcess !== null,
    pid: sampProcess ? sampProcess.pid : null
  });
});

app.post('/api/start', (req, res) => {
  if (sampProcess !== null) {
    return res.json({ success: false, error: 'Server already running' });
  }

  // Detect executable
  let executable = './omp-server';
  if (!fs.existsSync(path.join(SAMP_DIR, 'omp-server'))) {
    if (fs.existsSync(path.join(SAMP_DIR, 'samp03svr'))) {
      executable = './samp03svr';
    }
  }

  try {
    sampProcess = spawn(executable, [], {
      cwd: SAMP_DIR,
      stdio: 'ignore', // Let it write to server_log.txt natively
      detached: true
    });

    sampProcess.on('exit', () => {
      sampProcess = null;
    });

    sampProcess.on('error', (err) => {
      console.error('SAMP process error:', err);
      sampProcess = null;
    });

    res.json({ success: true, pid: sampProcess.pid, executable });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/stop', (req, res) => {
  if (sampProcess) {
    try {
      sampProcess.kill('SIGTERM');
      setTimeout(() => {
        if (sampProcess) {
          sampProcess.kill('SIGKILL');
        }
      }, 2000);
    } catch (e) {}
  }
  res.json({ success: true });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`SAMP Sidecar listening on port ${port}`);
});
