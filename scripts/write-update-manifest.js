const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { version } = require("../package.json");

const directory = process.argv[2] || "dist";
const filename = `Griffy-Store-Setup-${version}.exe`;
const installer = path.join(directory, filename);
const hash = crypto.createHash("sha256");
const input = fs.createReadStream(installer);
input.on("data", chunk => hash.update(chunk));
input.on("error", error => { console.error(error.message); process.exitCode = 1; });
input.on("end", () => {
  const manifest = {
    version,
    downloadUrl: `https://github.com/guiiizldev/griffystore/releases/download/v${version}/${filename}`,
    notes: "Correcao de vendas duplicadas e atualizacao integrada pelo GitHub.",
    required: false, publishedAt: new Date().toISOString(),
    sha256: hash.digest("hex"), size: fs.statSync(installer).size,
  };
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "latest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Manifesto ${version} gerado com tamanho e SHA-256.`);
});
