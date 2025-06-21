// src/routes/weather.ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

const app = new OpenAPIHono()

const weatherSchema = createRoute({
  method: 'get',
  path: '/:city',
  request: {
    param: z.object({
      city: z.string().describe('都市名')
    }),
    query: z.object({
      country: z.string().optional().describe('国名')
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            location: z.string(),
            temperature: z.number(),
            condition: z.string(),
            humidity: z.number(),
            timestamp: z.string()
          })
        }
      },
      description: '天気情報'
    }
  },
  tags: ['Weather']
})

app.openapi(weatherSchema, (c) => {
  const city = c.req.param('city')
  const country = c.req.query('country')
  
  const location = country ? `${city}, ${country}` : city
  
  return c.json({
    location,
    temperature: Math.floor(Math.random() * 30) + 5,
    condition: ['晴れ', '曇り', '雨', '雪'][Math.floor(Math.random() * 4)],
    humidity: Math.floor(Math.random() * 100),
    timestamp: new Date().toISOString()
  })
})

export { app as weatherRoute }