import { z } from '@hono/zod-openapi'
import { tool } from 'ai'

export const urlFetchTool = tool({
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