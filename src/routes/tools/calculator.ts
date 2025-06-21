import { z } from '@hono/zod-openapi'
import { tool } from 'ai'

export const calculatorTool = tool({
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