#!/usr/bin/env python3
"""Minimal local HTTPS static file server used only to exercise docker/photon-init.sh's HTTPS
download-and-verify logic in CI, without depending on any external HTTPS host.

Usage: https_fixture_server.py <port> <directory> <certfile> <keyfile>
"""
import http.server
import ssl
import sys


def main() -> None:
    port = int(sys.argv[1])
    directory = sys.argv[2]
    certfile = sys.argv[3]
    keyfile = sys.argv[4]

    def handler(*args, **kwargs):
        return http.server.SimpleHTTPRequestHandler(*args, directory=directory, **kwargs)

    httpd = http.server.HTTPServer(("127.0.0.1", port), handler)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile, keyfile)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
