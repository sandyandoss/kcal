require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const mealsRoutes = require('./routes/meals');
const targetsRoutes = require('./routes/targets');
const summaryRoutes = require('./routes/summary');
const analyzeRoutes = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(cors({ origin: IS_PROD ? false : '*' }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.use('/auth', authRoutes);
app.use('/meals', mealsRoutes);
app.use('/targets', targetsRoutes);
app.use('/summary', summaryRoutes);
app.use('/analyze', analyzeRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Serve frontend in production
if (IS_PROD) {
  const frontend = path.join(__dirname, '..', '..', 'frontend');
  app.use(express.static(frontend));
  app.get('*', (req, res) => res.sendFile(path.join(frontend, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => console.log(`Kcal running on port ${PORT} [${IS_PROD ? 'production' : 'development'}]`));
