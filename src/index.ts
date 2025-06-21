import { serve } from '@hono/node-server'
import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { chatRoute } from './routes/chat'
import { toolsRoute } from './routes/tools'
import 'dotenv/config'

const app = new OpenAPIHono()

// Middleware
app.use('*', cors())
app.use('*', logger())

// OpenAPI設定
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'AI SDK API Server',
    description: 'AI SDK を使用したツール機能付きチャットAPI'
  }
})

// Swagger UI
app.get('/swagger', swaggerUI({ url: '/doc' }))

// Routes
app.route('/api/chat', chatRoute)
app.route('/api/tools', toolsRoute)

// Health check
app.get('/', (c) => {
  return c.json({ 
    message: 'AI SDK API Server is running!',
    swagger: '/swagger',
    endpoints: {
      chat: '/api/chat',
      tools: '/api/tools',
      weather: '/api/weather',
      calculator: '/api/calculator'
    }
  })
})

const port = Number(process.env.PORT) || 3000
console.log(`Server is running on port ${port}`)
console.log(`Swagger UI: http://localhost:${port}/swagger`)

serve({
  fetch: app.fetch,
  port
})
