import json
from typing import Any, Optional

from fastapi import Request
from fastapi.responses import JSONResponse


async def read_json_body(request: Request) -> Optional[dict]:
    """
    Returns the request body as a dict, or None when the body is not a JSON object
    (wrong content type, malformed JSON, empty body, or a non-object payload).
    """
    content_type = request.headers.get("content-type", "")
    if "application/json" not in content_type.lower():
        return None
    try:
        data = json.loads(await request.body())
    except (ValueError, UnicodeDecodeError):
        return None
    return data if isinstance(data, dict) else None


def json_response(payload: Any, status_code: int = 200) -> JSONResponse:
    return JSONResponse(payload, status_code=status_code)
