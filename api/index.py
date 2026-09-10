import json
import os

from http.server import BaseHTTPRequestHandler

from google import genai
from google.genai import types

API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY environment variable is not set."
    )


client = genai.Client(api_key=API_KEY)

MODEL = "gemini-2.5-flash"

MAX_INPUT_LENGTH = 4000
MAX_REQUEST_SIZE = 20_000
MAX_OUTPUT_TOKENS = 1024

class handler(BaseHTTPRequestHandler):

    def send_json(self, status_code, data):
        response = json.dumps(data).encode("utf-8")

        self.send_response(status_code)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header(
            "Content-Length",
            str(len(response))
        )

        self.end_headers()
        self.wfile.write(response)


    
    def do_GET(self):
        self.send_json(200, {
            "status": "online"
        })


    
    def do_POST(self):

        try:

            content_length = int(
                self.headers.get("Content-Length", 0)
            )

            if content_length <= 0:
                return self.send_json(400, {
                    "error": "Request body is required."
                })

            if content_length > MAX_REQUEST_SIZE:
                return self.send_json(413, {
                    "error": "Request is too large."
                })


            raw_body = self.rfile.read(
                content_length
            )

            data = json.loads(
                raw_body.decode("utf-8")
            )

            message = data.get("message")

            if not isinstance(message, str):
                return self.send_json(400, {
                    "error": "Message must be a string."
                })

            message = message.strip()

            if not message:
                return self.send_json(400, {
                    "error": "Message cannot be empty."
                })

            if len(message) > MAX_INPUT_LENGTH:
                return self.send_json(400, {
                    "error": (
                        f"Message cannot exceed "
                        f"{MAX_INPUT_LENGTH} characters."
                    )
                })

            gemini_response = (
                client.models.generate_content(
                    model=MODEL,
                    contents=message,
                    config=types.GenerateContentConfig(
                        temperature=0.7,
                        max_output_tokens=MAX_OUTPUT_TOKENS
                    )
                )
            )


            response_text = gemini_response.text

            if not response_text:
                return self.send_json(502, {
                    "error": (
                        "The AI did not return "
                        "a response."
                    )
                })

            return self.send_json(200, {
                "response": response_text
            })


        except json.JSONDecodeError:

            return self.send_json(400, {
                "error": "Invalid JSON."
            })


        except Exception as error:
          
            print(
                f"Server error: {error}"
            )

            return self.send_json(500, {
                "error": (
                    "Something went wrong. "
                    "Please try again."
                )
            })
