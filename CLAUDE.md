# Ordem das Sombras — guia de matchups de Zed (Revy)

Site de fã com as matchups de Zed mid, feito para o streamer Revy (twitch.tv/revy, YouTube @seshrevy). Nasceu da mesma base do "Pacto de Sangue" (site de Vladimir em `Documents\vlad-site\vlad-site`).

## Como o conteúdo é montado
- `scripts/collect-stats.mjs` — coleta própria na API oficial da Riot (chave em `.env`, nunca em `src/`): partidas ranqueadas de Zed mid em Mestre+ (BR, KR, EUW, NA), agregadas por inimigo → `data/stats.json`. `--aggregate-only` recalcula a partir do cache (`data/.cache/`) sem chamar a API.
- `data/revy.json` — conteúdo do Revy (dificuldade, resumo, setup, dicas de lane, vídeos, fundamentos). Tudo opcional; começa vazio.
- `scripts/build-matchups.mjs` — junta os dois em `data/matchups.json` (mesmo formato do site base). O que o Revy escrever tem prioridade; o resto vem dos dados. Dificuldade automática = taxa de vitória do Zed contra o inimigo, relativa à média dele, suavizada para amostras pequenas.
- `npm run stats` coleta e monta; `npm run matchups` só remonta (depois de editar `revy.json`).

## Telas
Mesmas do site base: escolha de rota (só MID), "Escolhe teu inimigo" (grade, filtros, Aleatório, LOCK IN, falas e sons do client), guia do confronto (splash, dificuldade, "No patch", dicas, vídeos), Fundamentos (estatística geral do Zed no patch + cards do Revy), Arena (`data/arena-zed.json`), volume/mudo. Campeão, nome do site e criador ficam em `src/config.js`.

## Regras importantes
- Não raspar deeplol, OP.GG, METAsrc, Blitz etc. (termos proíbem coleta automatizada). Dados vêm da API da Riot.
- Não mostrar estatísticas de contas específicas (nem as do Revy) sem ele autorizar: a política da Riot pede opt-in do jogador. O site só usa números agregados.
- Não inventar dicas "do Revy": o que não vier dele fica marcado como dado do patch.
- Pix desligado (`PIX_ENABLED = false`) até o Revy passar uma chave aleatória dele. Conferir a política de fan projects da Riot sobre doações antes de ligar.
- Assets só de fontes oficiais/públicas: Data Dragon (ícones, splashes, itens) e CommunityDragon (falas, sons, augments).
- Rodapé obrigatório (Riot "Legal Jibber Jabber") com o nome do site.

## Stack
Vite + React, site estático, rotas por hash, deploy no GitHub Pages via `.github/workflows/deploy.yml`.
