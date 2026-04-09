import { createServer } from 'http';
import { attachGameServer } from './src/server/gameServer';

const port = parseInt(process.env.PORT || '3001', 10);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:3000'];

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'baseball-pvp' }));
});

attachGameServer(httpServer, allowedOrigins);

httpServer.listen(port, () => {
  console.log(`> PvP server listening on port ${port}`);
  console.log(`> Allowed origins: ${allowedOrigins.join(', ')}`);
});
