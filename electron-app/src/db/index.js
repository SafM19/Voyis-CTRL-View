//I am running Windows on Parallels on my Mac M1. This is needed for
//connecting to postgres container

const { Client, types } = require('pg');

types.setTypeParser(17, val => Buffer.from(val.slice(2), 'hex'));

const client = new Client({
  host: '10.211.55.2',   // macOS host under Parallels Shared Network
  port: 5432,
  user: 'myuser',
  password: 'mypass',
  database: 'testdb'
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL database!'))
  .catch(err => console.error('Connection error:', err));

module.exports = { client };
