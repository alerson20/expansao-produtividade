const OWNER_EMAIL = "alersonbarbosa@gmail.com";
const EBOOK_URL =
  "https://alerson20.github.io/expansao-produtividade/assets/Expansao_da_Produtividade.pdf";
const SHEET_NAME = "Leads";

/**
 * Execute uma única vez no editor do Apps Script.
 * Cria a aba Leads, guarda o ID da planilha e testa o envio de e-mail.
 */
function configurar() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error(
      "Abra este projeto por Extensões → Apps Script dentro da Planilha Google.",
    );
  }

  PropertiesService.getScriptProperties().setProperty(
    "SPREADSHEET_ID",
    spreadsheet.getId(),
  );

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Data e hora",
      "Nome",
      "E-mail",
      "Consentimento",
      "Origem",
      "Data enviada pelo site",
    ]);
    sheet.setFrozenRows(1);
  }

  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: "Teste — formulário Expansão da Produtividade",
    body: "Configuração concluída. O Apps Script pode registrar contatos e enviar o e-book.",
    name: "Expansão da Produtividade",
  });

  console.log("Configuração concluída.");
}

function doGet() {
  return HtmlService.createHtmlOutput(
    "<!doctype html><meta charset='utf-8'><title>Serviço ativo</title><p>Serviço do e-book ativo.</p>",
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const name = cleanText_(params.name, 100);
    const email = cleanEmail_(params.email);
    const consent = String(params.consent || "").toLowerCase();
    const honeypot = String(params.website || "").trim();

    if (honeypot) {
      return iframeResponse_("ok", "Cadastro concluído.");
    }

    if (name.length < 2) throw new Error("Nome inválido.");
    if (!isValidEmail_(email)) throw new Error("E-mail inválido.");
    if (!["sim", "true", "on", "1"].includes(consent)) {
      throw new Error("Consentimento não informado.");
    }

    const spreadsheetId =
      PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");

    if (!spreadsheetId) {
      throw new Error("Execute primeiro a função configurar.");
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Data e hora",
        "Nome",
        "E-mail",
        "Consentimento",
        "Origem",
        "Data enviada pelo site",
      ]);
      sheet.setFrozenRows(1);
    }

    const duplicate = leadExists_(sheet, email);

    if (!duplicate) {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        sheet.appendRow([
          new Date(),
          name,
          email,
          "Sim",
          cleanText_(params.source || "Landing page", 150),
          cleanText_(params.submitted_at || "", 50),
        ]);
      } finally {
        lock.releaseLock();
      }
    }

    // Mesmo se o contato já existir, envia novamente o e-book.
    sendEbookEmail_(name, email);
    sendOwnerNotification_(name, email, params, duplicate);

    return iframeResponse_(
      duplicate ? "duplicate" : "ok",
      duplicate
        ? "O e-mail já estava cadastrado. Enviamos o e-book novamente."
        : "Cadastro concluído. O e-book foi enviado.",
    );
  } catch (error) {
    console.error(error);
    return iframeResponse_(
      "error",
      error && error.message ? error.message : "Falha desconhecida.",
    );
  }
}

function leadExists_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const values = sheet.getRange(2, 3, lastRow - 1, 1).getDisplayValues();
  return values.some((row) => cleanEmail_(row[0]) === email);
}

function sendEbookEmail_(name, email) {
  const firstName = escapeHtml_(name.split(/\s+/)[0] || "leitor");
  const subject = "Seu e-book Expansão da Produtividade";
  const body = [
    "Olá, " + name + "!",
    "",
    "Seu e-book Expansão da Produtividade está disponível neste link:",
    EBOOK_URL,
    "",
    "Boa leitura!",
  ].join("\n");

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#173f39;line-height:1.6">
      <h1 style="font-size:25px;margin-bottom:8px">Olá, ${firstName}!</h1>
      <p>Seu e-book <strong>Expansão da Produtividade</strong> está liberado.</p>
      <p style="margin:28px 0">
        <a href="${EBOOK_URL}" style="background:#d5ed8b;color:#173f39;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700;display:inline-block">Baixar o e-book</a>
      </p>
      <p>Caso o botão não abra, copie este endereço no navegador:</p>
      <p><a href="${EBOOK_URL}">${EBOOK_URL}</a></p>
      <p>Boa leitura!</p>
    </div>`;

  MailApp.sendEmail({
    to: email,
    subject,
    body,
    htmlBody,
    name: "Expansão da Produtividade",
    replyTo: OWNER_EMAIL,
  });
}

function sendOwnerNotification_(name, email, params, duplicate) {
  const body = [
    duplicate ? "Cadastro repetido; o e-book foi reenviado." : "Novo cadastro na landing page.",
    "",
    "Nome: " + name,
    "E-mail: " + email,
    "Consentimento: Sim",
    "Origem: " + cleanText_(params.source || "Landing page", 150),
    "Data/hora: " + new Date().toLocaleString("pt-BR"),
  ].join("\n");

  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: duplicate
      ? "Lead repetido — Expansão da Produtividade"
      : "Novo lead — Expansão da Produtividade",
    body,
    name: "Landing Page do E-book",
    replyTo: email,
  });
}

/**
 * Retorna uma página mínima dentro do iframe e comunica o resultado ao site.
 * O ALLOWALL é necessário para a resposta poder carregar no iframe do GitHub Pages.
 */
function iframeResponse_(status, message) {
  const payload = JSON.stringify({
    source: "ebook-apps-script",
    status,
    message,
  }).replace(/</g, "\\u003c");

  const html = `<!doctype html>
    <html lang="pt-BR">
      <head><meta charset="utf-8"><title>Resultado do formulário</title></head>
      <body>
        <p>${escapeHtml_(message)}</p>
        <script>
          window.parent.postMessage(${payload}, "*");
        <\/script>
      </body>
    </html>`;

  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL,
  );
}

function cleanText_(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanEmail_(value) {
  return String(value || "").trim().toLowerCase().slice(0, 254);
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
