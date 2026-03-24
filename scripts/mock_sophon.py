import http.server
import socketserver
import json
import os
from urllib.parse import urlparse

PORT = 8090
MOCK_DATA_DIR = "./fixtures/sophon_mock"
VERSION = "6.3.0_MOCK"

class SophonMockHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Redirect /manifests and /chunks to our mock directory
        if path.startswith("/manifests/"):
            return os.path.join(MOCK_DATA_DIR, "manifests", path[len("/manifests/"):])
        if path.startswith("/chunks/"):
            return os.path.join(MOCK_DATA_DIR, "chunks", path[len("/chunks/"):])
        return super().translate_path(path)

    def do_GET(self):
        parsed_url = urlparse(self.path)
        
        if parsed_url.path == "/downloader/sophon_chunk/api/getBuild":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            
            response = {
                "retcode": 0,
                "message": "OK",
                "data": {
                    "tag": VERSION,
                    "manifests": [
                        {
                            "category_id": "1",
                            "category_name": "Game Core",
                            "matching_field": "game",
                            "manifest": {"id": "mock_manifest_id"},
                            "manifest_download": {"url_prefix": f"http://localhost:{PORT}/manifests"},
                            "chunk_download": {"url_prefix": f"http://localhost:{PORT}/chunks"},
                            "stats": {"uncompressed_size": "1048576"} 
                        }
                    ]
                }
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            super().do_GET()

if __name__ == "__main__":
    print(f"Sophon Mock Server running at http://localhost:{PORT}")
    print(f"To test, run:")
    print(f"YAGO_SOPHON_API_URL=http://localhost:{PORT}/downloader/sophon_chunk/api ./yago")
    with socketserver.TCPServer(("", PORT), SophonMockHandler) as httpd:
        httpd.serve_forever()