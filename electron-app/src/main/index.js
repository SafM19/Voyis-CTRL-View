const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('fs');
const { client } = require('../db/index');
const { saveImage, getImageById, insertFromConfig } = require('../db/image-functions');

// Load folder config
function loadFolderConfig() {
  const configPath = path.join(__dirname, '../../folder-config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}
const folderConfig = loadFolderConfig();

//Log helper
function logToRenderer(message) {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach(win => {
    win.webContents.send('log-from-main', message);
  });
}

// IPC Handlers 

// Check for duplicate by filename
ipcMain.handle('check-duplicate', async (event, filename) => {
  try {
    const res = await client.query(
      'SELECT COUNT(*) FROM images WHERE filename = $1',
      [filename]
    );
    return res.rows[0].count > 0; // true if exists
  } catch (err) {
    console.error('Error checking duplicate:', err);
    return false;
  }
});

// Run batch insert from folder config
ipcMain.handle('run-batch-insert', async () => {
  try {
    const result = await insertFromConfig();
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Fetch all images
ipcMain.handle('fetchAllImages', async () => {
  try {
    logToRenderer(`Fetching images`);
    const res = await client.query(`
      SELECT id, filename, filetype, size_bytes, upload_user, corrupt, data
      FROM images
      ORDER BY id
    `);

    return res.rows.map(row => {
      const data = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data, 'hex');
      return {
        id: row.id,
        filename: row.filename,
        filetype: row.filetype,
        sizeBytes: row.size_bytes,
        uploadUser: row.upload_user,
        corrupt: row.corrupt,
        src: `data:${row.filetype};base64,${data.toString('base64')}`
      };
    });
  } catch (err) {
    console.error('Error fetching images:', err);
    logToRenderer(`Error fetching images: ${err.message}`);
    return [];
  }
});

// Fetch filtered images
ipcMain.handle('fetchImagesFiltered', async (event, filetypes) => {
  try {
    let query = `SELECT id, filename, filetype, size_bytes, upload_user, corrupt, data FROM images`;
    const values = [];

    if (filetypes && filetypes.length > 0) {
      const placeholders = filetypes.map((_, i) => `$${i + 1}`).join(",");
      query += ` WHERE filetype IN (${placeholders})`;
      values.push(...filetypes);
    }

    query += ` ORDER BY id`;
    const res = await client.query(query, values);

    return res.rows.map(row => {
      const data = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data, 'hex');
      return {
        id: row.id,
        filename: row.filename,
        filetype: row.filetype,
        sizeBytes: row.size_bytes,
        uploadUser: row.upload_user,
        corrupt: row.corrupt,
        src: `data:${row.filetype};base64,${data.toString('base64')}`
      };
    });
  } catch (err) {
    console.error('Error fetching filtered images:', err);
    return [];
  }
});


// Save cropped image
ipcMain.handle('save-cropped-image', async (event, { base64, filename }) => {
  const buffer = Buffer.from(base64, 'base64');
  const id = await saveImage({
    buffer,
    filename,
    filetype: 'png',
    uploadUser: 'user',
    corrupt: 0
  });
  return id;
});

// Get single image by ID -- for testing
ipcMain.handle('getImageById', async (event, id) => {
  try {
    const { filetype, data } = await getImageById(id);
    const base64 = data.toString('base64');
    return `data:${filetype};base64,${base64}`;
  } catch (err) {
    console.error('Error fetching image by ID:', err);
    return null;
  }
});

// Choose folder
ipcMain.handle("export:chooseFolder", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Export Folder",
    properties: ["openDirectory", "createDirectory"]
  });

  if (result.canceled) return null; 
  return result.filePaths[0];
});

// Export images 
ipcMain.handle("export:images", async (event, { images, folder }) => {
  try {
    if (!folder) throw new Error("No folder selected");
    if (!Array.isArray(images) || images.length === 0) {
      throw new Error("No images to export");
    }

    const failed = [];

    for (const img of images) {
      try {
        if (!img.src) throw new Error("Missing src");

        const parts = img.src.split(",");
        if (parts.length !== 2) throw new Error("Invalid base64 format");

        const base64 = parts[1];
        const buffer = Buffer.from(base64, "base64");

        const filePath = path.join(folder, img.filename || `image_${Date.now()}.png`);
        fs.writeFileSync(filePath, buffer);
      } catch (imgErr) {
        console.error(`Failed to export ${img.filename}:`, imgErr.message);
        failed.push(img.filename || "unknown");
      }
    }

    if (failed.length > 0) {
      return { success: false, error: `Failed to export: ${failed.join(", ")}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Sync
// Read local images from DB
async function getLocalImages() {
  const res = await client.query("SELECT filename, updated_at FROM images");
  return res.rows;
}

// Save image locally in DB
async function saveLocalImage(img, exists) {
  const buffer = img.data;

  if (exists) {
    await updateImage({
      buffer,
      filename: img.filename,
      filetype: path.extname(img.filename).slice(1),
      uploadUser: "server-sync",
      corrupt: 0,
      updatedAt: img.updated_at
    });
  } else {
    await saveImage({
      buffer,
      filename: img.filename,
      filetype: path.extname(img.filename).slice(1),
      uploadUser: "server-sync",
      corrupt: 0,
      updatedAt: img.updated_at
    });
  }
}


// Sync handler
ipcMain.handle("sync-from-server", async () => {
  try {
    const serverRes = await client.query(
      "SELECT filename, data, updated_at FROM images"
    );
    const serverImages = serverRes.rows;

    const localImages = await getLocalImages();

    let addedFiles = [];
    let updatedFiles = [];

    for (const sImg of serverImages) {
      const existing = localImages.find(l => l.filename === sImg.filename);

      if (!existing) {
        await saveLocalImage(sImg, false);
        addedFiles.push(sImg.filename);
      } else {
        const serverTS = new Date(sImg.updated_at);
        const localTS = new Date(existing.updated_at);

        if (serverTS > localTS) {
          await saveLocalImage(sImg, true);
          updatedFiles.push(sImg.filename);
        }
      }
    }

    return {
      status: "ok",
      strategy: "Server Always Wins",
      added: addedFiles,
      updated: updatedFiles
    };

  } catch (err) {
    console.error("Sync error:", err);
    return {
      status: "error",
      error: err.message
    };
  }
});

// Create window and point to react app
const createWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadURL('http://localhost:3000'); 
};

// App events
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    client.end()
      .then(() => console.log('Database connection closed'))
      .catch(err => console.error('Error closing database connection:', err));
    app.quit();
  }
});
