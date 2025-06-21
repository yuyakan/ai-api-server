import { z } from '@hono/zod-openapi'
import { tool } from 'ai'

export const memoryTool = tool({
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