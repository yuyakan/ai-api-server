import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { weatherTool } from './tools/weather'
import { calculatorTool } from './tools/calculator'
import { urlFetchTool } from './tools/urlFetch'
import { memoryTool } from './tools/memory'

const app = new OpenAPIHono()

// チャットエンドポイント
const chatSchema = createRoute({
  method: 'post',
  path: '/chat',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            message: z.string().describe('ユーザーのメッセージ'),
            model: z.string().default('gpt-3.5-turbo').describe('使用するモデル'),
            temperature: z.number().min(0).max(2).default(0.7).describe('応答の創造性'),
            maxTokens: z.number().min(1).max(4000).default(1000).describe('最大トークン数')
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
            response: z.string().describe('AIの応答'),
            toolCalls: z.array(z.object({
              name: z.string(),
              parameters: z.record(z.any()),
              result: z.any()
            })).optional().describe('実行されたツールの詳細'),
            usage: z.object({
              promptTokens: z.number(),
              completionTokens: z.number(),
              totalTokens: z.number()
            }).optional().describe('トークン使用量'),
            model: z.string().describe('使用されたモデル'),
            timestamp: z.string().describe('応答時刻')
          })
        }
      },
      description: 'AIからの応答'
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            details: z.string().optional()
          })
        }
      },
      description: 'リクエストエラー'
    }
  },
  tags: ['Chat']
})

app.openapi(chatSchema, async (c) => {
  try {
    const { message, model, temperature, maxTokens } = c.req.valid('json')
    
    if (!process.env.OPENAI_API_KEY) {
      return c.json({ error: 'OpenAI API キーが設定されていません' }, 400)
    }

    const result = await generateText({
        model: openai(model) as any,
      messages: [
        {
          role: 'system',
          content: `あなたは親切で知識豊富なAIアシスタントです。以下のツールを使用して、ユーザーの質問に正確に答えてください：

1. weather: 天気情報の取得
2. calculator: 数学計算の実行
3. urlFetch: URLからのデータ取得
4. memory: データの保存・取得

**重要な指示:**
- ユーザーが「5+3は？」「10×2を計算して」のような質問をした場合、calculator ツールを使用してください
- calculator ツールには、計算式の部分のみ（例：「5+3」）を渡してください
- ツールを使用した場合は、その結果を踏まえて自然な日本語で回答してください
- 例：計算結果が8の場合、「5+3の計算結果は8です。」のように答えてください

ユーザーの質問から適切な計算式を抽出し、ツールに渡してください。`
        },
        {
          role: 'user',
          content: message
        }
      ],
      tools: {
        weather: weatherTool,
        calculator: calculatorTool,
        urlFetch: urlFetchTool,
        memory: memoryTool
      },
      temperature,
      maxToolRoundtrips: 3, // ツールの結果を使った追加の応答を許可
      maxTokens
    })

    const toolCalls = result.toolCalls?.map(call => ({
      name: call.toolName,
      parameters: call.args
    }))

    return c.json({
      response: result.text,
      toolCalls,
      usage: result.usage,
      model,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Chat error:', error)
    return c.json({ 
      error: 'チャット処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export { app as chatRoute }