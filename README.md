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

1. リポジトリのクローン:
```bash
git clone https://github.com/yuyakan/ai-api-server.git
cd ai-api-server
```

2. 依存関係のインストール:
```bash
npm install
```

3. 環境変数の設定:
```bash
# .env.exampleをコピー
cp .env.example .env

# .envファイルを編集してAPIキーを設定
# OPENAI_API_KEY=sk-proj-your_actual_api_key_here
```

4. 開発サーバーの起動:
```bash
npm run dev
```

## 重要な注意事項

- **.envファイルは絶対にGitにコミットしないでください**
- APIキーは安全に管理してください
- 本番環境では環境変数を使用してください

## 新しいツールの作成方法

### 1. ツールの基本構造

新しいツールを作成する際は、以下の手順に従ってください：

#### ステップ1: ツール関数の定義

`src/routes/chat.ts`にツールを追加します：

```typescript
import { tool } from 'ai'
import { z } from 'zod'

const yourNewTool = tool({
  description: 'ツールの説明をここに記述',
  parameters: z.object({
    param1: z.string().describe('パラメータ1の説明'),
    param2: z.number().optional().describe('パラメータ2の説明（オプション）')
  }),
  execute: async ({ param1, param2 }) => {
    try {
      // ツールのロジックを実装
      const result = await someAsyncOperation(param1, param2)
      
      return {
        success: true,
        data: result,
        message: '処理が完了しました',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
        timestamp: new Date().toISOString()
      }
    }
  }
})
```

#### ステップ2: ツールを登録

`generateText`の`tools`オブジェクトに追加：

```typescript
const result = await generateText({
  // ... 他の設定
  tools: {
    weather: weatherTool,
    calculator: calculatorTool,
    urlFetch: urlFetchTool,
    memory: memoryTool,
    yourNewTool: yourNewTool  // 新しいツールを追加
  }
})
```

#### ステップ3: システムプロンプトを更新

新しいツールをAIが認識できるよう説明を追加：

```typescript
content: `あなたは親切で知識豊富なAIアシスタントです。以下のツールを使用して、ユーザーの質問に正確に答えてください：

1. weather: 天気情報の取得
2. calculator: 数学計算の実行  
3. urlFetch: URLからのデータ取得
4. memory: データの保存・取得
5. yourNewTool: 新しいツールの説明  // 追加

...`
```

### 2. 実装例：QRコード生成ツール

```typescript
const qrCodeTool = tool({
  description: 'テキストからQRコードを生成します',
  parameters: z.object({
    text: z.string().describe('QRコードに埋め込むテキスト'),
    size: z.number().min(100).max(1000).default(200).describe('QRコードのサイズ（ピクセル）')
  }),
  execute: async ({ text, size }) => {
    try {
      // QRコード生成ライブラリを使用（例：qrcode）
      const QRCode = require('qrcode')
      const qrCodeDataURL = await QRCode.toDataURL(text, { width: size })
      
      return {
        success: true,
        text,
        size,
        qrCodeDataURL,
        message: `QRコードを生成しました: ${text}`,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `QRコード生成エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        text,
        timestamp: new Date().toISOString()
      }
    }
  }
})
```

### 3. 実装例：データベース検索ツール

```typescript
const databaseSearchTool = tool({
  description: 'データベースからデータを検索します',
  parameters: z.object({
    table: z.string().describe('検索対象のテーブル名'),
    query: z.string().describe('検索クエリ'),
    limit: z.number().min(1).max(100).default(10).describe('取得件数の上限')
  }),
  execute: async ({ table, query, limit }) => {
    try {
      // データベース接続とクエリ実行（例：prisma, mysql2など）
      const results = await database.query(`
        SELECT * FROM ${table} 
        WHERE name LIKE '%${query}%' 
        LIMIT ${limit}
      `)
      
      return {
        success: true,
        table,
        query,
        count: results.length,
        data: results,
        message: `${results.length}件のデータが見つかりました`,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `データベース検索エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        table,
        query,
        timestamp: new Date().toISOString()
      }
    }
  }
})
```

### 4. 実装例：ファイル操作ツール

```typescript
const fileOperationTool = tool({
  description: 'ファイルの読み書きを行います',
  parameters: z.object({
    operation: z.enum(['read', 'write', 'delete', 'list']).describe('実行する操作'),
    path: z.string().describe('ファイルパス'),
    content: z.string().optional().describe('書き込む内容（writeの場合）')
  }),
  execute: async ({ operation, path, content }) => {
    try {
      const fs = require('fs').promises
      let result: any = {}
      
      switch (operation) {
        case 'read':
          result.content = await fs.readFile(path, 'utf8')
          result.message = `ファイルを読み込みました: ${path}`
          break
          
        case 'write':
          if (!content) throw new Error('書き込み内容が必要です')
          await fs.writeFile(path, content)
          result.message = `ファイルに書き込みました: ${path}`
          break
          
        case 'delete':
          await fs.unlink(path)
          result.message = `ファイルを削除しました: ${path}`
          break
          
        case 'list':
          result.files = await fs.readdir(path)
          result.message = `ディレクトリ内容を取得しました: ${path}`
          break
      }
      
      return {
        success: true,
        operation,
        path,
        ...result,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: `ファイル操作エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        operation,
        path,
        timestamp: new Date().toISOString()
      }
    }
  }
})
```

### 5. 専用エンドポイントの作成（オプション）

ツールを直接呼び出せるエンドポイントも作成できます。`src/routes/`に新しいファイルを作成：

```typescript
// src/routes/qrcode.ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

const app = new OpenAPIHono()

const qrCodeSchema = createRoute({
  method: 'post',
  path: '/generate',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            text: z.string().describe('QRコードに埋め込むテキスト'),
            size: z.number().min(100).max(1000).default(200).describe('サイズ')
          })
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            qrCodeDataURL: z.string(),
            text: z.string(),
            size: z.number()
          })
        }
      },
      description: 'QRコード生成結果'
    }
  },
  tags: ['QRCode']
})

app.openapi(qrCodeSchema, async (c) => {
  const { text, size } = c.req.valid('json')
  
  // QRコード生成ロジック
  const QRCode = require('qrcode')
  const qrCodeDataURL = await QRCode.toDataURL(text, { width: size })
  
  return c.json({
    qrCodeDataURL,
    text,
    size
  })
})

export { app as qrCodeRoute }
```

そして`src/index.ts`でルートを登録：

```typescript
import { qrCodeRoute } from './routes/qrcode.js'

// Routes
app.route('/api/qrcode', qrCodeRoute)
```

### 6. ツール開発のベストプラクティス

#### エラーハンドリング
- 必ず try-catch でエラーをキャッチ
- 明確なエラーメッセージを返す
- 成功/失敗の状態を明示

#### パラメータ検証
- Zodスキーマで型安全性を確保
- 適切なバリデーションルールを設定
- オプションパラメータにはデフォルト値を設定

#### レスポンス形式の統一
```typescript
// 成功時
{
  success: true,
  data: any,
  message: string,
  timestamp: string
}

// 失敗時  
{
  success: false,
  error: string,
  timestamp: string
}
```

#### セキュリティ考慮事項
- 入力値のサニタイゼーション
- ファイルアクセスの制限
- APIキーなどの秘密情報の適切な管理
- SQLインジェクションなどの脆弱性対策

これらの手順に従って、独自のツールを簡単に追加できます！

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
