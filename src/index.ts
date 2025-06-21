import { serve } from '@hono/node-server'
import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { chatRoute } from './routes/chat'
import { toolsRoute } from './routes/tools'
import { AIMCPServer } from './mcp/server.js'
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
    },
    mcp: {
      stdio: 'npm run mcp:stdio',
      websocket: 'npm run mcp:websocket'
    }
  })
})

const port = Number(process.env.PORT) || 3000
const mcpMode = process.env.MCP_MODE

// 起動モードの選択
if (mcpMode === 'stdio') {
  // MCP Stdio モード
  const mcpServer = new AIMCPServer()
  await mcpServer.runStdio()
} else if (mcpMode === 'websocket') {
  // MCP WebSocket モード
  const mcpServer = new AIMCPServer()
  const mcpPort = Number(process.env.MCP_PORT) || 3001
  await mcpServer.runWebSocket(mcpPort)
} else {
  // 通常のHTTP APIサーバーモード
  console.log(`HTTP API Server is running on port ${port}`)
  console.log(`Swagger UI: http://localhost:${port}/swagger`)
  
  // オプション: WebSocket MCPサーバーも同時起動
  if (process.env.ENABLE_MCP_WEBSOCKET === 'true') {
    const mcpServer = new AIMCPServer()
    const mcpPort = Number(process.env.MCP_PORT) || 3001
    mcpServer.runWebSocket(mcpPort)
    console.log(`MCP WebSocket Server is running on port ${mcpPort}`)
  }

  serve({
    fetch: app.fetch,
    port
  })
}
