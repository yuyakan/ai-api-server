# AI SDK API Server

AI SDKを使用したツール機能付きチャットAPIサーバーです。

## 機能

- **チャットAPI**: OpenAI GPTモデルを使用した対話
- **ツール機能**: 
  - 天気情報取得
  - 数学計算
  - URL取得
  - メモリストレージ
- **Swagger UI**: API仕様の確認とテスト
- **OpenAPI**: 標準化されたAPI仕様

## セットアップ

1. 依存関係のインストール:
```bash
npm install
```

2. 環境変数の設定:
```bash
cp .env.example .env
# .envファイルでOpenAI API Keyを設定
```

3. 開発サーバーの起動:
```bash
npm run dev
```

## API エンドポイント

- **GET /**: ヘルスチェック
- **GET /swagger**: Swagger UI
- **POST /api/chat/chat**: AIチャット
- **GET /api/tools/list**: 利用可能なツール一覧
- **GET /api/weather/:city**: 天気情報取得
- **POST /api/calculator/calculate**: 計算実行

## 使用例

### チャット
```bash
curl -X POST http://localhost:3000/api/chat/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "東京の天気を教えて"}'
```

### 天気情報
```bash
curl http://localhost:3000/api/weather/Tokyo?country=Japan
```

### 計算
```bash
curl -X POST http://localhost:3000/api/calculator/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "2 + 3 * 4", "operation": "evaluate"}'
```

## 環境変数

- `OPENAI_API_KEY`: OpenAI API キー（必須）
- `PORT`: サーバーポート（デフォルト: 3000）