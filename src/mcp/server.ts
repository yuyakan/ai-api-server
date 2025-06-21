import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { WebSocketServer } from 'ws'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolResult,
  Tool,
  TextContent 
} from '@modelcontextprotocol/sdk/types.js'

// 既存のツールをMCP形式に変換
class MCPToolAdapter {
  
  // 天気ツール
  static async weatherTool(args: any): Promise<CallToolResult> {
    const { city, country } = args
    const location = country ? `${city}, ${country}` : city
    
    try {
      // 実際のAPIコールをシミュレート
      const weatherData = {
        location,
        temperature: Math.floor(Math.random() * 30) + 5,
        condition: ['晴れ', '曇り', '雨', '雪'][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 100),
        timestamp: new Date().toISOString()
      }

      return {
        content: [
          {
            type: 'text',
            text: `${location}の天気情報:
気温: ${weatherData.temperature}°C
天候: ${weatherData.condition}
湿度: ${weatherData.humidity}%
取得時刻: ${weatherData.timestamp}`
          } as TextContent
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `天気情報の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
          } as TextContent
        ],
        isError: true
      }
    }
  }

  // 計算ツール
  static async calculatorTool(args: any): Promise<CallToolResult> {
    const { expression } = args
    
    try {
      // 安全な計算のため、基本的な演算と数字のみを許可
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '').trim()
      
      if (!sanitized) {
        throw new Error('計算式が見つかりません')
      }
      
      // 計算実行
      const result = Function(`"use strict"; return (${sanitized})`)()
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('計算結果が数値ではありません')
      }

      return {
        content: [
          {
            type: 'text',
            text: `計算結果: ${sanitized} = ${result}`
          } as TextContent
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `計算エラー: ${error instanceof Error ? error.message : '無効な式です'}`
          } as TextContent
        ],
        isError: true
      }
    }
  }

  // URL取得ツール
  static async urlFetchTool(args: any): Promise<CallToolResult> {
    const { url, method = 'GET' } = args
    
    try {
      const response = await fetch(url, { method })
      const data = await response.text()
      
      return {
        content: [
          {
            type: 'text',
            text: `URL: ${url}
ステータス: ${response.status} ${response.statusText}
内容: ${data.substring(0, 1000)}${data.length > 1000 ? '...' : ''}`
          } as TextContent
        ]
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `URL取得エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
          } as TextContent
        ],
        isError: true
      }
    }
  }

  // メモリツール
  static memoryStore = new Map<string, any>()
  
  static async memoryTool(args: any): Promise<CallToolResult> {
    const { action, key, value } = args
    
    try {
      switch (action) {
        case 'save':
          if (!key || !value) {
            throw new Error('キーと値が必要です')
          }
          this.memoryStore.set(key, value)
          return {
            content: [
              {
                type: 'text',
                text: `データを保存しました: ${key} = ${value}`
              } as TextContent
            ]
          }
        
        case 'get':
          if (!key) {
            throw new Error('キーが必要です')
          }
          const data = this.memoryStore.get(key)
          if (!data) {
            throw new Error(`データが見つかりません: ${key}`)
          }
          return {
            content: [
              {
                type: 'text',
                text: `取得したデータ: ${key} = ${data}`
              } as TextContent
            ]
          }
        
        case 'list':
          const keys = Array.from(this.memoryStore.keys())
          return {
            content: [
              {
                type: 'text',
                text: `保存されているキー: ${keys.join(', ')} (合計: ${keys.length}個)`
              } as TextContent
            ]
          }
        
        case 'delete':
          if (!key) {
            throw new Error('キーが必要です')
          }
          const existed = this.memoryStore.has(key)
          this.memoryStore.delete(key)
          return {
            content: [
              {
                type: 'text',
                text: existed ? `データを削除しました: ${key}` : `データが見つかりませんでした: ${key}`
              } as TextContent
            ]
          }
        
        default:
          throw new Error('無効なアクションです')
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `メモリ操作エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
          } as TextContent
        ],
        isError: true
      }
    }
  }
}

// MCP サーバーの作成
class AIMCPServer {
  private server: Server
  
  constructor() {
    this.server = new Server(
      {
        name: 'ai-api-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )

    this.setupHandlers()
  }

  private setupHandlers(): void {
    // ツール一覧の提供
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'weather',
            description: '指定された都市の天気情報を取得します',
            inputSchema: {
              type: 'object',
              properties: {
                city: {
                  type: 'string',
                  description: '都市名'
                },
                country: {
                  type: 'string',
                  description: '国名（オプション）'
                }
              },
              required: ['city']
            }
          } as Tool,
          {
            name: 'calculator',
            description: '数学計算を実行します',
            inputSchema: {
              type: 'object',
              properties: {
                expression: {
                  type: 'string',
                  description: '計算式（例: 5+3, 10*2）'
                }
              },
              required: ['expression']
            }
          } as Tool,
          {
            name: 'urlFetch',
            description: 'URLからデータを取得します',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: '取得するURL'
                },
                method: {
                  type: 'string',
                  enum: ['GET', 'POST'],
                  default: 'GET',
                  description: 'HTTPメソッド'
                }
              },
              required: ['url']
            }
          } as Tool,
          {
            name: 'memory',
            description: 'データを一時的に保存・取得します',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['save', 'get', 'list', 'delete'],
                  description: '実行するアクション'
                },
                key: {
                  type: 'string',
                  description: 'データのキー'
                },
                value: {
                  type: 'string',
                  description: '保存する値（saveの場合）'
                }
              },
              required: ['action']
            }
          } as Tool
        ]
      }
    })

    // ツールの実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      switch (name) {
        case 'weather':
          return await MCPToolAdapter.weatherTool(args)
        
        case 'calculator':
          return await MCPToolAdapter.calculatorTool(args)
        
        case 'urlFetch':
          return await MCPToolAdapter.urlFetchTool(args)
        
        case 'memory':
          return await MCPToolAdapter.memoryTool(args)
        
        default:
          return {
            content: [
              {
                type: 'text',
                text: `不明なツール: ${name}`
              } as TextContent
            ],
            isError: true
          }
      }
    })
  }

  // Stdio transport で起動（コマンドライン用）
  async runStdio(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('AI MCP Server running on stdio')
  }

  // WebSocket transport で起動（Web用）
  async runWebSocket(port: number = 3001): Promise<void> {
    const wss = new WebSocketServer({ port })
    
    wss.on('connection', async (ws) => {
      console.error(`WebSocket connection established`)
      
      // WebSocket transport の簡易実装
      const transport = {
        async start() {},
        async send(message: any) {
          ws.send(JSON.stringify(message))
        },
        async close() {
          ws.close()
        },
        onmessage: undefined as ((message: any) => void) | undefined,
        onclose: undefined as (() => void) | undefined,
        onerror: undefined as ((error: Error) => void) | undefined
      }

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          transport.onmessage?.(message)
        } catch (error) {
          console.error('WebSocket message parse error:', error)
        }
      })

      ws.on('close', () => {
        transport.onclose?.()
      })

      ws.on('error', (error) => {
        transport.onerror?.(error)
      })

      await this.server.connect(transport)
    })

    console.error(`AI MCP Server running on WebSocket port ${port}`)
  }
}

export { AIMCPServer }