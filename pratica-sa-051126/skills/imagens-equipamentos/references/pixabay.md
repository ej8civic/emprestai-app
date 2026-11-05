# API da Pixabay (conferida em pixabay.com/api/docs, 2026-11-05)

- Endpoint: `GET https://pixabay.com/api/` com `key`, `q` (até 100 caracteres), `image_type=photo`, `orientation=horizontal`, `safesearch=true`, `min_width=800`, `min_height=600`, `per_page` de 3 a 200, `page` e `order=popular|latest`.
- Cada resultado traz `id`, `pageURL`, `user`, `user_id`, `tags`, `webformatURL` (até 640 px, vale 24 h), `largeImageURL` (até 1280 px) e `imageWidth`/`imageHeight`. Use `largeImageURL`: com 640 px não existe 800×600 sem esticar.
- Limite: 100 pedidos por 60 s por chave. Passou disso, volta HTTP 429. Cabeçalhos `X-RateLimit-*`.
- Cache: as respostas devem ser guardadas por 24 h. `prepare.mjs` grava a resposta em `out/cache/` e a reutiliza.
- Hotlink: URLs da Pixabay não podem ser usadas de forma permanente no app. As fotos são baixadas e servidas pelo nosso bucket.
- Atribuição: mostrar a origem das imagens. Por isso "Fotos: Pixabay" e a página `/creditos`.
- Uso: pedidos de pessoa real, sem varredura em massa. Doze buscas, uma por equipamento, cabem no uso previsto.
- Licença: Pixabay Content License (uso livre, inclusive comercial). O manifesto registra a licença com esse texto.
