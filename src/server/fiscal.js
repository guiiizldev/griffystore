require("dotenv").config();

function fiscalConfigured() {
  return process.env.FISCAL_ENABLED === "true";
}

async function issueFiscalDocument(sale) {
  if (!fiscalConfigured()) {
    return {
      status: "nao_configurado",
      message:
        "Modulo fiscal aguardando certificado A1, CSC/ID Token da NFC-e, inscricao estadual, regime tributario, CFOP, NCM, CSOSN/CST e homologacao SEFAZ.",
      saleId: sale.id,
    };
  }

  return {
    status: "pendente_homologacao",
    message:
      "Integracao fiscal deve ser ativada com biblioteca homologada e validada pelo contador antes de emitir em producao.",
    saleId: sale.id,
  };
}

module.exports = { issueFiscalDocument };
