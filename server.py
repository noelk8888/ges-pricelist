#!/usr/bin/env python3
"""
GES Price List Server

Serves the app and handles price list uploads via POST /upload.

Usage:
    python3 server.py

Then open http://localhost:8000 in your browser.
"""

import cgi
import io
import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

from docx import Document

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 8000
MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


def parse_product_cell(text):
    lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
    if not lines:
        return None, None

    code = lines[0].rstrip('/')

    if len(lines) == 1:
        description = ""
    elif len(lines) == 2:
        description = lines[1]
    else:
        desc_lines = lines[1:]
        first = desc_lines[0]
        rest = desc_lines[1:]
        last = rest[-1]
        if 'warranty' in last.lower():
            middle = rest[:-1]
            if middle:
                description = first + " " + "/".join(middle) + " " + last
            else:
                description = first + " " + last
        else:
            description = first + " " + "/".join(rest)

    return code, description


def parse_docx(docx_bytes):
    doc = Document(io.BytesIO(docx_bytes))
    products = []
    seen_codes = set()

    for i, table in enumerate(doc.tables):
        if i == 0:  # skip header table
            continue

        num_cols = len(table.columns)
        if num_cols == 6:
            dealer_col = 3
        elif num_cols == 5:
            dealer_col = 2
        else:
            continue

        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            product_text = cells[0]

            if not product_text:
                continue

            code, description = parse_product_cell(product_text)

            if not code or code.upper() == 'PRODUCT':
                continue

            price = ""
            if dealer_col < len(cells):
                price = cells[dealer_col].split('\n')[0].strip()

            if not price or not any(c.isdigit() for c in price):
                continue

            if code in seen_codes:
                continue
            seen_codes.add(code)

            products.append({
                "code": code,
                "description": description,
                "dealerPrice": price
            })

    return products


class PriceListHandler(SimpleHTTPRequestHandler):

    def do_POST(self):
        if self.path == '/upload':
            self._handle_upload()
        else:
            self.send_error(404)

    def _handle_upload(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > MAX_UPLOAD_BYTES:
                self._send_json(400, {'error': 'File too large (max 20 MB)'})
                return

            content_type = self.headers.get('Content-Type', '')
            if 'multipart/form-data' not in content_type:
                self._send_json(400, {'error': 'Expected multipart/form-data'})
                return

            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    'REQUEST_METHOD': 'POST',
                    'CONTENT_TYPE': content_type,
                    'CONTENT_LENGTH': str(content_length),
                }
            )

            if 'file' not in form:
                self._send_json(400, {'error': 'No file field found'})
                return

            file_item = form['file']
            filename = file_item.filename or ''

            if not filename.lower().endswith('.docx'):
                self._send_json(400, {'error': 'Only .docx files are supported'})
                return

            docx_bytes = file_item.file.read()
            products = parse_docx(docx_bytes)

            if not products:
                self._send_json(400, {'error': 'No products found in the file'})
                return

            data_path = os.path.join(SCRIPT_DIR, 'data.json')
            with open(data_path, 'w') as f:
                json.dump(products, f, indent=2)

            # Save uploaded docx to project folder
            docx_path = os.path.join(SCRIPT_DIR, filename)
            with open(docx_path, 'wb') as f:
                f.write(docx_bytes)

            self._send_json(200, {
                'success': True,
                'count': len(products),
                'message': f'Successfully loaded {len(products)} products.'
            })

        except Exception as e:
            self._send_json(500, {'error': f'Server error: {str(e)}'})

    def _send_json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass  # suppress per-request logs


def main():
    os.chdir(SCRIPT_DIR)
    server = HTTPServer(('', PORT), PriceListHandler)
    print(f"GES Price List server running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == '__main__':
    main()
