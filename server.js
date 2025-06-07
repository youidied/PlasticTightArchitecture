// server.js - Fixed Node.js server for menu management system with improved data handling

// ======================
// 1. IMPORTS AND SETUP
// ======================
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();

// ======================
// 2. MIDDLEWARE
// ======================
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(__dirname)); // Serve static files from root

// ======================
// 3. SESSION MANAGEMENT
// ======================
const activeSessions = new Set();

function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : req.headers['x-admin-token'];

  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ======================
// 4. DATA UTILITIES
// ======================
async function ensureDataDirectory() {
  const dataDir = path.join(__dirname, 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  return dataDir;
}

async function getDataPath() {
  const dataDir = await ensureDataDirectory();
  return path.join(dataDir, 'menu-data.json');
}

// Create default menu data structure
function createDefaultMenuData() {
  return {
    adminCredentials: { 
      username: 'admin', 
      password: 'admin123' 
    },
    menuCategories: [],
    metadata: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

// Load and parse menu data from file
async function loadMenuData() {
  try {
    const dataPath = await getDataPath();
    
    // Check if file exists
    try {
      await fs.access(dataPath);
    } catch {
      // Create default data file if it doesn't exist
      const defaultData = createDefaultMenuData();
      await fs.writeFile(dataPath, JSON.stringify(defaultData, null, 2), 'utf8');
      console.log('Created default data file at:', dataPath);
      return defaultData;
    }

    // Read and parse existing file
    const data = await fs.readFile(dataPath, 'utf8');
    
    // Handle empty file
    if (!data.trim()) {
      const defaultData = createDefaultMenuData();
      await fs.writeFile(dataPath, JSON.stringify(defaultData, null, 2), 'utf8');
      console.log('Empty data file found, created default data');
      return defaultData;
    }

    let menuData;
    try {
      menuData = JSON.parse(data);
    } catch (parseError) {
      console.error('Error parsing JSON data:', parseError);
      console.log('Creating backup of corrupted file and creating new default data');
      
      // Backup corrupted file
      const backupPath = `${dataPath}.corrupted.${Date.now()}.bak`;
      await fs.writeFile(backupPath, data, 'utf8');
      
      // Create new default data
      const defaultData = createDefaultMenuData();
      await fs.writeFile(dataPath, JSON.stringify(defaultData, null, 2), 'utf8');
      return defaultData;
    }

    // Ensure data structure consistency and fix any missing fields
    const fixedData = validateAndFixDataStructure(menuData);
    
    // Save fixed data back to file if changes were made
    if (JSON.stringify(fixedData) !== JSON.stringify(menuData)) {
      await fs.writeFile(dataPath, JSON.stringify(fixedData, null, 2), 'utf8');
      console.log('Fixed data structure inconsistencies and saved to file');
    }

    return fixedData;
  } catch (error) {
    console.error('Error loading menu data:', error);
    // Return default data as fallback
    return createDefaultMenuData();
  }
}

// Validate and fix data structure
function validateAndFixDataStructure(data) {
  const fixedData = { ...data };

  // Ensure admin credentials exist
  if (!fixedData.adminCredentials || typeof fixedData.adminCredentials !== 'object') {
    fixedData.adminCredentials = { username: 'admin', password: 'admin123' };
  } else {
    if (!fixedData.adminCredentials.username) {
      fixedData.adminCredentials.username = 'admin';
    }
    if (!fixedData.adminCredentials.password) {
      fixedData.adminCredentials.password = 'admin123';
    }
  }

  // Ensure menu categories is an array
  if (!Array.isArray(fixedData.menuCategories)) {
    fixedData.menuCategories = [];
  }

  // Validate each category
  fixedData.menuCategories = fixedData.menuCategories.map(category => {
    const fixedCategory = { ...category };
    
    // Ensure category has required fields
    if (!fixedCategory.id) {
      fixedCategory.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    if (!fixedCategory.name) {
      fixedCategory.name = 'Unnamed Category';
    }
    if (!fixedCategory.icon) {
      fixedCategory.icon = 'fas fa-folder';
    }
    if (!Array.isArray(fixedCategory.items)) {
      fixedCategory.items = [];
    }

    // Validate each item in category
    fixedCategory.items = fixedCategory.items.map(item => {
      const fixedItem = { ...item };
      
      if (!fixedItem.id) {
        fixedItem.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
      }
      if (!fixedItem.name) {
        fixedItem.name = 'Unnamed Item';
      }
      if (typeof fixedItem.price !== 'number') {
        fixedItem.price = parseFloat(fixedItem.price) || 0;
      }
      if (!fixedItem.description) {
        fixedItem.description = '';
      }
      if (!fixedItem.image) {
        fixedItem.image = '';
      }

      return fixedItem;
    });

    return fixedCategory;
  });

  // Ensure metadata exists
  if (!fixedData.metadata || typeof fixedData.metadata !== 'object') {
    fixedData.metadata = {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: '1.0.0'
    };
  } else {
    if (!fixedData.metadata.created) {
      fixedData.metadata.created = new Date().toISOString();
    }
    if (!fixedData.metadata.lastModified) {
      fixedData.metadata.lastModified = new Date().toISOString();
    }
    if (!fixedData.metadata.version) {
      fixedData.metadata.version = '1.0.0';
    }
  }

  return fixedData;
}

// Save menu data with validation and backup
async function saveMenuData(menuData, createBackup = true) {
  try {
    // Validate data before saving
    const validatedData = validateAndFixDataStructure(menuData);
    
    // Update last modified timestamp
    validatedData.metadata.lastModified = new Date().toISOString();

    const dataPath = await getDataPath();
    
    if (createBackup) {
      // Create backup if original file exists
      try {
        await fs.access(dataPath);
        const currentData = await fs.readFile(dataPath, 'utf8');
        
        if (currentData.trim()) {
          const backupDir = path.join(path.dirname(dataPath), 'backups');
          await fs.mkdir(backupDir, { recursive: true });
          
          const backupPath = path.join(backupDir, `menu-data.backup.${Date.now()}.json`);
          await fs.writeFile(backupPath, currentData, 'utf8');
          console.log(`Backup created: ${backupPath}`);
          
          // Clean up old backups (keep only last 10)
          await cleanupOldBackups(backupDir);
        }
      } catch (error) {
        console.warn('Could not create backup:', error.message);
      }
    }

    // Write new data
    await fs.writeFile(dataPath, JSON.stringify(validatedData, null, 2), 'utf8');
    console.log('Menu data saved successfully at:', new Date().toISOString());
    
    return validatedData;
  } catch (error) {
    console.error('Error saving menu data:', error);
    throw error;
  }
}

// Clean up old backup files
async function cleanupOldBackups(backupDir) {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(file => file.startsWith('menu-data.backup.') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        timestamp: parseInt(file.replace('menu-data.backup.', '').replace('.json', ''))
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    // Remove old backups, keep only 10 most recent
    for (let i = 10; i < backupFiles.length; i++) {
      await fs.unlink(backupFiles[i].path);
      console.log(`Cleaned up old backup: ${backupFiles[i].name}`);
    }
  } catch (error) {
    console.warn('Could not clean up old backups:', error.message);
  }
}

// Get public menu data (without admin credentials)
function getPublicMenuData(fullData) {
  return {
    menuCategories: fullData.menuCategories || [],
    metadata: {
      lastModified: fullData.metadata?.lastModified || new Date().toISOString(),
      version: fullData.metadata?.version || '1.0.0'
    }
  };
}

// ======================
// 5. ROUTES - FRONTEND
// ======================
// Main route
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(404).send('<h1>404 - Index page not found</h1><p>Please ensure index.html exists in the root directory.</p>');
    }
  });
});

