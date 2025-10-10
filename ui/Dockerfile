# Multi-stage build for Next.js (static export) served by Nginx

# 1) Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm install; fi

# Copy source
COPY . .

# Pass backend URL at build time for static export (Next.js reads at build)
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

# Build static export (Next.js uses output: export) → outputs to /app/out
RUN npx next build

# 2) Runtime stage: Nginx
FROM nginx:alpine AS runtime

# Copy entire app, including out/ (export)
COPY --from=build /app/out/ /usr/share/nginx/html/

# Copy nginx config (SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


