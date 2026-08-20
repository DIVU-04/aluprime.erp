"""Detect local network addresses for phone/tablet access."""

from __future__ import annotations

import socket
from typing import Any


def _is_private_ip(ip: str) -> bool:
    if ip.startswith("10."):
        return True
    if ip.startswith("192.168."):
        return True
    if ip.startswith("172."):
        parts = ip.split(".")
        if len(parts) >= 2:
            second = int(parts[1])
            return 16 <= second <= 31
    return False


def get_local_ip_addresses() -> list[str]:
    """Return likely LAN IPv4 addresses, best candidate first."""
    found: list[str] = []

    # Best-effort default route interface (works on Linux, macOS, Windows)
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
            if ip and ip not in found:
                found.append(ip)
    except OSError:
        pass

    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if ip and ip not in found and ip != "127.0.0.1":
                found.append(ip)
    except OSError:
        pass

    private = [ip for ip in found if _is_private_ip(ip)]
    public = [ip for ip in found if ip not in private and ip != "127.0.0.1"]
    ordered = private + public + [ip for ip in found if ip not in private and ip not in public]

    return [ip for ip in ordered if ip != "127.0.0.1"]


def build_network_info(port: int = 8080, request_host: str | None = None) -> dict[str, Any]:
    ips = get_local_ip_addresses()
    localhost_url = f"http://localhost:{port}"
    network_urls = [f"http://{ip}:{port}" for ip in ips]
    primary = network_urls[0] if network_urls else None

    hostname = (request_host or "").split(":")[0].lower()
    on_localhost_client = hostname in {"localhost", "127.0.0.1"}

    return {
        "port": port,
        "localhost_url": localhost_url,
        "network_urls": network_urls,
        "primary_network_url": primary,
        "local_ip": ips[0] if ips else None,
        "on_localhost_client": on_localhost_client,
        "phone_warning": (
            "localhost only works on your computer. On iPhone/Android, use the Network URL below."
            if on_localhost_client
            else None
        ),
        "qr_url": (
            f"https://api.qrserver.com/v1/create-qr-code/?size=220x220&data={primary}"
            if primary
            else None
        ),
        "tips": [
            "Phone and computer must be on the same Wi-Fi (not mobile data).",
            "Do not use localhost on your phone — use the Network URL or scan the QR code.",
            "If it still fails, allow port 8080 in Windows Firewall (run scripts/open-firewall-windows.bat).",
            "Use http:// not https://",
        ],
    }