// Admin route
app.get('/admin', (req, res) => {
  const adminPath = path.join(__dirname, 'admin.html');
  res.sendFile(adminPath, (err) => {
    if (err) {
      console.error('Error serving admin.html:', err);
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Admin Panel</title>
          <meta charset="UTF-8">
        </head>
        <body>
          <h1>Admin Panel</h1>
          <p>Admin panel content would go here. Please create admin.html file.</p>
          <a href="/login">Login</a>
        </body>
        </html>
      `);
    }
  });
});

// Login route
app.get('/login', (req, res) => {
  const loginPath = path.join(__dirname, 'login.html');
  res.sendFile(loginPath, (err) => {
    if (err) {
      console.error('Error serving login.html:', err);
      res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <title>تسجيل الدخول - OnSea</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .login-container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { text-align: center; color: #333; margin-bottom: 30px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; color: #555; }
            input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .error { color: red; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="login-container">
            <h1>تسجيل الدخول</h1>
            <form id="loginForm">
              <div class="form-group">
                <label for="username">اسم المستخدم:</label>
                <input type="text" id="username" required>
              </div>
              <div class="form-group">
                <label for="password">كلمة المرور:</label>
                <input type="password" id="password" required>
              </div>
              <button type="submit">دخول</button>
              <div id="error" class="error"></div>
            </form>
          </div>
          <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const username = document.getElementById('username').value;
              const password = document.getElementById('password').value;
              const errorDiv = document.getElementById('error');

              try {
                const response = await fetch('/api/admin-login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                  sessionStorage.setItem('adminToken', data.token);
                  window.location.href = '/admin';
                } else {
                  errorDiv.textContent = data.error || 'Login failed';
                }
              } catch (error) {
                errorDiv.textContent = 'Network error. Please try again.';
              }
            });
          </script>
        </body>
        </html>
      `);
    }
  });
});

