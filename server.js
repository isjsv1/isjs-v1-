const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Хранилища в памяти сервера (очищаются при перезагрузке)
let users = []; 
let messages = [];

io.on('connection', (socket) => {
    console.log('Пользователь подключился');

    // Логика регистрации
    socket.on('register', (data) => {
        const exists = users.find(u => u.username === data.username);
        if (!exists) {
            users.push({ username: data.username, password: data.password });
            socket.emit('auth_success', { username: data.username });
            io.emit('user_list', users.map(u => u.username));
        } else {
            socket.emit('error_msg', 'Этот логин уже занят');
        }
    });

    // Логика входа
    socket.on('login', (data) => {
        const user = users.find(u => u.username === data.username && u.password === data.password);
        if (user) {
            socket.emit('auth_success', { username: data.username });
            io.emit('user_list', users.map(u => u.username));
            // Отправляем историю сообщений
            messages.forEach(msg => {
                socket.emit('message', msg);
            });
        } else {
            socket.emit('error_msg', 'Неверный логин или пароль');
        }
    });

    // Запрос списка пользователей
    socket.on('get_users', () => {
        socket.emit('user_list', users.map(u => u.username));
    });

    // Обработка нового сообщения
    socket.on('new_message', (msgData) => {
        messages.push(msgData); // Сохраняем в память
        io.emit('message', msgData); // Рассылаем всем (клиент сам отфильтрует нужное)
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер I_SJS v1 запущен на порту ${PORT}`);
    console.log(`Открой в браузере: http://localhost:${PORT}`);
});