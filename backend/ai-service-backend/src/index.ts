import express from 'express';
import { SimpleNN } from './neuralNetwork';

const app = express();
app.use(express.json());

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

// Проверка доступности Ollama
app.get('/health/ollama', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!r.ok) return res.status(503).json({ ok: false });
    const data = await r.json();
    return res.json({ ok: true, models: data });
  } catch (e) {
    return res.status(503).json({ ok: false });
  }
});

// Простой генеративный эндпоинт (no streaming)
app.post('/api/llm', async (req, res) => {
  const { prompt, model, options } = req.body ?? {};
  const useModel = model || OLLAMA_MODEL;
  try {
    const r = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // format по Ollama:
      // https://github.com/ollama/ollama/blob/main/docs/api.md
      body: JSON.stringify({
        model: useModel,
        prompt,
        stream: false,
        options
      })
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({ error: 'ollama_bad_gateway', detail: text });
    }
    const data = await r.json();
    // Ответ Ollama обычно содержит поле response
    return res.json({ model: useModel, response: data?.response ?? '' });
  } catch (e) {
    return res.status(503).json({ error: 'ollama_unavailable' });
  }
});

// Создаём и обучаем сеть ОДИН раз при старте
const nn = new SimpleNN(2, 4, 1);
// Добавь свои данные для тренировки как у тебя в примере
const X = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
];
const y = [
    [0],
    [1],
    [1],
    [0]
];
nn.train(X, y, 0.8, 5000); // (learningRate, epochs — подбери из своего кода)

// Endpoint для предсказаний
app.post('/api/xor-predict', (req, res) => {
  const { x } = req.body; // Ожидаем x: [0, 1]
  const result = nn.predict(x);
  res.json({ result });
});

app.listen(3000, () => console.log('AI service running on 3000'));