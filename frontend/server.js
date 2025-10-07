const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Determine data directory path (local vs production)
let dataPath;
if (fs.existsSync(path.join(__dirname, 'data'))) {
  // Production: data folder copied to frontend directory
  dataPath = path.join(__dirname, 'data');
} else {
  // Development: data folder in parent directory
  dataPath = path.join(__dirname, '..', 'data');
}

console.log(`Serving data from: ${dataPath}`);

// Serve data files BEFORE static middleware
app.use('/data', express.static(dataPath, {
  index: false,
  dotfiles: 'ignore'
}));

// Serve static files from the public directory with proper MIME types
app.use(express.static(path.join(__dirname, 'public'), {
  index: 'index.html',
  extensions: ['html'],
  dotfiles: 'ignore',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Explicit root route as fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`server running at http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop the server`);
});
