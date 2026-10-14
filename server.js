const fs = require("node:fs/promises");
const path = require("node:path");
require("dotenv").config();

const app = require("./app");
const db = require("./db");
const port = Number(process.env.API_PORT || 3001);

async function start() {
  await db.query("SELECT 1");
  const schema = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
  await db.query(schema);

  app.listen(port, () => {
    console.log("API rodando em http://localhost:" + port + " (PostgreSQL/Neon conectado)");
  });
}

start().catch((error) => {
  console.error("Não foi possível iniciar a API ou preparar o schema PostgreSQL:", error.message);
  process.exit(1);
});