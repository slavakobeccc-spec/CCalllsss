const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Файл для хранения данных
const DATA_FILE = 'data.json';

// Загрузить данные
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
    return { users: {} };
}

// Сохранить данные
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        return false;
    }
}

// API: Регистрация
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const data = loadData();
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }
    
    if (data.users[username]) {
        return res.status(400).json({ error: 'Имя пользователя занято' });
    }
    
    data.users[username] = {
        password: password,
        friends: [],
        calls: [],
        createdAt: new Date().toISOString(),
        online: false
    };
    
    if (saveData(data)) {
        res.json({ success: true, message: 'Регистрация успешна' });
    } else {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API: Вход
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const data = loadData();
    
    const user = data.users[username];
    
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Неверные данные' });
    }
    
    user.online = true;
    saveData(data);
    
    res.json({ 
        success: true, 
        user: { 
            username, 
            friends: user.friends,
            calls: user.calls || []
        } 
    });
});

// API: Добавить друга
app.post('/api/add-friend', (req, res) => {
    const { username, friendUsername } = req.body;
    const data = loadData();
    
    if (!data.users[username] || !data.users[friendUsername]) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = data.users[username];
    
    if (user.friends.includes(friendUsername)) {
        return res.status(400).json({ error: 'Уже в друзьях' });
    }
    
    user.friends.push(friendUsername);
    saveData(data);
    
    res.json({ success: true, friends: user.friends });
});

// API: Получить онлайн пользователей
app.get('/api/online-users', (req, res) => {
    const data = loadData();
    const online = Object.keys(data.users).filter(username => data.users[username].online);
    res.json({ online });
});

// API: Сохранить историю звонков
app.post('/api/save-call', (req, res) => {
    const { username, callData } = req.body;
    const data = loadData();
    
    if (data.users[username]) {
        data.users[username].calls = data.users[username].calls || [];
        data.users[username].calls.unshift({
            ...callData,
            timestamp: new Date().toISOString()
        });
        
        // Ограничиваем историю
        if (data.users[username].calls.length > 100) {
            data.users[username].calls = data.users[username].calls.slice(0, 100);
        }
        
        saveData(data);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});

// Статика
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});