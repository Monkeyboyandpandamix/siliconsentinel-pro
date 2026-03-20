"""Shared slowapi Limiter instance imported by main.py and individual routers."""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
