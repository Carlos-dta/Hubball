# Hubball

Hubball e um MVP para organizar cartas do eFootball, montar uma colecao pessoal e gerar um prompt pronto para analise no ChatGPT.

## Rodar localmente

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5174`

API: `http://localhost:3333`

Na mesma rede Wi-Fi, use o IP da maquina no lugar de `localhost`, por exemplo: `http://192.168.70.128:5174`.

## Publicar gratis no Render

O Hubball e um app full-stack: React + Express + banco. Por isso, publique como **Web Service** no Render, nao como Static Site/GitHub Pages.

O projeto ja inclui `render.yaml` com:

- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check: `/api/health`
- Plano Render Free
- Banco externo por `DATABASE_URL`

Passos:

1. Crie um banco Postgres gratis no Neon ou Supabase.
2. Copie a connection string do banco.
3. No Render, crie um novo **Blueprint** ou **Web Service** conectado ao repositorio.
4. Se usar Blueprint, o Render vai ler o `render.yaml` e pedir a variavel `DATABASE_URL`.
5. Cole a connection string no campo `DATABASE_URL`.
6. Se criar manualmente, use:
   - Runtime: Node
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`
   - Environment Variable: `DATABASE_URL=<connection string do Postgres>`

Localmente, sem `DATABASE_URL`, o Hubball usa SQLite em `server/storage/hubball.sqlite`. No Render Free, use `DATABASE_URL` para salvar as cartas fora do filesystem temporario do Render.

## O que ja funciona

- Buscar cartas direto no EFHub pelo nome e importar o resultado escolhido.
- Manter um Banco de cartas permanente, separado do elenco temporario usado nos prompts.
- Montar e limpar o Elenco para analise sem apagar nenhuma carta do banco.
- Salvar cartas importadas em SQLite local ou Postgres no Render, evitando perda ao reiniciar o servidor.
- Selecionar uma carta do elenco para ver atributos, mapa de posicoes, habilidades e boosters.
- Alternar entre atributos base e build MAX quando a carta importada tiver nivel maximo.
- Adicionar cartas do banco ao elenco e retira-las sem apagar os dados salvos.
- Gerar e copiar um prompt completo para o ChatGPT analisar seu elenco.
- Gerar um prompt compacto experimental de analise de elenco, com filtros, ordenacao, marcadores, copiar e baixar `.txt`.
- Usar a tela "Laboratorio" para montar 2 ou mais escalacoes com formacao escolhida, 11 titulares, banco de 12 reservas, slots clicaveis, busca EFHub por posicao, botao experimental "Melhor EFHub" com analise de ate 10.000 cartas, ate 10 substitutos sugeridos por slot e prompt proprio da escalacao.
- Importar uma carta por link do EFHub e adicionar direto na colecao.

## Endpoints principais

```txt
GET    /api/health
GET    /api/players?search=messi&position=SA
GET    /api/players/:id
GET    /api/efhub/search?q=messi&limit=24&page=1
GET    /api/efhub/best-players?scan=10000
GET    /api/card-library
GET    /api/my-cards
POST   /api/my-cards
DELETE /api/my-cards
DELETE /api/my-cards/:id
POST   /api/exports/chatgpt
POST   /api/import/efhub-link
```

## Banco de cartas e elenco para analise

Localmente, o banco fica em `server/storage/hubball.sqlite`. No Render, os mesmos dados ficam no Postgres configurado em `DATABASE_URL`.

O Hubball usa tres camadas:

- `player_cards`: cache tecnico dos dados completos das cartas importadas.
- `saved_cards`: Banco de cartas permanente do usuario.
- `my_cards`: Elenco temporario usado pelos prompts.

Limpar ou retirar cartas de `my_cards` nao remove nada de `saved_cards`. A carta continua no Banco de cartas e pode voltar ao elenco com um clique.

## Proximas etapas sugeridas

- Importar cartas por CSV.
- Melhorar o importador caso o EFHub mude o formato interno da pagina.
- Criar comparador de jogadores e sugestao automatica de titulares por formacao.

## Observacoes sobre importacao EFHub

O importador usa os dados que a pagina do EFHub envia no HTML da carta. Atualmente ele extrai nome, time/competicao, posicao principal, overall exibido, atributos, altura, peso, idade, pe, condicao, estilo de jogo, habilidades e imagem.

A busca do EFHub usa o endpoint publico de listagem de jogadores do site. O Hubball abre uma sessao publica antes da busca e retorna resultados paginados para voce carregar todas as versoes da carta.

Quando a pagina informa `levelCap`, o Hubball calcula uma build MAX com a mesma ideia do EFHub: pontos disponiveis por nivel, custo dos sliders e distribuicao para maximizar o overall da posicao principal.

No momento, o calculo MAX considera o tecnico padrao D. Stojkovic, usando QuickCounter 88 e o boost de tecnico Forca do chute +1. Quando a carta informa booster proprio no EFHub, o Hubball tambem busca esse booster em `/data/boosts.json` e aplica o bonus na build MAX.

O prompt exportado inclui dados fisicos, mapa de posicoes base/MAX, build MAX, sliders, tecnico, boosters, link EFHub e todos os atributos base/MAX separados por grupo.

A area experimental "Analise de elenco" gera um prompt mais compacto: a lista geral usa apenas informacoes essenciais, atributos maximos relevantes e habilidades-chave. Atributos completos entram apenas nas cartas marcadas como importantes no painel.

As posicoes adicionais entram nas observacoes como familiaridade, porque o Hubball ainda nao calcula a nota exata em cada posicao.
