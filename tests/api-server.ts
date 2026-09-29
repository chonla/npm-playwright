import http from 'node:http';
import type { AddressInfo } from 'node:net';

/** A tiny local API so the package tests never depend on the network. */
export async function startApiServer() {
  const products = [
    { sku: '0000000001', title: 'TerraFlex Hoodie', price: 79.69 },
    { sku: '0000000002', title: 'NordicPeak Jacket', price: 206.2 },
    { sku: '000/03', title: 'Slash Sku', price: 1 },
  ];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, 'http://localhost');
    const body = await new Promise<string>((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => resolve(data));
    });
    const json = (status: number, value: unknown, headers: Record<string, string> = {}) => {
      res.writeHead(status, { 'content-type': 'application/json', ...headers });
      res.end(JSON.stringify(value));
    };

    if (url.pathname === '/api/auth' && req.method === 'POST') {
      const credential = JSON.parse(body || '{}');
      return credential.password === 'password'
        ? json(200, { token: 'abc.def.ghi', user: credential.login }, { 'set-cookie': 'access_token=abc.def.ghi; Path=/' })
        : json(401, { error: 'invalid credential' });
    }
    if (url.pathname === '/api/products' && req.method === 'GET') {
      const page = Number(url.searchParams.get('page') ?? '1');
      return json(200, { total: products.length, pageSize: 2, pageNumber: page, data: products.slice((page - 1) * 2, page * 2) });
    }
    if (url.pathname.startsWith('/api/products/') && req.method === 'GET') {
      const sku = decodeURIComponent(url.pathname.slice('/api/products/'.length));
      const product = products.find((p) => p.sku === sku);
      return product ? json(200, product) : json(404, { error: 'not found' });
    }
    if (url.pathname === '/api/echo') {
      return json(200, {
        method: req.method,
        query: Object.fromEntries(url.searchParams),
        contentType: req.headers['content-type'] ?? null,
        authorization: req.headers['authorization'] ?? null,
        body,
      });
    }
    if (url.pathname === '/api/text') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('not json');
    }
    json(404, { error: 'no route' });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { baseURL: `http://127.0.0.1:${port}`, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}
