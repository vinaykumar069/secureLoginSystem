const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: require('crypto').randomBytes(64).toString('hex'), // In production, use a consistent, secure secret from env
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 // 1 hour session
    }
}));

// Authentication Middleware
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        // If 2FA is required but not yet verified for this session
        if (req.session.requires2FA) {
            return res.redirect('/verify-2fa');
        }
        next();
    } else {
        res.redirect('/login');
    }
};

// Routes

// Home / Dashboard
app.get('/', requireAuth, (req, res) => {
    db.get('SELECT username, two_factor_enabled FROM users WHERE id = ?', [req.session.userId], (err, row) => {
        if (err || !row) return res.redirect('/login');
        res.render('dashboard', { user: row });
    });
});

// Register
app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    
    // Basic validation
    if (!username || !password || username.length < 3 || password.length < 6) {
        return res.render('register', { error: 'Username must be at least 3 chars and password at least 6 chars.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12); // Cost factor of 12
        
        // Insert into DB with SQLi protection via parameterized queries
        db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.render('register', { error: 'Username already taken.' });
                }
                console.error(err);
                return res.render('register', { error: 'Registration failed. Please try again.' });
            }
            res.redirect('/login');
        });
    } catch (err) {
        console.error(err);
        res.render('register', { error: 'Server error during registration.' });
    }
});

// Login
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', { error: 'Please provide both username and password.' });
    }

    // Retrieve user securely
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error(err);
            return res.render('login', { error: 'Server error during login.' });
        }

        if (!user) {
            return res.render('login', { error: 'Invalid username or password.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (match) {
            // Check if 2FA is enabled
            if (user.two_factor_enabled) {
                req.session.userId = user.id;
                req.session.requires2FA = true;
                res.redirect('/verify-2fa');
            } else {
                req.session.userId = user.id;
                // Regenerate session ID to prevent session fixation attacks
                req.session.regenerate((err) => {
                    if (err) console.error(err);
                    req.session.userId = user.id;
                    res.redirect('/');
                });
            }
        } else {
            res.render('login', { error: 'Invalid username or password.' });
        }
    });
});

// 2FA Verification during Login
app.get('/verify-2fa', (req, res) => {
    if (!req.session.userId || !req.session.requires2FA) return res.redirect('/login');
    res.render('verify-2fa', { error: null });
});

app.post('/verify-2fa', (req, res) => {
    if (!req.session.userId || !req.session.requires2FA) return res.redirect('/login');
    const { token } = req.body;

    db.get('SELECT two_factor_secret FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user || !user.two_factor_secret) {
            return res.render('verify-2fa', { error: '2FA verification failed.' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            req.session.requires2FA = false;
            // Regenerate session on full login success
            const userId = req.session.userId;
            req.session.regenerate((err) => {
                req.session.userId = userId;
                res.redirect('/');
            });
        } else {
            res.render('verify-2fa', { error: 'Invalid 2FA token.' });
        }
    });
});

// Setup 2FA
app.get('/setup-2fa', requireAuth, (req, res) => {
    db.get('SELECT two_factor_enabled FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user) return res.redirect('/');
        if (user.two_factor_enabled) {
            return res.redirect('/'); // Already enabled
        }

        const secret = speakeasy.generateSecret({ name: "SecureLoginApp" });
        
        // Save secret temporarily in session for verification before enabling
        req.session.temp2FASecret = secret.base32;

        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                console.error(err);
                return res.redirect('/');
            }
            res.render('setup-2fa', { qrImage: data_url, secret: secret.base32, error: null });
        });
    });
});

app.post('/setup-2fa', requireAuth, (req, res) => {
    const { token } = req.body;
    const secret = req.session.temp2FASecret;

    if (!secret) return res.redirect('/setup-2fa');

    const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token
    });

    if (verified) {
        db.run('UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE id = ?', [secret, req.session.userId], (err) => {
            if (err) {
                console.error(err);
                return res.render('setup-2fa', { qrImage: '', secret: secret, error: 'Database error enabling 2FA.' });
            }
            delete req.session.temp2FASecret;
            res.redirect('/');
        });
    } else {
        QRCode.toDataURL(`otpauth://totp/SecureLoginApp?secret=${secret}`, (err, data_url) => {
            res.render('setup-2fa', { qrImage: data_url, secret: secret, error: 'Invalid verification code.' });
        });
    }
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error(err);
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
