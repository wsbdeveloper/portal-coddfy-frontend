# Build
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# URL relativa: nginx faz proxy de /api para o backend
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Produção
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
