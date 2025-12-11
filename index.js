// index.js
const express = require('express');
const { Pool } = require('pg');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieSession = require('cookie-session');
const cors = require('cors');
const { Parser } = require('json2csv');
const path = require('path');
require('dotenv').config();

const app = express();

// --- Database Connection (Wait for Render to provide this) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Render Postgres
});

// --- Middleware ---
app.use(express.json());
app.use(cookieSession({
  maxAge: 24 * 60 * 60 * 1000,
  keys: [process.env.COOKIE_KEY || 'secret_key']
}));
app.use(passport.initialize());
app.use(passport.session());

// --- Serve React Static Files (Production Mode) ---
app.use(express.static(path.join(__dirname, 'client/dist')));

// --- OAuth Logic ---
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (err) { done(err, null); }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;
    try {
      // 1. Check Whitelist
      const whitelistCheck = await pool.query('SELECT * FROM whitelist WHERE email = $1', [email]);
      if (whitelistCheck.rows.length === 0) return done(null, false);

      // 2. Find or Create User
      const existingUser = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      if (existingUser.rows.length > 0) return done(null, existingUser.rows[0]);

      const newUser = await pool.query(
        'INSERT INTO users (google_id, email, display_name, role) VALUES ($1, $2, $3, $4) RETURNING *',
        [profile.id, email, profile.displayName, 'Individual']
      );
      done(null, newUser.rows[0]);
    } catch (err) { done(err, null); }
  }
));

// --- Routes ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/'); // Redirect back to React app
});
app.get('/api/current_user', (req, res) => res.send(req.user));
app.get('/api/logout', (req, res) => { req.logout(); res.redirect('/'); });

// API: Save Forecast
app.post('/api/forecast', async (req, res) => {
  if(!req.user) return res.status(401).send('Unauthorized');
  const { period, quota, commit, best_case } = req.body;
  const query = `
    INSERT INTO forecasts (user_id, period_month, quota, commit_amount, best_case, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (user_id, period_month) DO UPDATE 
    SET quota = $3, commit_amount = $4, best_case = $5, updated_at = NOW()`;
  await pool.query(query, [req.user.id, period, quota, commit, best_case]);
  res.send({ success: true });
});

// API: Rollup
app.get('/api/rollup', async (req, res) => {
    if(!req.user || req.user.role === 'Individual') return res.status(403).send('Access Denied');
    const query = `
      SELECT u.display_name, f.quota, f.commit_amount, f.best_case 
      FROM users u LEFT JOIN forecasts f ON u.id = f.user_id 
      WHERE u.manager_id = $1 ORDER BY f.commit_amount DESC`;
    const result = await pool.query(query, [req.user.id]);
    res.send(result.rows);
});

// API: Export
app.get('/api/export', async (req, res) => {
    if(!req.user || req.user.role === 'Individual') return res.status(403).send('Access Denied');
    const query = `
      SELECT u.display_name, f.period_month, f.quota, f.commit_amount, f.best_case 
      FROM users u JOIN forecasts f ON u.id = f.user_id WHERE u.manager_id = $1`;
    const result = await pool.query(query, [req.user.id]);
    const csv = new Parser({ fields: ['display_name', 'quota', 'commit_amount', 'best_case'] }).parse(result.rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('forecast.csv');
    return res.send(csv);
});

// API: Admin Whitelist
app.post('/api/admin/whitelist', async (req, res) => {
    if(!req.user || req.user.role !== 'Admin') return res.status(403).send('Admin only');
    await pool.query('INSERT INTO whitelist (email) VALUES ($1)', [req.body.email]);
    res.send({ success: true });
});

// Catch-all: After checking all API routes, serve the React app's index.html
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));