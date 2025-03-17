# Use a imagem oficial do Node.js
FROM node:18-slim

# Define o diretório de trabalho
WORKDIR /app

# Instala as dependências necessárias para o Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf fonts-liberation \
    libxss1 \
    ca-certificates \
    dumb-init \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Define variáveis de ambiente para o Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Cria um usuário não-root
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Copia os arquivos package.json e package-lock.json
COPY --chown=pptruser:pptruser package*.json ./

# Instala as dependências
RUN npm install

# Copia o resto dos arquivos do projeto
COPY --chown=pptruser:pptruser . .

# Executa o script de build para compilar o TypeScript
RUN npm run build

# Expõe a porta 3000
EXPOSE 3000

# Muda para o usuário não-root
USER pptruser

# Inicia a aplicação usando dumb-init como gerenciador de processos
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]