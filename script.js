const socket = io(); // Подключаемся к серверу

let currentUser = "";
let activeChat = "Избранное"; // По умолчанию открыто избранное

// Функция для регистрации или входа
function auth(type) {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    if (u.length < 3 || p.length < 3) {
        showError("Логин и пароль должны быть длиннее 3 символов");
        return;
    }

    if (type === 'register') {
        socket.emit('register', { username: u, password: p });
    } else {
        socket.emit('login', { username: u, password: p });
    }
}

// Слушаем успешный вход
socket.on('auth_success', (data) => {
    currentUser = data.username;
    localStorage.setItem('i_sjs_user', currentUser); // Сохраняем в память браузера
    
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    
    selectChat('Избранное'); // По умолчанию заходим в избранное
});

// Ошибка авторизации
socket.on('error_msg', (msg) => {
    showError(msg);
});

function showError(text) {
    const err = document.getElementById('error-msg');
    err.innerText = text;
    setTimeout(() => err.innerText = "", 3000);
}

// Получаем список всех пользователей
socket.on('user_list', (users) => {
    const list = document.getElementById('user-list');
    list.innerHTML = ""; // Очищаем список

    // 1. Сначала всегда добавляем "Избранное" для себя
    const favItem = document.createElement('div');
    favItem.className = `user-item ${activeChat === 'Избранное' ? 'active' : ''}`;
    favItem.innerHTML = `⭐ <b>Избранное (Заметки)</b>`;
    favItem.onclick = () => selectChat('Избранное');
    list.appendChild(favItem);

    // 2. Добавляем остальных пользователей
    users.forEach(user => {
        if (user !== currentUser) {
            const userItem = document.createElement('div');
            userItem.className = `user-item ${activeChat === user ? 'active' : ''}`;
            userItem.innerText = `👤 ${user}`;
            userItem.onclick = () => selectChat(user);
            list.appendChild(userItem);
        }
    });
});

// Выбор чата
function selectChat(name) {
    activeChat = name;
    document.getElementById('chat-header').innerText = (name === 'Избранное') ? "⭐ Избранное (Ваши заметки)" : `Чат с ${name}`;
    document.getElementById('messages-container').innerHTML = ""; // Очищаем окно чата (в v1 загрузим из истории позже)
    
    // Перерисовываем список, чтобы выделить активный чат
    socket.emit('get_users'); 
}

// Отправка сообщения
function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();

    if (text !== "") {
        const msgData = {
            sender: currentUser,
            receiver: activeChat, // Если 'Избранное', получатель тоже я (логика на сервере)
            text: text,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        socket.emit('new_message', msgData);
        input.value = "";
    }
}

// Слушаем нажатие Enter
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

document.getElementById('send-btn').onclick = sendMessage;

// Получение нового сообщения
socket.on('message', (msg) => {
    // Условие отображения: 
    // Если я отправитель И активен чат с получателем
    // ИЛИ если я получатель И активен чат с отправителем
    // ИЛИ если это моё Избранное
    const isMyFavorite = (msg.receiver === 'Избранное' && msg.sender === currentUser && activeChat === 'Избранное');
    const isDirectChat = (msg.sender === currentUser && msg.receiver === activeChat) || 
                         (msg.receiver === currentUser && msg.sender === activeChat);

    if (isMyFavorite || isDirectChat) {
        displayMessage(msg);
    }
});

function displayMessage(msg) {
    const container = document.getElementById('messages-container');
    const div = document.createElement('div');
    const isMine = msg.sender === currentUser;
    
    div.className = `msg ${isMine ? 'my-msg' : 'other-msg'}`;
    div.innerHTML = `
        <div style="font-size: 0.8em; color: ${isMine ? '#075e54' : '#555'}; font-weight: bold;">${msg.sender}</div>
        <div>${msg.text}</div>
        <div style="font-size: 0.7em; text-align: right; margin-top: 5px; opacity: 0.6;">${msg.date}</div>
    `;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight; // Прокрутка вниз
}