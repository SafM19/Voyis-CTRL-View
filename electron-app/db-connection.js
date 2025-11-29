// dbConnection.js
const { Client } = require('pg');

const client = new Client({
  host: '192.168.0.103',   // Replace with your M1 Mac's local IP address
  port: 5432,            // Default PostgreSQL port
  user: 'myuser',          // PostgreSQL username
  password: 'mypass',  // PostgreSQL password
  database: 'testdb' // PostgreSQL database name
});

// Connect to PostgreSQL
client.connect()
  .then(() => console.log('Connected to PostgreSQL database!'))
  .catch(err => console.error('Connection error', err.stack));

// Export the client to use elsewhere in your app
module.exports = client;
