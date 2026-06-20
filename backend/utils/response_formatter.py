from typing import Any, Dict, Optional

def success_response(data: Any = None, message: str = "Success") -> Dict[str, Any]:
    """
    Standard success response formatter.
    """
    return {
        "success": True,
        "data": data if data is not None else {},
        "message": message,
        "error": None
    }

def error_response(error_detail: str, message: str = "Error occurred") -> Dict[str, Any]:
    """
    Standard error response formatter.
    """
    return {
        "success": False,
        "data": None,
        "message": message,
        "error": error_detail
    }
