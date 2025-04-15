Para executar o projeto **Loco Raffle**, siga as instruções abaixo:

## Pré-requisitos

- [Node.js](https://nodejs.org/) instalado em sua máquina.
- [Docker](https://www.docker.com/) instalado, caso opte por executar o projeto em um contêiner.

## Clonando o Repositório

Primeiro, clone o repositório do projeto:


```bash
git clone https://github.com/gitlherme/loco-raffle.git
```


Navegue até o diretório do projeto:


```bash
cd loco-raffle
```


## Configuração do Ambiente

O projeto utiliza variáveis de ambiente para sua configuração. Renomeie o arquivo `.env.example` para `.env` e ajuste as variáveis conforme necessário:


```bash
mv .env.example .env
```


Edite o arquivo `.env` com as configurações apropriadas.

## Instalando as Dependências

Instale as dependências do projeto utilizando o npm:


```bash
npm install
```


## Executando o Projeto

Para iniciar o projeto em ambiente de desenvolvimento:


```bash
npm run build
npm start
```


O projeto estará acessível em `http://localhost:3000`.

## Executando com Docker

Alternativamente, você pode executar o projeto utilizando Docker. Certifique-se de que o Docker esteja instalado e em execução. No diretório do projeto, construa a imagem do Docker:


```bash
docker build -t loco-raffle .
```


Em seguida, execute o contêiner:


```bash
docker run -p 3000:3000 loco-raffle
```


O projeto estará acessível em `http://localhost:3000`.
