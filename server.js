import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files from the dist directory created by vite build
const distPath = path.join(__dirname, 'dist');

if (!fs.existsSync(distPath)) {
  console.error("CRITICAL ERROR: 'dist' directory not found. Run 'npm run build' before starting the server.");
}

app.use(express.static(distPath));

// Handle SPA routing: return index.html for any unknown path so react-router works
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Application build not found. Please run build process.");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});