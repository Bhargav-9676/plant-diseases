// server.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
