# Usar a imagem oficial e mais recente do Node 22
FROM node:22-alpine

# Criar a pasta da aplicação dentro do servidor
WORKDIR /app

# Copiar os ficheiros de dependências
COPY package*.json ./

# Instalar as bibliotecas (usando o NPM correto)
RUN npm install

# Copiar o resto do código (o seu server.js)
COPY . .

# Expor a porta que o servidor vai usar
EXPOSE 3000

# Comando direto para iniciar o servidor (evita o erro SIGTERM do npm)
CMD ["node", "server.js"]