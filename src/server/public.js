const http = require("http");
const { createApp } = require("./api");
const { migrate } = require("./schema");

const port = Number(process.env.PORT || process.env.APP_PORT || 3789);
const host = process.env.HOST || "0.0.0.0";

async function main() {
  await migrate();
  const app = createApp({ publicMode: true });
  const server = http.createServer(app);
  server.listen(port, host, () => {
    console.log(`Griffy Store web rodando em http://${host}:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
