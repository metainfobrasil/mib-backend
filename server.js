const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configuração do CORS para aceitar requisições do seu domínio na Homehost / Cloudflare
app.use(cors({
    origin: 'https://metainfobrasil.com',
    methods: ['GET', 'POST']
}));

app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: 'https://metainfobrasil.com',
        methods: ['GET', 'POST']
    }
});

// Configuração do Banco de Dados SQLite local
const db = new sqlite3.Database('./mib_cyber_quest.db', (err) => {
    if (err) console.error('Erro ao conectar ao banco de dados', err.message);
    else console.log('Conectado ao banco de dados MIB.');
});

db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    senha TEXT,
    nivel INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    moedas INTEGER DEFAULT 1000,
    diamantes INTEGER DEFAULT 50
)`);

// Rota de Cadastro de Operador
app.post('/api/registrar', async (req, res) => {
    const { username, email, senha } = req.body;
    try {
        const senhaHash = await bcrypt.hash(senha, 10);
        db.run(`INSERT INTO usuarios (username, email, senha) VALUES (?, ?, ?)`, [username, email, senhaHash], function(err) {
            if (err) return res.status(400).json({ erro: "E-mail ou nome de usuário já cadastrado." });
            res.json({ mensagem: "Operador registrado com sucesso!", userId: this.lastID });
        });
    } catch (e) {
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota de Login de Operador
app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    db.get(`SELECT * FROM usuarios WHERE email = ?`, [email], async (err, usuario) => {
        if (err || !usuario) return res.status(400).json({ erro: "Usuário não encontrado." });

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) return res.status(401).json({ erro: "Senha incorreta." });

        res.json({ 
            mensagem: "Login bem-sucedido", 
            usuario: { 
                id: usuario.id, 
                username: usuario.username, 
                nivel: usuario.nivel, 
                moedas: usuario.moedas 
            } 
        });
    });
});

// Sistema de Chat em Tempo Real via WebSockets
io.on('connection', (socket) => {
    console.log('Novo operador conectado ao chat da rede MIB.');

    socket.on('chat_mensagem', (data) => {
        // Transmite a mensagem para todos os operadores conectados
        io.emit('chat_mensagem', data);
    });

    socket.on('disconnect', () => {
        console.log('Operador desconectado do chat.');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor MIB rodando na porta ${PORT}`);
});
