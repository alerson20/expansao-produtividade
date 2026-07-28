# Manual de correção, teste e publicação

## 1. Diagnóstico do projeto original

O site e o endpoint público do Google Apps Script estavam no ar. O problema
mais grave estava no build publicado: `config.js`, `script.js` e o PDF não
eram copiados para `dist`. No site público, esses endereços respondiam com 404.
Por isso a landing page aparecia visualmente, mas o formulário ficava sem ação
e o download não existia.

O segundo problema estava na confirmação enviada pelo Apps Script:

```js
window.parent.postMessage(...)
```

O Google Apps Script envolve o HTML em frames próprios. Nesse cenário,
`window.parent` pode apontar apenas para um frame do Google, sem alcançar a
landing page. O envio do e-mail pode acontecer, mas o visitante recebe uma
mensagem de erro depois de aguardar.

A correção desta versão usa:

```js
window.top.postMessage(...)
```

Também foram corrigidos:

- manuais antigos que misturavam FormSubmit, Supabase e Apps Script;
- JavaScript convertido em módulo para ser incluído no `dist` pelo Vite;
- PDF movido para `public/assets` para ser copiado ao build;
- falso erro disparado apenas 2,5 segundos após o carregamento do frame;
- condição de corrida em cadastros simultâneos;
- reenvio repetitivo para o mesmo endereço, com intervalo de 15 minutos;
- verificação da cota antes do envio;
- coluna `Status do envio` na planilha;
- instalação do GitHub Actions alterada para `npm ci`.

## 2. Como o sistema funciona

1. A página Vite coleta nome, e-mail e consentimento.
2. O formulário faz `POST` para a URL `/exec` indicada em `config.js`.
3. O Apps Script valida os campos e registra o contato na aba `Leads`.
4. O `MailApp` envia ao visitante um e-mail com o link do PDF.
5. O Apps Script confirma o resultado para a landing page.
6. A página mostra sucesso e libera também o download imediato.

O GitHub Pages hospeda apenas arquivos estáticos. O envio de e-mail não é feito
pelo Vite nem pelo GitHub; ele depende do Google Apps Script.

## 3. Configurar o Google Apps Script

### Criar o projeto

1. Entre em `https://script.google.com` com a conta que enviará os e-mails.
2. Crie um projeto independente e dê a ele um nome descritivo.
3. Não é necessário criar a planilha manualmente: a função `configurar` cria
   `Leads - Expansão da Produtividade`, prepara a aba `Leads` e guarda o ID nas
   propriedades do projeto.

### Atualizar o código

1. No editor, abra `Código.gs`.
2. Substitua todo o conteúdo pelo arquivo `apps-script/Code.gs` deste projeto.
3. Em **Configurações do projeto**, habilite a exibição do manifesto.
4. Substitua `appsscript.json` pelo arquivo de mesmo nome deste projeto.
5. Salve.

### Autorizar e preparar

1. Selecione a função `configurar`.
2. Clique em **Executar**.
3. Autorize o acesso ao envio de e-mail e à planilha.
4. Confirme que chegou o e-mail de teste.
5. Confirme que a aba `Leads` foi criada.
6. Se quiser reaplicar o padrão brasileiro à planilha existente, execute
   `formatarPlanilha`.

### Implantar uma nova versão

1. Abra **Implantar → Gerenciar implantações**.
2. Se ainda não houver implantação, escolha **Nova implantação → App da Web**.
3. Se já houver, clique no lápis e selecione **Nova versão**.
4. Use **Executar como: Eu**.
5. Use **Quem pode acessar: Qualquer pessoa**.
6. Clique em **Implantar**.
7. Copie a URL terminada em `/exec`.

Salvar `Código.gs` não atualiza sozinho uma implantação existente. Sempre crie
uma nova versão.

## 4. Conectar o site

Abra `config.js` e deixe somente a URL pública:

```js
export const EBOOK_CONFIG = Object.freeze({
  appsScriptUrl: "https://script.google.com/macros/s/SEU_ID/exec",
});
```

