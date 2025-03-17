/**
 * Script para inicializar o projeto Loco Raffle Bot
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}=== Inicializando o Bot de Sorteio para Loco ===${colors.reset}\n`);

// Criar estrutura de diretórios
const directories = ['src', 'views', 'public', 'dist'];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(`${colors.green}✓ Diretório ${dir} criado${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Diretório ${dir} já existe${colors.reset}`);
  }
});

// Instalar dependências
console.log(`\n${colors.bright}${colors.cyan}Instalando dependências...${colors.reset}`);
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log(`${colors.green}✓ Dependências instaladas com sucesso${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}✗ Erro ao instalar dependências: ${error.message}${colors.reset}`);
  process.exit(1);
}

// Compilar TypeScript
console.log(`\n${colors.bright}${colors.cyan}Compilando TypeScript...${colors.reset}`);
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log(`${colors.green}✓ Compilação concluída com sucesso${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}✗ Erro ao compilar TypeScript: ${error.message}${colors.reset}`);
}

console.log(`\n${colors.bright}${colors.cyan}=== Projeto inicializado com sucesso ===${colors.reset}`);
console.log(`\nAgora você pode iniciar o bot com: ${colors.bright}npm start${colors.reset}`);
console.log(`\nCertifique-se de configurar a URL do seu canal em src/app.ts antes de iniciar.`);