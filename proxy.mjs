import http from "node:http";
import net from "node:net";

const PROXY_PORT = Number(process.env.PROXY_PORT || 8080);
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 3000);
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 8000);

function pickTargetPort(url = "/") {
  if (url.startsWith("/api/") || url === "/api" || url.startsWith("/ws/") || url.startsWith("/docs") || url === "/openapi.json") {
    return BACKEND_PORT;
  }
  return FRONTEND_PORT;
}

const server = http.createServer((req, res) => {
  const targetPort = pickTargetPort(req.url);
  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: req.headers.host || `127.0.0.1:${PROXY_PORT}`,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain" });
    }
    res.end(`Proxy error: ${err.message}`);
  });

  req.pipe(proxyReq, { end: true });
});

server.on("upgrade", (req, socket, head) => {
  const targetPort = pickTargetPort(req.url);
  const upstream = net.connect(targetPort, "127.0.0.1", () => {
    const rawHeaders = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\r\n");
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${rawHeaders}\r\n\r\n`);
    if (head && head.length) {
      upstream.write(head);
    }
    socket.pipe(upstream);
    upstream.pipe(socket);
  });

  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(PROXY_PORT, "127.0.0.1", () => {
  console.log(`Unified reverse proxy listening on http://127.0.0.1:${PROXY_PORT}`);
});
