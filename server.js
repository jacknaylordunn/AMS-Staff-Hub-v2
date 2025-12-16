
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

console.log("Starting Aegis Server...");
console.log(`Serving files from: ${distPath}`);

if (!fs.existsSync(distPath)) {
  console.error("CRITICAL ERROR: 'dist' directory not found. Run 'npm run build' before starting the server.");
}

// Serve static assets (JS, CSS, Images) directly
app.use(express.static(distPath));

// Handle SPA routing: Send index.html for any unknown route
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Application build not found. Please run 'npm run build'.");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
