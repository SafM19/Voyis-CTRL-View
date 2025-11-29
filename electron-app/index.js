const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');
const { Client } = require('pg');

// Create PostgreSQL client connection
const client = new Client({
  host: '192.168.0.105',  // Replace with your M1 Mac's local IP address
  port: 5432,             // Default PostgreSQL port
  user: 'myuser',         // PostgreSQL username
  password: 'mypass',     // PostgreSQL password
  database: 'testdb'      // Database name
});

// Connect to PostgreSQL
client.connect()
  .then(() => console.log('Connected to PostgreSQL database!'))
  .catch(err => console.error('Connection error', err.stack));

// Function to fetch users (for testing)
async function fetchUsers() {
  try {
    const res = await client.query('SELECT * FROM testTable');
    console.log(res.rows);  // Output the query result
  } catch (err) {
    console.error('Error executing query', err.stack);
  }
}
fetchUsers()
// Function to save image into the database
async function saveImage({ filePath, buffer, filename, filetype, uploadUser, corrupt }) {
  try {
    // Load file data (if a path is provided)
    const fileData = buffer instanceof Buffer ? buffer : fs.readFileSync(filePath);

    const sizeBytes = fileData.length;

    const query = `
      INSERT INTO images (filename, filetype, size_bytes, data, upload_user, corrupt)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;

    const values = [
      filename,
      filetype,
      sizeBytes,
      fileData,  // BYTEA value
      uploadUser,
      corrupt
    ];

    const result = await client.query(query, values);
    console.log("Inserted image with ID:", result.rows[0].id);
    return result.rows[0].id;
  } catch (err) {
    console.error('Error saving image:', err);
    throw err;
  }
}

// Function to insert user into the 'testTable'
async function insertUser(username, email) {
  try {
    const query = `
      INSERT INTO testTable (username, email, created_at)
      VALUES ($1, $2, NOW())
      RETURNING test_id;
    `;

    const res = await client.query(query, [username, email]);

    console.log(`User inserted with test_id: ${res.rows[0].test_id}`);

  } catch (err) {
    console.error('Error inserting user:', err);
  }
}

// Function to get the size of a file (in bytes) based on its filename
function getFileSize(filename) {
  try {
    // Get the absolute file path
    const filePath = path.resolve(filename);

    // Use fs.statSync to get file stats synchronously
    const stats = fs.statSync(filePath);

    // Return the file size in bytes
    return stats.size;
  } catch (err) {
    console.error('Error reading file size:', err.message);
    return -1;  // Return -1 if there was an error
  }
}
async function getImageById(imageId) {
  try {
    // Hardcoded imageId to 1 for now
    const query = 'SELECT data FROM images WHERE id = 1'; // imageId is fixed to 1
    const res = await client.query(query);

    if (res.rows.length > 0) {
      const imageData = res.rows[0].data; // Assuming image data is stored in a BYTEA column
      return imageData;
    } else {
      throw new Error('Image not found');
    }
  } catch (err) {
    console.error('Error fetching image:', err);
    throw err;
  }
}

// When the renderer (front-end) requests the image, send the image data as base64
ipcMain.handle('fetch-image', async () => {
  try {
    const imageData = await getImageById(1); // Always fetch image with id = 1
    const base64Image = imageData.toString('base64');
    return `data:image/jpeg;base64,${base64Image}`; // Assuming the image is JPEG
  } catch (err) {
    console.error('Error processing image:', err);
    return null;
  }
});
// Create the main window of the Electron app
const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadURL('http://localhost:3000');
};

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
// Electron app logic
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
    // Close the client connection when the app quits
    client.end()
      .then(() => console.log('Database connection closed'))
      .catch(err => console.error('Error closing database connection:', err));
    app.quit();
  }
});

// Function to handle file size and log it
const filename = "testphoto.jpeg";  // Replace with your actual file path
const fileSize = getFileSize(filename);
console.log(`File size: ${fileSize} bytes`);
