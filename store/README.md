# Loja virtual Griffy Store

Esta pasta pode ser enviada para uma hospedagem de site comum como arquivos estaticos.

## Como configurar

1. Suba todo o conteudo da pasta `store` para a hospedagem.
2. Edite `config.js`.
3. Informe a URL publica da API que ficara na VPS:

```js
window.GRIFFY_STORE_CONFIG = {
  API_BASE_URL: "https://api.seudominio.com",
  THEME: "auto",
  PROMO: {
    enabled: false,
    title: "Promocao Griffy Store",
    text: "Ofertas especiais por tempo limitado.",
    buttonText: "Ver ofertas",
    target: "./catalogo.html"
  }
};
```

Se a loja e a API ficarem no mesmo dominio, pode deixar vazio:

```js
API_BASE_URL: ""
```

## Paginas

- `index.html`: pagina inicial institucional.
- `catalogo.html`: catalogo online conectado ao estoque.
- `admin.html`: painel do site para tema, promocao e contato.

Se a hospedagem permitir URLs amigaveis, a API local do sistema tambem serve `/loja/catalogo` e `/loja/admin`.

## Painel do site

Acesse `admin.html` na hospedagem e salve usando o PIN de um operador administrador do sistema.
Os produtos continuam sendo cadastrados e editados apenas no sistema Griffy Store.

O campo de tema aceita:

- `auto`: escolhe automaticamente por data.
- `default`: padrao Griffy.
- `black-friday`: tema de Black Friday.
- `natal`: tema de Natal.
- `namorados`: tema de Dia dos Namorados.
- `maes`: tema de Dia das Maes.

Para ativar uma campanha, use a area `Promocao` do painel do site.

## API necessaria

A VPS precisa rodar o servidor do sistema expondo:

- `GET /api/storefront/config`
- `GET /api/storefront/products`
- `POST /api/storefront/orders`
- `POST /api/storefront/admin/config`

No `.env` da API, configure:

```env
STOREFRONT_ALLOWED_ORIGIN=https://seudominio-da-loja.com
```

Durante testes, pode usar:

```env
STOREFRONT_ALLOWED_ORIGIN=*
```
