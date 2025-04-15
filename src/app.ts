import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import puppeteer, { Browser, Page } from "puppeteer";
import fs from "fs";
import "dotenv/config";

// Configuração do Fastify
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BotConfig {
  locoUrl: string;
  commandPrefix: string;
  ignoredUsers: string[];
  minimumMessageLength: number;
  browserHeadless: boolean;
}

interface ChatMessage {
  username: string;
  message: string;
  id: string;
}

// Classe do Bot de Sorteio
class LocoRaffleBot {
  private participants: Set<string> = new Set();
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isActive: boolean = false;
  private lastMessages: ChatMessage[] = [];
  private config: BotConfig;
  private winners: string[] = [];

  constructor(config: BotConfig) {
    this.config = config;
  }

  public async start(): Promise<string> {
    if (this.isActive) {
      return "O bot já está ativo.";
    }

    try {
      this.browser = await puppeteer.launch({
        args: ["--no-sandbox"],
        headless: "shell",
        defaultViewport: { width: 1280, height: 800 },
      });

      this.page = await this.browser.newPage();

      // Navega para a página da stream
      await this.page.goto(this.config.locoUrl, { waitUntil: "networkidle2" });

      // Aguarda pela área de chat
      await this.page
        .waitForSelector(".chat-elements-list", { timeout: 0 })
        .catch(() => {
          throw new Error(
            "Não foi possível encontrar a área de chat. Verifique o URL ou a estrutura da página."
          );
        });

      this.isActive = true;
      this.monitorChat();
      return "Bot iniciado com sucesso!";
    } catch (error) {
      await this.exit();
      return `Erro ao iniciar o bot: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }
  }

  private async monitorChat(): Promise<void> {
    console.log("Monitorando chat");
    if (!this.isActive || !this.page) return;

    try {
      // Seleciona todas as mensagens de chat
      const messages = await this.page.evaluate(() => {
        const messageElements = document.querySelectorAll(
          ".chat-elements-item div"
        );

        return Array.from(messageElements).map((el) => {
          const isMod = el.querySelectorAll("span").length === 6;
          const usernameElement = el.querySelectorAll("span")[0];
          const messageTextElement = isMod
            ? el.querySelectorAll("span")[5]
            : el.querySelectorAll("span")[2];

          return {
            username: usernameElement
              ? usernameElement.textContent?.trim() || "Anônimo"
              : "Anônimo",
            message: messageTextElement
              ? messageTextElement.textContent?.trim() || ""
              : "",
            id: el.getAttribute("data-message-id") || Date.now().toString(),
            isMod: isMod,
            spanLength: el.querySelectorAll("span").length,
          };
        });
      });

      // Filtra apenas as novas mensagens
      const newMessages = messages.filter(
        (msg) => !this.lastMessages.some((lastMsg) => lastMsg.id === msg.id)
      );

      // Processa novas mensagens
      for (const msg of newMessages) {
        if (
          msg.message
            .toLowerCase()
            .includes(this.config.commandPrefix.toLowerCase())
        ) {
          if (!this.config.ignoredUsers.includes(msg.username)) {
            this.addParticipant(msg.username);
          }
        }
      }

      // Atualiza a lista de mensagens recentes
      this.lastMessages = messages;

      // Continua monitorando
      setTimeout(() => this.monitorChat(), 15000);
    } catch (error) {
      console.error("Erro ao monitorar o chat:", error);

      // Tenta reiniciar o monitoramento
      setTimeout(() => this.monitorChat(), 20000);
    }
  }

  private addParticipant(username: string): void {
    if (!this.participants.has(username)) {
      this.participants.add(username);
      console.log(
        `Novo participante: ${username} (Total: ${this.participants.size})`
      );
    }
  }

  public drawWinner(): { winner: string | null; participantCount: number } {
    if (this.participants.size === 0) {
      return { winner: null, participantCount: 0 };
    }

    const participantsArray = Array.from(this.participants);
    const winnerIndex = Math.floor(Math.random() * participantsArray.length);
    const winner = participantsArray[winnerIndex];

    // Salva o vencedor na lista de vencedores
    this.winners.push(winner);

    // Salva o resultado em um arquivo
    // const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    // fs.writeFileSync(
    //   `sorteio-${timestamp}.txt`,
    //   `Resultado do sorteio (${new Date().toLocaleString()})\n` +
    //     `Vencedor: ${winner}\n` +
    //     `Total de participantes: ${this.participants.size}\n` +
    //     `Participantes: ${participantsArray.join(", ")}`
    // );

    return { winner, participantCount: this.participants.size };
  }

  public getParticipants(): string[] {
    return Array.from(this.participants);
  }

  public getWinners(): string[] {
    return this.winners;
  }

  public getStatus(): boolean {
    return this.isActive;
  }

  public clearParticipants(): number {
    const count = this.participants.size;
    this.participants.clear();
    return count;
  }

  public async stop(): Promise<string> {
    if (!this.isActive) {
      return "O bot já está parado.";
    }

    this.isActive = false;
    return "Bot parado. A lista de participantes foi mantida.";
  }

  public async exit(): Promise<string> {
    this.isActive = false;
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    return "Bot encerrado.";
  }
}

// Inicialização do servidor Fastify e do Bot
async function startServer() {
  const server: FastifyInstance = Fastify({ logger: true });

  // Configuração do Bot
  const botConfig: BotConfig = {
    locoUrl: `https://loco.com/streamers/${process.env.STREAMER_USER_LOCO}`, // Substitua pelo URL do seu canal
    commandPrefix: `${process.env.RAFFLE_COMMAND}`,
    ignoredUsers: ["StreamVip"],
    minimumMessageLength: 3,
    browserHeadless: false, // Defina como true para executar em segundo plano
  };

  // Instância do Bot
  const bot = new LocoRaffleBot(botConfig);

  // Configuração do template engine
  await server.register(fastifyView, {
    engine: {
      ejs: ejs,
    },
    root: path.join(__dirname, "../views"),
    viewExt: "ejs",
  });

  // Configuração dos arquivos estáticos
  await server.register(fastifyStatic, {
    root: path.join(__dirname, "../public"),
    prefix: "/public/",
  });

  // Rota principal - Interface web
  server.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const participants = bot.getParticipants();
    const isActive = bot.getStatus();
    const winners = bot.getWinners();

    return reply.view("index.ejs", {
      participants,
      isActive,
      winners,
      participantCount: participants.length,
    });
  });

  // API Rotas
  server.post(
    "/api/bot/start",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await bot.start();
      return { success: !result.includes("Erro"), message: result };
    }
  );

  server.post(
    "/api/bot/stop",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await bot.stop();
      return { success: true, message: result };
    }
  );

  server.post(
    "/api/bot/draw",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = bot.drawWinner();
      if (result.winner === null) {
        return {
          success: false,
          message: "Não há participantes para sortear.",
        };
      }
      return {
        success: true,
        winner: result.winner,
        participantCount: result.participantCount,
      };
    }
  );

  server.get(
    "/api/bot/participants",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const participants = bot.getParticipants();
      return {
        success: true,
        participants,
        count: participants.length,
      };
    }
  );

  server.get(
    "/api/bot/winners",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const winners = bot.getWinners();
      return {
        success: true,
        winners,
        count: winners.length,
      };
    }
  );

  server.post(
    "/api/bot/clear",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const count = bot.clearParticipants();
      return {
        success: true,
        message: `Lista de participantes limpa. ${count} participantes removidos.`,
      };
    }
  );

  server.post(
    "/api/bot/exit",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await bot.exit();
      // Em um aplicativo real, você poderia querer encerrar o processo aqui
      // process.exit(0);
      return { success: true, message: result };
    }
  );

  try {
    await server.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Servidor iniciado em http://localhost:3000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

startServer();
