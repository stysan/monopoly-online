const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');
const db = require('./db/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Init DB first, then routes & sockets
db.initDb().then(() => {
  const apiRouter = require('./routes/api');
  const setupSockets = require('./game/sockets');

  app.use('/api', apiRouter);
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

  setupSockets(io);

  server.listen(PORT, () => {
    console.log(`\n🎲 Monopoly Online running at http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
