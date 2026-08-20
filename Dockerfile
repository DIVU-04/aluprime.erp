# Lightweight static hosting for the MapLead Engine site using nginx.
# Build:  docker build -t maplead-engine .
# Run:    docker run --rm -p 8080:80 maplead-engine   (then open http://localhost:8080)
FROM nginx:1.27-alpine

# Serve the site from nginx's default web root.
COPY index.html robots.txt sitemap.xml /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
