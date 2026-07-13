// server.js
//
// Standalone server for the EML → PDF paywall backend. Everything it
// serves lives under /eml2pdf/* -- see routes/eml2pdf.js for the actual
// endpoints (auth, checkout, webhook, balance, spend).
//
// It ALSO serves the marketing site (landing page + privacy/terms) as
// static files from public/, so the whole thing -- API and website --
// deploys as one Railway service instead of two.

const path = require('path');
const express = require('express');
const { Pool } = require('pg');

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Most managed Postgres providers (Railway, Render, Supabase, Neon)
  // require SSL. If you're pointed at a local/self-hosted Postgres
  // without SSL, set PGSSL=false in your env to skip this.
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

// IMPORTANT: mount the eml2pdf router BEFORE express.json() below. The
// webhook route inside it needs the raw request body to verify Dodo's
// signature -- it declares its own express.raw() middleware for that one
// path, but only if nothing upstream has already consumed the body.
app.use('/eml2pdf', require('./routes/eml2pdf')(pool));

// Everything else (if you add more routes later) can use normal JSON
// parsing.
app.use(express.json());

// Landing page + legal pages. /privacy and /terms are clean URLs (no
// .html) so they're stable if you ever restructure the site later, and
// so they're what you paste into the Chrome Web Store dashboard and the
// Dodo Payments merchant setup.
app.use(express.static(path.join(__dirname, 'public')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'terms.html')));

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`eml2pdf backend listening on :${PORT}`);
});
