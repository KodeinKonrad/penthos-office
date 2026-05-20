FROM node:20-alpine
WORKDIR /app
COPY server.js ./
ENV PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1
CMD ["node", "server.js"]
