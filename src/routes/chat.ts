import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { generateText, tool } from 'ai'
import { openai } from '@ai-sdk/openai'

const app = new OpenAPIHono()

// ツール定義
export const weatherTool = tool({
    description: '指定された都市の現在の天気情報を取得します',
    parameters: z.object({
      city: z.string().describe('天気を調べたい都市名'),
      country: z.string().optional().describe('国コード（例: JP, US, GB）'),
    }),
    execute: async ({ city, country }) => {
      const apiKey = process.env.OPENWEATHER_API_KEY;
  
      try {
        // クエリパラメータを構築
        const query = country ? `${city},${country}` : city;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${apiKey}&units=metric&lang=ja`;
        
        // OpenWeatherMap APIを呼び出し
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'AI-Chat-App/1.0',
          },
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`都市「${city}」が見つかりませんでした。都市名を確認してください。`);
          } else if (response.status === 401) {
            throw new Error('OpenWeatherMap APIキーが無効です。');
          } else {
            throw new Error(`天気情報の取得に失敗しました（ステータス: ${response.status}）`);
          }
        }
        
        const data = await response.json();
        
        // レスポンスデータを整形
        const weatherData = {
          city: data.name,
          country: data.sys.country,
          temperature: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          condition: data.weather[0].description,
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          windSpeed: Math.round(data.wind.speed * 3.6), // m/s を km/h に変換
          windDirection: data.wind.deg,
          cloudiness: data.clouds.all,
          visibility: data.visibility ? Math.round(data.visibility / 1000) : null, // メートルをキロメートルに
          sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('ja-JP'),
          sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('ja-JP'),
          source: 'openweathermap'
        };
        
        // 詳細な説明文を生成
        const description = `${weatherData.city}（${weatherData.country}）の現在の天気は${weatherData.condition}、気温${weatherData.temperature}度（体感温度${weatherData.feelsLike}度）、湿度${weatherData.humidity}%、風速${weatherData.windSpeed}km/hです。`;
        
        return {
          ...weatherData,
          description,
          additionalInfo: {
            pressure: `気圧: ${weatherData.pressure}hPa`,
            cloudiness: `雲量: ${weatherData.cloudiness}%`,
            visibility: weatherData.visibility ? `視界: ${weatherData.visibility}km` : null,
            sunrise: `日の出: ${weatherData.sunrise}`,
            sunset: `日の入り: ${weatherData.sunset}`,
          }
        };
        
      } catch (error) {
        // エラーが発生した場合の処理
        console.error('Weather API error:', error);
        
        if (error instanceof Error) {
          throw new Error(`天気情報の取得中にエラーが発生しました: ${error.message}`);
        } else {
          throw new Error('天気情報の取得中に不明なエラーが発生しました。');
        }
      }
    },
});

const calculatorTool = tool({
  description: '数学計算を実行します。加算、減算、乗算、除算、その他の数学演算が可能です。ユーザーが「5+3は？」のような質問をした場合、「5+3」の部分を抽出して計算してください。',
  parameters: z.object({
    expression: z.string().describe('計算式（例: 5+3, 10*2, 15/3, (2+3)*4）'),
  }),
  execute: async ({ expression }) => {
    try {
      // 数字と基本的な演算子のみを抽出（スペースも許可）
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '').trim()
      
      if (!sanitized) {
        throw new Error('計算式が見つかりません')
      }
      
      // 空白を除去して再確認
      const cleanExpression = sanitized.replace(/\s+/g, '')
      if (!cleanExpression) {
        throw new Error('有効な計算式が見つかりません')
      }
      
      // 計算実行
      const result = Function(`"use strict"; return (${sanitized})`)()
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('計算結果が数値ではありません')
      }
      
      return {
        expression: sanitized,
        result,
        message: `${sanitized} = ${result}`,
        success: true,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        error: `計算エラー: ${error instanceof Error ? error.message : '無効な式です'}`,
        expression,
        success: false,
        timestamp: new Date().toISOString()
      }
    }
  }
})

const urlFetchTool = tool({
  description: 'URLからデータを取得します',
  parameters: z.object({
    url: z.string().describe('取得するURL'),
    method: z.enum(['GET', 'POST']).default('GET').describe('HTTPメソッド')
  }),
  execute: async ({ url, method }) => {
    try {
      const response = await fetch(url, { method })
      const data = await response.text()
      return {
        url,
        status: response.status,
        statusText: response.statusText,
        data: data.substring(0, 1000), // 最初の1000文字のみ
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        error: `URL取得エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url
      }
    }
  }
})

const memoryTool = tool({
  description: 'データを一時的に保存・取得します',
  parameters: z.object({
    action: z.enum(['save', 'get', 'list']).describe('実行するアクション'),
    key: z.string().optional().describe('データのキー'),
    value: z.string().optional().describe('保存する値')
  }),
  execute: async ({ action, key, value }) => {
    // 簡単なメモリストレージ（実際のアプリではRedisやDBを使用）
    if (!global.memoryStore) {
      global.memoryStore = new Map()
    }
    
    switch (action) {
      case 'save':
        if (!key || !value) return { error: 'キーと値が必要です' }
        global.memoryStore.set(key, value)
        return { message: `データを保存しました: ${key}`, key, value }
      
      case 'get':
        if (!key) return { error: 'キーが必要です' }
        const data = global.memoryStore.get(key)
        return data ? { key, value: data } : { error: `データが見つかりません: ${key}` }
      
      case 'list':
        const keys = Array.from(global.memoryStore.keys())
        return { keys, count: keys.length }
      
      default:
        return { error: '無効なアクション' }
    }
  }
})

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