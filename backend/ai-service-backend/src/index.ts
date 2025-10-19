import express from 'express';
import { SimpleNN } from './neuralNetwork';

const app = express();
app.use(express.json());

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