const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');
const {client} = require('../db/index')
const {saveImage, getImageById, insertFromConfig} = require('../db/image-functions')
const { Client } = require('pg');


function loadFolderConfig() {
  const configPath = path.join(__dirname,  '../../folder-config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const folderConfig = loadFolderConfig();

//console.log("Resolved preload path:", path.join(__dirname, '../renderer/preload.js'));
// Function to fetch users (for testing)
/*async function fetchUsers() {
  try {
    const res = await client.query('SELECT * FROM testTable');
    console.log(res.rows);  // Output the query result
  } catch (err) {
    console.error('Error executing query', err.stack);
  }
}
fetchUsers()*/
// Test function to get img id 1
/*
ipcMain.handle('fetchImage', async () => {
  try {
    console.log("fetchImage IPC called");
    const { filetype, data } = await getImageById(1);
    console.log("Fetched image data length:", data.length);

    const base64 = data.toString('base64');
    const dataUrl = `data:${filetype};base64,${base64}`;
    return dataUrl;
  } catch (err) {
    console.error("Error processing image in IPC:", err);
    return null;
  }
});
*/

//Insert on click of upload button
//Inserts all files in folder **NEED TO CHECK FOR DUPLICATES**
ipcMain.handle("run-batch-insert", async () => {
  return await insertFromConfig();
});

//Get all images from db to display on screen
//Runs on first render and on click of reload button
ipcMain.handle('fetchAllImages', async () => {
  try {
    const res = await client.query(`
      SELECT id, filename, filetype, size_bytes, upload_user, corrupt, data
      FROM images
      ORDER BY id
    `);

    // Return array of objects containing both src and metadata
    const images = res.rows.map(row => {
      let data = row.data;
      if (!(data instanceof Buffer)) {
        data = Buffer.from(data, 'hex'); 
      }
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
    return images;
  } catch (err) {
    console.error("Error fetching images:", err);
    return [];
  }
});

// Save new image from selected portion i.e. crop
ipcMain.handle("save-cropped-image", async (event, { base64, filename }) => {
  const buffer = Buffer.from(base64, "base64"); 
  const id = await saveImage({
    buffer,
    filename,
    filetype: "png",
    uploadUser: "user",
    corrupt: 0
  });
  return id;
});


//handling filtered images
ipcMain.handle('fetchImagesFiltered', async (event, filetype) => {
  try {
    let query = `
      SELECT id, filename, filetype, size_bytes, upload_user, corrupt, data
      FROM images
    `;

    const values = [];

    if (filetype) {
      query += ` WHERE filetype = $1`;
      values.push(filetype);
    }

    query += ` ORDER BY id`;

    const res = await client.query(query, values);

    const images = res.rows.map(row => {
      let data = row.data;
      if (!(data instanceof Buffer)) {
        data = Buffer.from(data, 'hex');
      }

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

    return images;
  } catch (err) {
    console.error("Error fetching filtered images:", err);
    return [];
  }
});

//Window creation and pointing to react
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'), 
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false 
    }
  });

  win.loadURL('http://localhost:3000'); 
};

//Test function to save specific image
/*(async () => {
  try {
    // Save the image and get the image ID
    const imageId = await saveImage({
      filePath: "testphoto.jpeg",     // Replace with your actual file path
      filename: "testphoto.jpeg",
      filetype: "image/jpeg",
      uploadUser: "Saf",
      corrupt: 0
    });

    console.log("Inserted image with ID:", imageId);

    // Fetch users after saving the image (optional)
    await fetchUsers();  // Assuming you want to fetch users after saving the image
  } catch (err) {
    console.error("Error saving image:", err);
  }
})();
*/

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
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

