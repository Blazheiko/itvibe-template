// Stand-in for CDN_URL in the CSP browser tests: answers every GET with a 1x1 PNG.
import { createServer } from 'node:http'
import process from 'node:process'

const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
)
const port = Number(process.env.CDN_STUB_PORT ?? 3901)

createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'image/png', 'content-length': PNG.length })
    res.end(PNG)
}).listen(port, '127.0.0.1')
