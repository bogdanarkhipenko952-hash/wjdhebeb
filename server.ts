import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Ensure Plus Bot exists
  try {
    const botExists = db.prepare('SELECT id FROM users WHERE id = ?').get('plus_bot');
    if (!botExists) {
      db.prepare('INSERT INTO users (id, username, name, avatar, bio) VALUES (?, ?, ?, ?, ?)').run(
        'plus_bot', 'plus_bot', 'Plus Bot', 'https://api.dicebear.com/7.x/bottts/svg?seed=plus', 'Pulse Plus Bot'
      );
    }
  } catch (e) {
    console.error('Failed to create bot user', e);
  }

  // Auth Routes
  app.post('/api/auth/register', (req, res) => {
    const { username, password, name, twoFactorCode } = req.body;
    const id = uuidv4();
    try {
      const stmt = db.prepare('INSERT INTO users (id, username, password, two_factor_code, name, avatar) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run(id, username, password, twoFactorCode, name, `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
      res.json(user);
    } catch (e) {
      res.status(400).json({ error: 'Username already exists' });
    }
  });

  // Auth
  app.get('/api/auth/check-username/:username', (req, res) => {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
    res.json({ available: !user });
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password, twoFactorCode } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Неверный основной пароль' });
    }

    if (user.two_factor_code && user.two_factor_code !== twoFactorCode) {
      return res.status(401).json({ error: 'Неверный второй пароль (2FA)' });
    }

    // Plus Bot Notification
    const botId = 'plus_bot';
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU');
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const content = `В ваш аккаунт был выполнен вход.\nДата: ${dateStr}\nВремя: ${timeStr}`;
    
    const msgId = Math.random().toString(36).substring(7);
    db.prepare('INSERT INTO messages (id, sender_id, receiver_id, content, type) VALUES (?, ?, ?, ?, ?)')
      .run(msgId, botId, user.id, content, 'text');

    res.json(user);
  });

  // Contacts
  app.get('/api/contacts/:userId', (req, res) => {
    const contacts = db.prepare(`
      SELECT u.* FROM users u
      JOIN user_contacts uc ON u.id = uc.contact_id
      WHERE uc.user_id = ?
    `).all(req.params.userId);
    res.json(contacts);
  });

  app.post('/api/contacts', (req, res) => {
    const { userId, username } = req.body;
    const contact = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as any;
    if (!contact) return res.status(404).json({ error: 'Пользователь не найден' });
    
    try {
      db.prepare('INSERT INTO user_contacts (id, user_id, contact_id) VALUES (?, ?, ?)')
        .run(Math.random().toString(36).substring(7), userId, contact.id);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: 'Контакт уже добавлен' });
    }
  });

  // User Profile
  app.get('/api/users/:id', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
    if (user) {
      const gifts = db.prepare('SELECT * FROM gifts WHERE owner_id = ?').all(user.id);
      const stories = db.prepare('SELECT * FROM stories WHERE user_id = ?').all(user.id);
      res.json({ ...user, gifts, stories });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT id, username, name, avatar, bio FROM users').all();
    res.json(users);
  });

  app.put('/api/users/:id', (req, res) => {
    const { name, bio, phoneNumber, avatar } = req.body;
    db.prepare('UPDATE users SET name = ?, bio = ?, phone_number = ?, avatar = ? WHERE id = ?')
      .run(name, bio, phoneNumber, avatar, req.params.id);
    res.json({ success: true });
  });

  // Stories
  app.post('/api/stories', (req, res) => {
    const { userId, mediaUrl } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO stories (id, user_id, media_url) VALUES (?, ?, ?)')
      .run(id, userId, mediaUrl);
    res.json({ success: true, id });
  });

  app.get('/api/stories', (req, res) => {
    const stories = db.prepare(`
      SELECT s.*, u.name, u.avatar 
      FROM stories s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.created_at >= datetime('now', '-24 hours')
      ORDER BY s.created_at DESC
    `).all();
    res.json(stories);
  });

  // Favorites
  app.post('/api/favorites', (req, res) => {
    const { userId, contactId } = req.body;
    const id = uuidv4();
    try {
      db.prepare('INSERT INTO favorites (id, user_id, contact_id) VALUES (?, ?, ?)')
        .run(id, userId, contactId);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: 'Already favorited' });
    }
  });

  app.delete('/api/favorites/:userId/:contactId', (req, res) => {
    const { userId, contactId } = req.params;
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND contact_id = ?')
      .run(userId, contactId);
    res.json({ success: true });
  });

  app.get('/api/favorites/:userId', (req, res) => {
    const favorites = db.prepare('SELECT contact_id FROM favorites WHERE user_id = ?').all(req.params.userId);
    res.json(favorites.map((f: any) => f.contact_id));
  });

  // Messaging
  app.get('/api/messages/:userId/:peerId', (req, res) => {
    const { userId, peerId } = req.params;
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
      OR (sender_id = ? AND receiver_id = ?)
      ORDER BY timestamp ASC
    `).all(userId, peerId, peerId, userId);
    res.json(messages);
  });

  // WebSocket for Real-time
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    let userId: string | null = null;

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'AUTH') {
        userId = message.userId;
        clients.set(userId!, ws);
        console.log(`User ${userId} connected`);
      }

      if (message.type === 'CHAT_MESSAGE') {
        const { senderId, receiverId, content, msgType, mediaUrl } = message.payload;
        const id = uuidv4();
        db.prepare('INSERT INTO messages (id, sender_id, receiver_id, content, type, media_url) VALUES (?, ?, ?, ?, ?, ?)')
          .run(id, senderId, receiverId, content, msgType || 'text', mediaUrl || null);
        
        const msgData = {
          type: 'NEW_MESSAGE',
          payload: { id, senderId, receiverId, content, type: msgType || 'text', mediaUrl: mediaUrl || null, timestamp: new Date().toISOString() }
        };

        // Send to receiver if online
        const receiverWs = clients.get(receiverId);
        if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
          receiverWs.send(JSON.stringify(msgData));
        }
        
        // Send back to sender for confirmation
        ws.send(JSON.stringify(msgData));
      }
    });

    ws.on('close', () => {
      if (userId) clients.delete(userId);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile('dist/index.html', { root: '.' }));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
