# Expansão da Produtividade

Landing page estática criada com Vite e publicada no GitHub Pages.

O formulário envia os dados para um Google Apps Script, registra o contato em
uma Planilha Google e envia por e-mail o link público do e-book.

## Comandos locais

```powershell
npm.cmd ci
npm.cmd run dev
```

Para validar a versão de produção:

```powershell
npm.cmd run build
npm.cmd run preview
```

Antes de publicar ou trocar o Apps Script, siga o
[manual de correção e publicação](MANUAL-CORRECAO-PUBLICACAO.md).

## Arquivos principais

- `index.html`: conteúdo e formulário da landing page;
- `styles.css`: aparência e responsividade;
- `script.js`: validação e confirmação do formulário;
- `config.js`: URL pública `/exec` do Apps Script;
- `apps-script/Code.gs`: registro do lead e envio do e-mail;
- `public/assets/Expansao_da_Produtividade.pdf`: PDF copiado para o build;
- `.github/workflows/deploy.yml`: build e publicação no GitHub Pages.

## Limite de envio

O projeto usa `MailApp`. Em contas Gmail pessoais, a cota normal do Apps Script
é de 100 destinatários por dia; no Google Workspace, a cota publicada pelo
Google é maior. Nesta versão, o aviso por e-mail ao proprietário fica desligado
para consumir apenas um destinatário por cadastro. Os leads continuam sendo
registrados na planilha.
