const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não foi definida. Configure a conexão do Neon no arquivo .env.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
});

pool.on("error", (error) => {
  console.error("Erro inesperado no pool PostgreSQL:", error.message);
});

module.exports = pool;