const http = require('http');
const config = require('./config');
const db = require('./db');
const { createApp } = require('./app');
const { setupSocketIO } = require('./socket');

// Initialize database
db.initDb();

const app = createApp();
const server = http.createServer(app);

// Attach Socket.IO
const io = setupSocketIO(server);
app.set('io', io);

server.listen(config.PORT, () => {
  console.log(`[Server] Real-time messaging backend running on port ${config.PORT}`);
  console.log(`[Server] Database connected at: ${config.DB_PATH}`);
});
