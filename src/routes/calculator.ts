import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

const app = new OpenAPIHono()

const calculateSchema = createRoute({
  method: 'post',
  path: '/calculate',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            expression: z.string().describe('計算式'),
            operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'evaluate']).describe('計算の種類')
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
            expression: z.string(),
            result: z.number(),
            operation: z.string(),
            timestamp: z.string()
          })
        }
      },
      description: '計算結果'
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            expression: z.string(),
            operation: z.string()
          })
        }
      },
      description: '計算エラー'
    }
  },
  tags: ['Calculator']
})

app.openapi(calculateSchema, (c) => {
  const { expression, operation } = c.req.valid('json')
  
  try {
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '')
    const result = Function(`"use strict"; return (${sanitized})`)()
    
    return c.json({
      expression: sanitized,
      result,
      operation,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      error: '計算エラー: 無効な式です',
      expression,
      operation
    }, 400)
  }
})

export { app as calculatorRoute }