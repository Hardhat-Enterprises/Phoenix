import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from cyber.backend_security.verification import verify_api_request


SIGNING_SECRET = os.environ.get("CY014_SIGNING_SECRET", "cy014-demo-secret")


class SignatureDemoHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)

        result = verify_api_request(
            headers=dict(self.headers.items()),
            method="POST",
            path=self.path,
            body=body,
            secret=SIGNING_SECRET,
        )

        if not result.valid:
            self._send_json(401, {"verified": False, "reason": result.reason})
            return

        self._send_json(
            200,
            {
                "verified": True,
                "message": "Signature verified. Payload was not tampered with.",
            },
        )

    def _send_json(self, status_code, payload):
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


def run():
    server = HTTPServer(("localhost", 8088), SignatureDemoHandler)
    print("CY014 signature demo API running at http://localhost:8088")
    print("POST signed requests to http://localhost:8088/api/verify")
    server.serve_forever()


if __name__ == "__main__":
    run()
