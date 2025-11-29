const fs = require('fs');
const { client } = require('./index');
const config = require('../../folder-config.json');
const path = require("path");


//Save new image on selection of area on selected image i.e. save crop
async function saveImage({ buffer, filename, filetype, uploadUser, corrupt }) {
  const sizeBytes = buffer.length;
  const query = `
    INSERT INTO images (filename, filetype, size_bytes, data, upload_user, corrupt)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING id
  `;
  const values = [filename, filetype, sizeBytes, buffer, uploadUser, corrupt];
  const result = await client.query(query, values);
  return result.rows[0].id;
}


async function getImageById(imageId) {
  try {
    const res = await client.query(
      'SELECT filetype, data FROM images WHERE id = $1',
      [imageId]
    );

    if (res.rows.length === 0) {
      throw new Error('Image not found');
    }

    let { filetype, data } = res.rows[0];

    if (!(data instanceof Buffer)) {
      data = Buffer.from(data, 'hex');
    }

    return { filetype, data };  
  } catch (err) {
    console.error('Error fetching image:', err);
    throw err;
  }
}

/*async function insertFromConfig() {
  try {
    const configPath = path.join(__dirname, "../../folder-config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    for (const folder of config) {
      const { path: folderPath, fileTypes } = folder;

      const files = fs.readdirSync(folderPath);

      for (const file of files) {
        const ext = path.extname(file).toLowerCase().replace(".", "");

        if (!fileTypes.includes(ext)) continue; // only jpg/tif/png

        const fullPath = path.join(folderPath, file);

        await saveImage({
          filePath: fullPath,
          filename: file,
          filetype: ext,
          uploadUser: "batch",
          corrupt: 0
        });

        console.log("Inserted:", file);
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Batch insert error:", err);
    throw err;
  }
}*/

module.exports = { saveImage, getImageById};
