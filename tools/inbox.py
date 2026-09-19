#!/usr/bin/env python3
"""A tiny receiver so the page can hand files back to the repo without the
browser's download dialog: POST a data URL or text to http://localhost:8778/<name>
and it lands in <outdir>/<name>. The extension's screenshot path fails and
Chrome blocks repeat programmatic downloads, so this is how frames, JSON and
big element lists get out of the page.

    python3 tools/inbox.py [outdir] [port]        # default: ./inbox 8778

From the page:
    fetch('http://localhost:8778/frame.png', {method:'POST', body: canvas.toDataURL()})
    fetch('http://localhost:8778/program.json', {method:'POST', body: JSON.stringify(data)})
"""
import base64, os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer

OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'inbox')
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8778
os.makedirs(OUT, exist_ok=True)

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_POST(self):
        name = os.path.basename(self.path.split('?')[0]) or 'file'
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        if body.startswith(b'data:'):
            body = base64.b64decode(body.split(b',', 1)[1])
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(body)
        self.send_response(200); self._cors(); self.end_headers()
        self.wfile.write(b'ok')
    def log_message(self, *a):
        pass

print(f'inbox on http://localhost:{PORT} -> {OUT}')
HTTPServer(('127.0.0.1', PORT), H).serve_forever()
