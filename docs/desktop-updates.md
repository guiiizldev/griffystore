# Atualizacao do aplicativo

Os instaladores e metadados ficam no GitHub Releases de
`guiiizldev/griffystore`. Nao sao armazenados na VPS.
O aplicativo usa `electron-updater` e o provedor GitHub gerado pelo
electron-builder, com verificacao de integridade do arquivo baixado.

## Primeira instalacao

A versao 0.2.0 apenas abre o instalador no navegador. Instale a versao 0.2.2
uma vez para ativar o download e a instalacao integrados. Nao e necessario
apagar o banco nem as configuracoes do usuario.

A pasta win-unpacked tambem e gerada atualizada e distribuida em ZIP.
Para atualizacoes integradas no Windows, prefira o instalador NSIS.
Arquivos `.env` reais nao sao incluidos nos novos pacotes; a API padrao
dos aplicativos empacotados e `https://griffystore.com.br/api`.

## Uso na loja

Ao abrir, o sistema verifica a versao no GitHub. O botao Atualizar inicia
o download e mostra o andamento em Config. A instalacao exige confirmacao,
sem reiniciar automaticamente no fechamento comum do programa. E bloqueada
quando ha venda no carrinho ou salvamento de venda em andamento.

## Publicar a proxima versao

1. Executar os testes e incrementar a versao de package.json/package-lock.json.
2. Enviar o commit ao main e criar uma tag igual a versao, por exemplo v0.2.3.
3. O workflow Desktop Release no GitHub Actions gera instalador, blockmap,
   latest.yml, latest.json com SHA-256 e ZIP da pasta win-unpacked.
4. Todos os arquivos sao enviados a um rascunho antes de publicar a release.
5. Confirmar os downloads da release publicada antes de atualizar o manifesto
   legado `updates/latest.json` no main. Nunca anunciar um arquivo inexistente.
6. Fazer git pull na VPS e reiniciar somente o processo griffystore se houve
   mudancas no backend. Atualizar aplicativo nao atualiza o backend da VPS.

O endpoint `/api/updates/check` serve clientes legados. Na VPS, definir
`UPDATE_MANIFEST_URL=https://github.com/guiiizldev/griffystore/releases/latest/download/latest.json`.
Nenhum token do GitHub e distribuido aos clientes. O token do Actions so
tem permissao de escrita de conteudo durante a publicacao.

Testes: `npm run test:desktop-updates` e `npm run test:sale-duplicates`.
O ciclo completo de instalacao precisa ser validado em um Windows com a
versao anterior instalada, pois os testes nao executam um instalador no PC.

Referencia: https://www.electron.build/v26/docs/features/auto-update/
