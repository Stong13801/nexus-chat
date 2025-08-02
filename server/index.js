const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const usersFile = path.join(__dirname, 'users.json');
const messagesDir = path.join(__dirname, 'messages');
const defaultChannels = ['general', 'random', 'support'];

// 📁 Создаём папку messages и базовые каналы при первом запуске
if (!fs.existsSync(messagesDir)) {
  fs.mkdirSync(messagesDir);
  for (const ch of defaultChannels) {
    fs.writeFileSync(path.join(messagesDir, `${ch}.json`), '[]');
  }
}

// 🧠 Загружаем пользователей из файла
let users = [];
try {
  users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
} catch {
  users = [];
}

// 🔐 РЕГИСТРАЦИЯ
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const exists = users.find((u) => u.username === username);
  if (exists) {
    return res.status(400).json({ message: 'Пользователь уже существует' });
  }

  const newUser = { username, password };
  users.push(newUser);
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  console.log('✅ Зарегистрирован:', username);
  res.status(200).json({ message: 'Успешно зарегистрирован' });
});

// 🔓 ВХОД
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Неверный логин или пароль' });
  }

  console.log('🔓 Вход выполнен:', username);
  res.status(200).json({ message: 'Вход успешен', username });
});

// 📥 ЗАГРУЗКА СООБЩЕНИЙ КАНАЛА
app.get('/messages/:channel', (req, res) => {
  const { channel } = req.params;
  try {
    const filePath = path.join(messagesDir, `${channel}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Канал не найден' });
    }
    const messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(messages);
  } catch {
    res.status(500).json({ message: 'Ошибка чтения сообщений' });
  }
});

// ➕ СОЗДАНИЕ НОВОГО КАНАЛА
app.post('/create-channel', (req, res) => {
  const { channel } = req.body;
  const name = channel?.toLowerCase().trim();

  if (!name || name.includes(' ') || name.length > 32) {
    return res.status(400).json({ message: 'Недопустимое имя канала' });
  }

  const filePath = path.join(messagesDir, `${name}.json`);
  if (fs.existsSync(filePath)) {
    return res.status(409).json({ message: 'Канал уже существует' });
  }

  try {
    fs.writeFileSync(filePath, '[]');
    console.log(`📁 Создан новый канал: #${name}`);
    res.status(200).json({ message: 'Канал создан' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка при создании канала' });
  }
});

// 🌐 WebSocket
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const onlineUsers = {};

io.on('connection', (socket) => {
  console.log('🟢 Подключён:', socket.id);

  socket.on('user_connected', (username) => {
    onlineUsers[socket.id] = username;
    console.log(`✅ ${username} вошёл`);
    io.emit('online_users', Object.values(onlineUsers));
  });

  socket.on('join_channel', (channel) => {
    socket.join(channel);
    console.log(`📥 ${onlineUsers[socket.id]} → #${channel}`);
  });

  socket.on('send_message', (data) => {
    const { channel, user, text } = data;
    const msg = {
      user,
      text,
      channel,
      timestamp: Date.now(),
    };

    const filePath = path.join(messagesDir, `${channel}.json`);
    const current = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
      : [];

    current.push(msg);
    fs.writeFileSync(filePath, JSON.stringify(current, null, 2));

    io.to(channel).emit('receive_message', msg);
  });

  socket.on('disconnect', () => {
    const username = onlineUsers[socket.id];
    delete onlineUsers[socket.id];
    console.log(`🔴 ${username || 'Пользователь'} отключён`);
    io.emit('online_users', Object.values(onlineUsers));
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
