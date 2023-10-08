# timeout_helper_async.py

import asyncio
from functools import wraps

class AsyncTimeoutException(Exception):
    pass

def async_timeout(seconds):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=seconds)
            except asyncio.TimeoutError:
                raise AsyncTimeoutException(f"Function timed out after {seconds} seconds")
        return wrapper
    return decorator