// ======================
// 6. ROUTES - API (PUBLIC)
// ======================
// Get public menu data (without admin credentials)
app.get('/api/menu-data', async (req, res) => {
  try {
    const fullData = await loadMenuData();
    const publicData = getPublicMenuData(fullData);
    res.json(publicData);
  } catch (error) {
    console.error('Error loading public menu data:', error);
    res.status(500).json({ 
      error: 'Failed to load menu data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin login endpoint
app.post('/api/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Load current admin credentials
    const fullData = await loadMenuData();
    const adminCredentials = fullData.adminCredentials;

    // Check credentials
    if (username === adminCredentials.username && password === adminCredentials.password) {
      const token = generateSessionToken();
      activeSessions.add(token);

      // Clean up old sessions after 24 hours
      setTimeout(() => {
        activeSessions.delete(token);
      }, 24 * 60 * 60 * 1000);

      console.log(`Admin login successful for user: ${username} at ${new Date().toISOString()}`);
      
      res.json({ 
        success: true, 
        message: 'Login successful',
        token: token,
        expiresIn: '24h'
      });
    } else {
      console.log(`Failed login attempt for user: ${username} at ${new Date().toISOString()}`);
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin logout endpoint
app.post('/api/admin-logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : req.headers['x-admin-token'];

  if (token) {
    activeSessions.delete(token);
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

// Verify token endpoint
app.get('/api/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : req.headers['x-admin-token'];

  if (token && activeSessions.has(token)) {
    res.json({ valid: true });
  } else {
    res.status(401).json({ valid: false });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeSessions: activeSessions.size,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// ======================
// 7. ROUTES - API (PROTECTED - REQUIRE AUTHENTICATION)
// ======================
// Get full menu data (including admin credentials) - for admin panel
app.get('/api/admin/menu-data', requireAuth, async (req, res) => {
  try {
    const fullData = await loadMenuData();
    res.json(fullData);
  } catch (error) {
    console.error('Error loading admin menu data:', error);
    res.status(500).json({ 
      error: 'Failed to load menu data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Save menu data
app.post('/api/save-menu', requireAuth, async (req, res) => {
  try {
    const menuData = req.body;

    // Validate the data structure
    if (!menuData || typeof menuData !== 'object') {
      return res.status(400).json({ error: 'Invalid menu data structure' });
    }

    const savedData = await saveMenuData(menuData, true);

    res.json({ 
      success: true, 
      message: 'Data saved successfully',
      timestamp: new Date().toISOString(),
      data: savedData
    });
  } catch (error) {
    console.error('Error saving menu data:', error);
    res.status(500).json({ 
      error: 'Failed to save menu data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Backup management endpoints
app.get('/api/backups', requireAuth, async (req, res) => {
  try {
    const dataDir = await ensureDataDirectory();
    const backupDir = path.join(dataDir, 'backups');

    try {
      await fs.access(backupDir);
    } catch {
      return res.json([]);
    }

    const files = await fs.readdir(backupDir);
    const backupFiles = await Promise.all(
      files
        .filter(file => file.startsWith('menu-data.backup.') && file.endsWith('.json'))
        .map(async file => {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          const timestamp = file.replace('menu-data.backup.', '').replace('.json', '');
          
          return {
            filename: file,
            timestamp: parseInt(timestamp),
            date: new Date(parseInt(timestamp)).toISOString(),
            size: stats.size,
            sizeFormatted: formatBytes(stats.size)
          };
        })
    );

    // Sort by timestamp (newest first)
    backupFiles.sort((a, b) => b.timestamp - a.timestamp);

    res.json(backupFiles);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

app.post('/api/restore-backup', requireAuth, async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename || !filename.startsWith('menu-data.backup.')) {
      return res.status(400).json({ error: 'Invalid backup filename' });
    }

    const dataDir = await ensureDataDirectory();
    const backupPath = path.join(dataDir, 'backups', filename);

    // Verify backup file exists
    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    // Read and validate backup file
    const backupData = await fs.readFile(backupPath, 'utf8');
    let parsedData;

    try {
      parsedData = JSON.parse(backupData);
    } catch {
      return res.status(400).json({ error: 'Invalid backup file format' });
    }

    // Validate data structure
    const validatedData = validateAndFixDataStructure(parsedData);

    // Save the restored data (this will create a backup of current data)
    await saveMenuData(validatedData, true);

    console.log(`Backup restored: ${filename} at ${new Date().toISOString()}`);
    res.json({ 
      success: true, 
      message: 'Backup restored successfully',
      data: validatedData
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

// System info endpoint (for debugging)
app.get('/api/system-info', requireAuth, async (req, res) => {
  try {
    const dataDir = await ensureDataDirectory();
    const dataPath = await getDataPath();

    let fileExists = false;
    let fileSize = 0;
    let lastModified = null;

    try {
      const stats = await fs.stat(dataPath);
      fileExists = true;
      fileSize = stats.size;
      lastModified = stats.mtime.toISOString();
    } catch {
      // File doesn't exist
    }

    res.json({
      dataDirectory: dataDir,
      dataFilePath: dataPath,
      fileExists,
      fileSize,
      fileSizeFormatted: formatBytes(fileSize),
      lastModified,
      backupsDirectory: path.join(dataDir, 'backups'),
      serverUptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      activeSessions: activeSessions.size
    });
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

// ======================
// 8. ERROR HANDLING
// ======================
// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.url,
    method: req.method
  });
});


// Replace this section at the bottom of your server.js:

// ======================
// 9. SERVER INITIALIZATION
// ======================
const PORT = process.env.PORT || 2000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

const server = app.listen(PORT, HOST, async () => {
  console.log('🚀 OnSea Menu Management Server Started');
  console.log('=====================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🔗 Main site: Available on assigned URL`);
  console.log(`🔐 Login page: /login`);
  console.log(`📊 Admin panel: /admin`);
  console.log(`💓 Health check: /api/health`);
  console.log('=====================================');

  // Initialize data on startup
  try {
    const dataDir = await ensureDataDirectory();
    console.log(`📂 Data directory ready: ${dataDir}`);
    
    // Load data to ensure it exists and is valid
    const data = await loadMenuData();
    console.log(`📄 Menu data loaded successfully - ${data.menuCategories.length} categories found`);
  } catch (error) {
    console.error('❌ Error initializing data:', error);
  }

  console.log('✅ Server ready to accept connections');
});

// ======================
// 10. PROCESS MANAGEMENT
// ======================
// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
