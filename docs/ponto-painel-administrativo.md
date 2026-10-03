# Painel de ponto

Em Equipe, selecione o mes e o funcionario. O painel mostra dias registrados,
atrasos, faltas por atraso e horas apuradas. Abra um dia para conferir entrada,
saida e marcacoes. As evidencias carregam a foto apenas ao abrir a marcacao.
O CSV exporta o funcionario e o mes selecionados.

## Regras de pontualidade

- Verde: entrada ate 09:00.
- Laranja: de 09:01 ate 09:10.
- Vermelho: depois de 09:10, classificado como falta por atraso.
- Sem entrada: dia com outras marcacoes, mas nenhuma entrada registrada.

O administrador ou gerente pode mudar a entrada prevista e o limite de atraso
em Configuracoes de jornada e local. A classificacao preserva os registros.
Dias sem nenhuma marcacao nao sao considerados faltas automaticamente, pois
o sistema ainda nao possui escala de dias de trabalho e folgas.
Horas apuradas descontam intervalos completos. Dias sem entrada, saida ou com
intervalo aberto ficam pendentes. A configuracao de horario vale para a equipe
e recalcula o resumo dos registros existentes.

## Atualizacao na VPS

```bash
cd /var/www/griffystore
git pull --ff-only origin main
npm run check
npm run test:timeclock
pm2 restart griffystore --update-env
curl --fail http://127.0.0.1:3789/api/health
```

Abra https://ponto.griffystore.com.br e acesse Equipe.
Esta alteracao e do ponto web; nao exige reinstalar o PDV desktop.

## Aplicativo no celular

O ponto tem navegacao inferior para Ponto, Historico, Equipe (administrador e
gerente) e Conta. Os campos usam fonte de 16px e o layout respeita as areas
seguras de tela no iPhone. A captura de selfie mantem o formato 4:5.

O manifesto e o service worker permitem instalar o ponto como aplicativo web:

- Android: abra o endereco no Chrome e use Instalar aplicativo ou Adicionar a
  tela inicial. Quando o navegador disponibilizar a instalacao, o botao tambem
  aparece na aba Conta.
- iPhone: abra no Safari, toque em Compartilhar e Adicionar a Tela de Inicio.
  Mantenha Abrir como App da Web ativado quando essa opcao aparecer.

Referencia: [Apple](https://support.apple.com/guide/iphone/iphea86e5236/ios)
e [Chrome](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid).

Somente arquivos visuais publicos ficam no cache offline. Fotos e respostas
da API nao sao armazenadas pelo service worker. Sem conexao, o aplicativo
mostra um aviso e impede registrar ponto; nao ha fila de batidas offline.

Validacao: navegacao e capturas de tela em Chromium (320, 360, 390 e 430px),
WebKit com perfil de iPhone 13, edicao do PIN, comportamento offline e
dialogo de camera simulado. Camera real e instalacao no aparelho precisam
ser verificadas na loja apos publicar em HTTPS.
