const OWNER_EMAIL = 'alersonbarbosa@gmail.com';
const EBOOK_URL = 'https://alerson20.github.io/expansao-produtividade/assets/Expansao_da_Produtividade.pdf';
const SHEET_NAME = 'Leads';

function doGet() {
  return ContentService
    .createTextOutput('Serviço de envio do e-book ativo.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const params = (e && e.parameter) || {};
    const name = cleanText_(params.name, 100);
    const email = cleanEmail_(params.email);
    const consent = String(params.consent || '').toLowerCase();
    const honeypot = String(params.website || '').trim();

    if (honeypot) return response_('ignored');
    if (name.length < 2) throw new Error('Nome inválido.');
    if (!isValidEmail_(email)) throw new Error('E-mail inválido.');
    if (!['sim', 'true', 'on', '1'].includes(consent)) throw new Error('Consentimento não informado.');

    const cache = CacheService.getScriptCache();
    const cacheKey = 'lead:' + Utilities.base64EncodeWebSafe(email).slice(0, 80);
    if (cache.get(cacheKey)) return response_('duplicate');
    cache.put(cacheKey, '1', 60);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      saveLead_(name, email, params);
    } finally {
      lock.releaseLock();
    }

    sendEbookEmail_(name, email);
    sendOwnerNotification_(name, email, params);

    return response_('ok');
  } catch (error) {
    console.error(error);
    return response_('error: ' + (error && error.message ? error.message : 'Falha desconhecida'));
  }
}

function saveLead_(name, email, params) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('A planilha vinculada não foi encontrada.');

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(['Data/hora', 'Nome', 'E-mail', 'Consentimento', 'Origem', 'Data enviada pelo site']);
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    name,
    email,
    'Sim',
    cleanText_(params.source || 'Landing page', 150),
    cleanText_(params.submitted_at || '', 50),
  ]);
}

function sendEbookEmail_(name, email) {
  const firstName = escapeHtml_(name.split(/\s+/)[0] || 'leitor');
  const subject = 'Seu e-book Expansão da Produtividade';
  const body = [
    'Olá, ' + name + '!',
    '',
    'Seu e-book Expansão da Produtividade está disponível neste link:',
    EBOOK_URL,
    '',
    'Boa leitura!',
  ].join('\n');

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
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: 'Expansão da Produtividade',
    replyTo: OWNER_EMAIL,
  });
}

function sendOwnerNotification_(name, email, params) {
  const subject = 'Novo lead — Expansão da Produtividade';
  const body = [
    'Novo cadastro na landing page.',
    '',
    'Nome: ' + name,
    'E-mail: ' + email,
    'Consentimento: Sim',
    'Origem: ' + cleanText_(params.source || 'Landing page', 150),
    'Data/hora: ' + new Date().toLocaleString('pt-BR'),
  ].join('\n');

  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: subject,
    body: body,
    name: 'Landing Page do E-book',
    replyTo: email,
  });
}

function response_(message) {
  return ContentService
    .createTextOutput(message)
    .setMimeType(ContentService.MimeType.TEXT);
}

function cleanText_(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLength);
}

function cleanEmail_(value) {
  return String(value || '').trim().toLowerCase().slice(0, 254);
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
