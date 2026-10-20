# Vitrine de aparelhos

Enderecos: `/catalogo` e `/vitrine`. O catalogo anterior fica em `/acessorios`.
Compradores consultam modelos, memoria, cor, condicao, preco e bateria
informada pela loja. O contato abre o WhatsApp com o aparelho selecionado.
Nao ha cobranca nem reserva automatica nesta vitrine.

## Administracao

Entre em `/admin` e abra Vitrine de aparelhos. Cole a lista do WhatsApp ou
selecione CSV/TXT UTF-8. Ler lista gera revisao sem publicar. O rascunho e salvo
no banco, acessivel somente a administradores ativos.

No formato de WhatsApp, o leitor reconhece preco antes do modelo, memoria,
emojis de cor, porcentagem de bateria e variantes por cor. O primeiro preco
informado e o valor de venda; valores posteriores e de troca nao sao publicados.
O simbolo X e decorativo e nao indica falta de estoque. Cores interpretadas
e quantidade inicial de uma unidade precisam de revisao.
Condicao ausente precisa ser definida; cores ausentes aparecem como
"Cores sob consulta", sem inventar uma cor. Defina os dados faltantes,
confirme a conferencia e use Revisar dados antes de Publicar.

A condicao pode vir no modelo (`iPhone 17 Pro Max 256GB Lacrado`), na linha
seguinte (`Condicao: Seminovo`) ou em um titulo de grupo (`LACRADOS`,
`SEMINOVOS`). Nao ha regra permanente que considere um modelo sempre lacrado.

O modelo CSV pode ser baixado no painel. Campos: modelo, memoria, cor,
condicao, preco, quantidade, imagem, observacoes e bateria (opcional).
Semicolons, virgulas, tabulacoes e barras verticais sao suportados; use aspas
quando um campo contiver o separador. Condicoes: Lacrado, Novo e Seminovo.

Reimportar a mesma combinacao de modelo/memoria/cor/condicao atualiza preco
e quantidade, sem somar unidades. Aparelhos ausentes da lista nao sao apagados.
Use Ocultar ou quantidade zero para remover uma oferta da vitrine publica.
Editar permite atualizar preco, quantidade, bateria, foto e observacoes;
para outra variante, cadastre novo anuncio e oculte o antigo.

## Imagens e dados

Correspondencia exata de modelo, sem inventar especificacoes tecnicas.
O catalogo inicial cobre 22 modelos de iPhone; os arquivos ficam na VPS.
Fotos oficiais de referencia podem mostrar todas as cores e sao identificadas
como ilustrativas. Uma foto HTTPS fornecida pela loja substitui a referencia.
Modelos desconhecidos nao recebem foto de outro aparelho.

Referencia das imagens: [Apple Support](https://support.apple.com/en-us/108044).
Cada imagem original esta identificada em `store/device-models.json`.
Leitura de CSV: [Papa Parse](https://www.papaparse.com/docs).

Esta vitrine usa `storefront_devices`, separada de `products`, pecas,
caixa e ponto. O rascunho e privado; dados de troca nao sao publicados.

## Verificacao

`npm run check`, `node scripts/test-showcase.js` e
`npm run build --prefix store-app`. O teste de integracao opcional usa
`SHOWCASE_INTEGRATION=1` e um banco descartavel no MySQL local de testes,
nunca as credenciais de producao.
