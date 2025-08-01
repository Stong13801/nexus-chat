const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json()); // для чтения JSON в запросах

const users = []; // временное хранилище пользователей

// 🚪 РЕГИСТРАЦИЯ
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  const exists = users.find((u) => u.username === username);
  if (exists) {
    return res.status(400).json({ message: 'Пользователь уже существует' });
  }

  users.push({ username, password });
  console.log('✅ Зарегистрирован:', username);
  res.status(200).json({ message: 'Успешно зарегистрирован' });
});

// 🔐 ВХОД
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Неверный логин или пароль' });
  }

  console.log('🔓 Вход выполнен:', username);
  res.status(200).json({ message: 'Вход успешен', username });
});

// 📡 WebSocket
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('🟢 Подключён:', socket.id);

  socket.on('send_message', (data) => {
    io.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Отключён:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
