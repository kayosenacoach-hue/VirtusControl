# Fase 1: Construção (Build)
FROM node:22-alpine AS builder
WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json* bun.lockb* ./
RUN npm install --legacy-peer-deps

# Copiar todo o código (inclui o seu ficheiro .env mágico!)
COPY . .

# Criar a versão de produção do site
RUN npm run build

# Fase 2: Servidor Nginx (À prova de falhas)
FROM nginx:alpine

# Apagar a página padrão do Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar o site do React (já construído) para o Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Configurar o Nginx para a porta 3000 e suportar rotas do React Router
RUN echo "server {" > /etc/nginx/conf.d/default.conf && \
    echo "    listen 3000;" >> /etc/nginx/conf.d/default.conf && \
    echo "    location / {" >> /etc/nginx/conf.d/default.conf && \
    echo "        root /usr/share/nginx/html;" >> /etc/nginx/conf.d/default.conf && \
    echo "        index index.html index.htm;" >> /etc/nginx/conf.d/default.conf && \
    echo "        try_files \$uri \$uri/ /index.html;" >> /etc/nginx/conf.d/default.conf && \
    echo "    }" >> /etc/nginx/conf.d/default.conf && \
    echo "}" >> /etc/nginx/conf.d/default.conf

# Expor a mesma porta que configurámos no Easypanel
EXPOSE 3000

# Iniciar o servidor
CMD ["nginx", "-g", "daemon off;"]