require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// In-memory user storage
const users = new Map();

// Database connection pools storage (keyed by session ID)
const pools = new Map();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Database connection middleware
const requireDbConnection = (req, res, next) => {
    const pool = pools.get(req.session.id);
    if (pool) {
        req.dbPool = pool;
        next();
    } else {
        res.status(403).json({ error: 'Database connection not established' });
    }
};

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (users.has(username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.set(username, { username, password: hashedPassword });
    
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.get(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = { username };
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    const pool = pools.get(req.session.id);
    if (pool) {
        pool.end(); // Close the database connection
        pools.delete(req.session.id);
    }
    req.session.destroy();
    res.redirect('/');
});

// Protected routes
app.get('/dashboard', requireAuth, (req, res) => {
    const isConnected = pools.has(req.session.id);
    res.render('dashboard', { 
        isConnected,
        username: req.session.user.username 
    });
});

// RDS Connection
app.post('/connect-rds', requireAuth, async (req, res) => {
    const { host, user, password, database } = req.body;

    try {
        // Close existing connection if it exists
        const existingPool = pools.get(req.session.id);
        if (existingPool) {
            await existingPool.end();
            pools.delete(req.session.id);
        }

        // Create new connection pool
        const pool = await mysql.createPool({
            host,
            user,
            password,
            database,
            waitForConnections: true,
            connectionLimit: 10
        });

        // Test the connection
        await pool.query('SELECT 1');
        
        // Store the pool in the pools map
        pools.set(req.session.id, pool);
        
        // Store connection info in session (except password)
        req.session.dbConfig = { host, user, database };
        
        res.json({ message: 'Connected successfully' });
    } catch (error) {
        pools.delete(req.session.id);
        res.status(500).json({ error: 'Failed to connect to database: ' + error.message });
    }
});

// CRUD Operations
app.get('/items', requireAuth, requireDbConnection, async (req, res) => {
    try {
        const [rows] = await req.dbPool.query('SELECT * FROM items');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/items', requireAuth, requireDbConnection, async (req, res) => {
    const { name, description } = req.body;
    try {
        const [result] = await req.dbPool.query(
            'INSERT INTO items (name, description) VALUES (?, ?)',
            [name, description]
        );
        res.json({ id: result.insertId, name, description });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/items/:id', requireAuth, requireDbConnection, async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        await req.dbPool.query(
            'UPDATE items SET name = ?, description = ? WHERE id = ?',
            [name, description, id]
        );
        res.json({ id, name, description });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/items/:id', requireAuth, requireDbConnection, async (req, res) => {
    const { id } = req.params;
    try {
        await req.dbPool.query('DELETE FROM items WHERE id = ?', [id]);
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
