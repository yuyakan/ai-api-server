import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

const app = new OpenAPIHono()

// ツール一覧取得
const toolsListSchema = createRoute({
  method: 'get',
  path: '/list',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            tools: z.array(z.object({
              name: z.string(),
              description: z.string(),
              parameters: z.record(z.any())
            }))
          })
        }
      },
      description: '利用可能なツール一覧'
    }
  },
  tags: ['Tools']
})

app.openapi(toolsListSchema, (c) => {
  const tools = [
    {
      name: 'weather',
      description: '指定された都市の天気情報を取得します',
      parameters: {
        city: { type: 'string', description: '都市名' },
        country: { type: 'string', description: '国名（オプション）', optional: true }
      }
    },
    {
      name: 'calculator',
      description: '数学計算を実行します',
      parameters: {
        expression: { type: 'string', description: '計算式' },
        operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide', 'evaluate'] }
      }
    },
    {
      name: 'urlFetch',
      description: 'URLからデータを取得します',
      parameters: {
        url: { type: 'string', description: '取得するURL' },
        method: { type: 'string', enum: ['GET', 'POST'], default: 'GET' }
      }
    },
    {
      name: 'memory',
      description: 'データを一時的に保存・取得します',
      parameters: {
        action: { type: 'string', enum: ['save', 'get', 'list'] },
        key: { type: 'string', description: 'データのキー', optional: true },
        value: { type: 'string', description: '保存する値', optional: true }
      }
    }
  ]

  return c.json({ tools })
})

export { app as toolsRoute }