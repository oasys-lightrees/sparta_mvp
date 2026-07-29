FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# NEXT_PUBLIC_* is inlined into the client bundle at build time, so the API
# base URL must be present during `npm run build`. Passed as a build arg from
# docker-compose (defaults to same-origin https://<DOMAIN>).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