Teste a URL diretamente no navegador. O resultado esperado é:

`Serviço do e-book ativo.`

Nesta implantação, a URL já configurada em `config.js` é:

`https://script.google.com/macros/s/AKfycbyxFGdJ8luYoMm58YDXT61zg_nkVE1Klvwidj60tSVpoaF2G4Wv2VvPcEOEFtyRxrXg/exec`

## 5. Rodar e testar localmente

No PowerShell, dentro da pasta do projeto:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abra o endereço exibido pelo Vite. Para o teste final, use um e-mail real que
você possa consultar e confirme:

- mensagem de sucesso na página;
- uma nova linha na aba `Leads`;
- status `Enviado`;
- e-mail recebido, inclusive nas pastas Spam e Promoções;
- botão de download abrindo o PDF.

Depois valide o build:

```powershell
npm.cmd run build
npm.cmd run preview
```

## 6. Publicar no GitHub Pages

Copie os arquivos corrigidos para o clone do repositório. Não copie
`node_modules` nem `dist`.

No repositório:

```powershell
npm.cmd ci
npm.cmd run build
git status
git add .
git commit -m "Corrige confirmação e envio do e-book"
git push origin main
```

No GitHub:

1. Abra **Settings → Pages**.
2. Em **Build and deployment**, selecione **GitHub Actions**.
3. Abra **Actions** e aguarde `Publicar site no GitHub Pages` ficar verde.
4. Acesse `https://alerson20.github.io/expansao-produtividade/`.
5. Faça o teste final em janela anônima.

O `vite.config.mjs` já calcula a base
`/expansao-produtividade/` durante o GitHub Actions.

## 7. Atualizações futuras

### Alterou somente HTML, CSS, JavaScript ou PDF

Execute build, commit e push. Não é necessário reimplantar o Apps Script.

### Alterou `apps-script/Code.gs` ou `appsscript.json`

Copie as mudanças para o editor do Google, salve, execute `configurar` se as
permissões mudaram e implante uma **nova versão**.

### Criou outra implantação

Troque a URL em `config.js`, gere o build e publique novamente no GitHub.

## 8. Limites e segurança

- Uma conta Gmail pessoal tem cota publicada de 100 destinatários por dia no
  Apps Script. Como esta versão envia um e-mail por cadastro, o teto prático é
  próximo de 100 cadastros diários, descontando testes e outros scripts.
- A entrega na caixa principal não é garantida; filtros de Spam e Promoções
  dependem do provedor do destinatário.
- O formulário público pode ser alvo de automação. Há intervalo de reenvio por
  endereço, adequado para tráfego pequeno. Para campanhas maiores, use um
  serviço transacional com domínio autenticado e CAPTCHA validado no servidor.
- Nunca coloque senha, token privado ou chave secreta no Vite, no GitHub Pages
  ou em `config.js`, pois esses arquivos são públicos.

## 9. Diagnóstico rápido

### Site informa que o envio não foi confirmado

- confirme que o `Code.gs` implantado usa `window.top.postMessage`;
- implante uma nova versão;
- confira se `config.js` aponta para a URL `/exec` atual.

### Nenhum e-mail chegou

- confira `Status do envio` na planilha;
- abra **Apps Script → Execuções** e leia o erro;
- execute `MailApp.getRemainingDailyQuota()` no editor;
- verifique Spam e Promoções;
- confirme que o link do PDF abre publicamente.

### Não foi criada linha na planilha

- execute `configurar`;
- abra no Google Drive a planilha `Leads - Expansão da Produtividade`;
- reautorize o manifesto atualizado;
- confira as execuções do Apps Script.

### GitHub Actions falhou

- rode `npm.cmd ci` e `npm.cmd run build` localmente;
- confirme que `package-lock.json` foi enviado;
- em **Settings → Pages**, use GitHub Actions como fonte;
- leia a etapa vermelha do workflow antes de repetir o push.
