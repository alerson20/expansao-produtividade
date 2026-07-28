const OWNER_EMAIL = "alersonbarbosa10@gmail.com";
const EBOOK_URL =
  "https://alerson20.github.io/expansao-produtividade/assets/Expansao_da_Produtividade.pdf";
const SHEET_NAME = "Leads";
const RESEND_COOLDOWN_SECONDS = 15 * 60;
const SEND_OWNER_NOTIFICATION = false;

/**
 * Execute uma única vez no editor do Apps Script.
 * Cria a planilha/aba Leads, guarda o ID e testa o envio de e-mail.
 */
function configurar() {
  const properties = PropertiesService.getScriptProperties();
  const existingId = properties.getProperty("SPREADSHEET_ID");
  let spreadsheet;

  if (existingId) {
    spreadsheet = SpreadsheetApp.openById(existingId);
  } else {
    spreadsheet = SpreadsheetApp.create(
      "Leads - Expansão da Produtividade",
    );
    properties.setProperty("SPREADSHEET_ID", spreadsheet.getId());
  }

  ensureSheet_(spreadsheet);

  if (MailApp.getRemainingDailyQuota() < 1) {
    throw new Error("A cota diária de e-mail desta conta está esgotada.");
  }

  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: "Teste — formulário Expansão da Produtividade",
    body: "Configuração concluída. O Apps Script pode registrar contatos e enviar o e-book.",
    name: "Expansão da Produtividade",
  });

  console.log("Configuração concluída.");
}

/**
 * Aplica localidade, fuso e formato brasileiro à planilha existente.
 * Pode ser executada novamente sem enviar e-mail.
 */
function formatarPlanilha() {
  const spreadsheetId =
    PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");

  if (!spreadsheetId) {
    throw new Error("Execute primeiro a função configurar.");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ensureSheet_(spreadsheet);
  normalizeSubmittedDates_(sheet);
  console.log("Planilha padronizada para pt-BR.");
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

    const cache = CacheService.getScriptCache();
    const cooldownKey = emailCacheKey_(email);

    if (cache.get(cooldownKey)) {
      return iframeResponse_(
        "duplicate",
        "O e-book já foi enviado recentemente. Confira também Spam e Promoções.",
      );
    }

    const recipientsNeeded = SEND_OWNER_NOTIFICATION ? 2 : 1;
    if (MailApp.getRemainingDailyQuota() < recipientsNeeded) {
      throw new Error(
        "O limite diário de envios foi atingido. Tente novamente mais tarde.",
      );
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);

    try {
      // Repete a verificação dentro do lock para evitar dois envios simultâneos.
      if (cache.get(cooldownKey)) {
        return iframeResponse_(
          "duplicate",
          "O e-book já foi enviado recentemente. Confira também Spam e Promoções.",
        );
      }

      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const sheet = ensureSheet_(spreadsheet);
      const duplicate = leadExists_(sheet, email);
      let row = null;

      if (!duplicate) {
        sheet.appendRow([
          new Date(),
          name,
          email,
          "Sim",
          cleanText_(params.source || "Landing page", 150),
          parseSubmittedAt_(params.submitted_at),
          "Pendente",
        ]);
        row = sheet.getLastRow();
      }

      try {
        sendEbookEmail_(name, email);
        cache.put(cooldownKey, "1", RESEND_COOLDOWN_SECONDS);

        if (row) {
          sheet.getRange(row, 7).setValue("Enviado");
        }

        if (SEND_OWNER_NOTIFICATION) {
          sendOwnerNotification_(name, email, params, duplicate);
        }
      } catch (sendError) {
        if (row) {
          sheet.getRange(row, 7).setValue("Falha no envio");
        }
        throw sendError;
      }

      return iframeResponse_(
        duplicate ? "duplicate" : "ok",
        duplicate
          ? "O e-mail já estava cadastrado. Enviamos o e-book novamente."
          : "Cadastro concluído. O e-book foi enviado.",
      );
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return iframeResponse_(
      "error",
      error && error.message ? error.message : "Não foi possível concluir o envio.",
    );
  }
}

function ensureSheet_(spreadsheet) {
  spreadsheet.setSpreadsheetLocale("pt_BR");
  spreadsheet.setSpreadsheetTimeZone("America/Sao_Paulo");

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  const headers = [
    "Data e hora",
    "Nome",
    "E-mail",
    "Consentimento",
    "Origem",
    "Data enviada pelo site",
    "Status do envio",
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else if (!sheet.getRange(1, 7).getValue()) {
    sheet.getRange(1, 7).setValue(headers[6]);
  }

  sheet.getRange("A:A").setNumberFormat("dd/MM/yyyy HH:mm:ss");
  sheet.getRange("F:F").setNumberFormat("dd/MM/yyyy HH:mm:ss");

  return sheet;
}

function normalizeSubmittedDates_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, 6, lastRow - 1, 1);
  const normalized = range.getValues().map((row) => {
    if (row[0] instanceof Date || !row[0]) return [row[0]];
    const parsed = parseSubmittedAt_(row[0]);
    return [parsed || row[0]];
  });

  range.setValues(normalized);
  range.setNumberFormat("dd/MM/yyyy HH:mm:ss");
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
    duplicate
      ? "Cadastro repetido; o e-book foi reenviado."
      : "Novo cadastro na landing page.",
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
 * O HtmlService do Apps Script fica dentro de frames do Google.
 * Por isso a confirmação deve ir para window.top, que é a landing page.
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
          window.top.postMessage(${payload}, "*");
        <\/script>
      </body>
    </html>`;

  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL,
  );
}

function emailCacheKey_(email) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    email,
    Utilities.Charset.UTF_8,
  );
  return (
    "sent_" +
    digest
      .map((byte) => (byte + 256).toString(16).slice(-2))
      .join("")
      .slice(0, 48)
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

function parseSubmittedAt_(value) {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? "" : parsed;
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
