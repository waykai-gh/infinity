import app from './app.js';

const PORT = process.env.HTTP_PORT || 3000;

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
});