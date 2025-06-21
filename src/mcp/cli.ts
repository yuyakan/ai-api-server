import { AIMCPServer } from './server.js'

async function main() {
  const server = new AIMCPServer()
  
  // コマンドライン引数で起動方式を選択
  const mode = process.argv[2] || 'stdio'
  
  switch (mode) {
    case 'stdio':
      await server.runStdio()
      break
    
    case 'websocket':
      const port = parseInt(process.argv[3]) || 3001
      await server.runWebSocket(port)
      break
    
    default:
      console.error('Usage: node mcp/cli.js [stdio|websocket] [port]')
      process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('MCP Server error:', error)
    process.exit(1)
  })
}