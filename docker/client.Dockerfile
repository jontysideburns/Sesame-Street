FROM node:23-alpine AS deps

WORKDIR /app/client

COPY client/package.json client/package-lock.json ./

RUN npm ci

FROM deps AS builder

WORKDIR /app/client

COPY client ./

ARG API_URL=http://server:4000
ENV API_URL=${API_URL}

RUN npm run build

FROM node:23-alpine AS runner

WORKDIR /app/client

ENV NODE_ENV=production
ENV PORT=3000
ENV API_URL=http://server:4000

COPY --from=deps /app/client/node_modules ./node_modules
COPY --from=builder /app/client ./

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
