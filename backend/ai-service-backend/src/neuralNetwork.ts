// Вспомогательные функции
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function dSigmoid(y: number): number {
  return y * (1 - y);
}

type Matrix = number[][];

// Генерация случайной матрицы весов
function randomMatrix(rows: number, cols: number): Matrix {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.random() * 2 - 1)
  );
}

// Умножение матриц
function dot(a: Matrix, b: Matrix): Matrix {
  if (a[0].length !== b.length) {
    throw new Error("Несовместимые размеры матриц для умножения");
  }
  const result: Matrix = Array.from({ length: a.length }, () =>
    Array(b[0].length).fill(0)
  );
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b[0].length; j++) {
      for (let k = 0; k < a[0].length; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

// Добавление bias
function addBias(mat: Matrix, bias: Matrix): Matrix {
  return mat.map((row) => row.map((val, i) => val + bias[0][i]));
}

// Применить функцию к каждому элементу матрицы
function mapMat(mat: Matrix, fn: (n: number) => number): Matrix {
  return mat.map((row) => row.map(fn));
}

// --- Класс нейросети для XOR ---
export class SimpleNN {
  W1: Matrix;
  b1: Matrix;
  W2: Matrix;
  b2: Matrix;

  z1!: Matrix;
  a1!: Matrix;
  z2!: Matrix;
  a2!: Matrix;

  constructor(inputSize: number, hiddenSize: number, outputSize: number) {
    this.W1 = randomMatrix(inputSize, hiddenSize); // веса вход-скрытый
    this.b1 = [Array(hiddenSize).fill(0)];
    this.W2 = randomMatrix(hiddenSize, outputSize); // веса скрытый-выход
    this.b2 = [Array(outputSize).fill(0)];
  }

  forward(X: Matrix): Matrix {
    this.z1 = addBias(dot(X, this.W1), this.b1);
    this.a1 = mapMat(this.z1, sigmoid);
    this.z2 = addBias(dot(this.a1, this.W2), this.b2);
    this.a2 = mapMat(this.z2, sigmoid);
    return this.a2;
  }

  train(X: Matrix, y: Matrix, lr = 0.5, epochs = 5000): void {
    for (let e = 0; e < epochs; e++) {
      const out = this.forward(X);
      // ошибка = (предсказание - правильный ответ)
      const error = out.map((row, i) =>
        row.map((val, j) => val - y[i][j])
      );
      // --- backpropagation ---
      const dZ2 = error.map((row, i) =>
        row.map((val, j) => val * dSigmoid(out[i][j]))
      );
      const a1T = this.a1[0].map((_, col) => this.a1.map((row) => row[col]));
      const dW2 = dot(a1T, dZ2);
      const dZ1 = this.a1.map((row, i) =>
        row.map((val, j) => {
          let sum = 0;
          for (let k = 0; k < this.W2[0].length; k++) { sum += dZ2[i][k] * this.W2[j][k]; }
          return sum * dSigmoid(val);
        })
      );
      const XT = X[0].map((_, col) => X.map((row) => row[col]));
      const dW1 = dot(XT, dZ1);

      // --- обновляем веса (SGD) ---
      this.W2 = this.W2.map((row, i) =>
        row.map((val, j) => val - lr * dW2[i][j])
      );
      this.b2[0] = this.b2[0].map(
        (val, j) => val - (lr * dZ2.reduce((s, r) => s + r[j], 0)) / X.length
      );
      this.W1 = this.W1.map((row, i) =>
        row.map((val, j) => val - lr * dW1[i][j])
      );
      this.b1[0] = this.b1[0].map(
        (val, j) => val - (lr * dZ1.reduce((s, r) => s + r[j], 0)) / X.length
      );
    }
  }

  // --- Функция для предсказания одного примера (ответ для API)
  predict(input: number[]): number {
    // Получаем выход сети для одного запроса
    const result = this.forward([input]);
    return result[0][0]; // Можно округлять, если нужен бинарный выход: result[0][0] > 0.5 ? 1 : 0
  }
}
