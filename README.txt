LANDING PAGE — EXPANSÃO DA PRODUTIVIDADE

Arquivos principais:
- index.html: estrutura e conteúdo da página
- styles.css: identidade visual e responsividade
- script.js: validação, cadastro de leads e liberação do download
- assets/capa-expansao-da-produtividade.png: capa oficial
- assets/Expansao_da_Produtividade.pdf: e-book entregue após cadastro

CAPTAÇÃO DE LEADS
A página está configurada para usar a mesma instância Supabase criada no projeto Lovable.
O formulário envia nome, e-mail e consentimento para a tabela `leads`.
A política RLS deve permitir INSERT anônimo com consent=true e impedir leitura pública.

PUBLICAÇÃO
Envie todos os arquivos mantendo a mesma estrutura de pastas para Netlify, Vercel,
Cloudflare Pages, GitHub Pages ou hospedagem convencional.

TESTE LOCAL
Abra index.html diretamente ou execute um servidor local na pasta, por exemplo:
python -m http.server 8080
