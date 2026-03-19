import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const orders = [];

  app.post('/api/orchestration/order', (req, res) => {
    const { type, payload } = req.body;
    const orderId = `SS-${Math.floor(1000 + Math.random() * 9000)}`;
    const order = {
      id: orderId,
      type,
      status: 'PROCESSING',
      timestamp: new Date().toISOString(),
      payload,
    };

    orders.push(order);

    setTimeout(() => {
      const index = orders.findIndex((currentOrder) => currentOrder.id === orderId);
      if (index !== -1) {
        orders[index].status = 'COMPLETED';
      }
    }, 2000);

    res.json(order);
  });

  app.get('/api/orchestration/orders', (_req, res) => {
    res.json(orders);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
