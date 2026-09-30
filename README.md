# Ordem das Sombras

Guia de matchups de Zed mid feito para o Revy. Vite + React, site estático.

## Rodar

```bash
npm install
npm run dev
```

## Atualizar os dados do patch

1. Coloque a chave da API da Riot em `.env` (`RIOT_API_KEY=...`). A chave de desenvolvimento expira em 24h.
2. Rode (pode interromper e rodar de novo; o progresso fica em `data/.cache/`):

```bash
npm run stats -- --platforms br1,kr,euw1,na1 --minutes 120
```

## Conteúdo do Revy

Edite `data/revy.json` e rode `npm run matchups`. Exemplo de um confronto:

```json
"matchups": {
  "Ahri": {
    "difficulty": 3,
    "summary": "Resumo curto do confronto.",
    "setup": { "Runa": "Eletrocutar", "Feitiços": "Flash + Incendiar", "Build": "Colheita → ..." },
    "laneTips": ["Dica 1", "Dica 2"],
    "sources": [{ "title": "Título do vídeo", "url": "https://www.youtube.com/watch?v=..." }]
  }
}
```

Campeão, nome do site, créditos e Pix ficam em `src/config.js`.
