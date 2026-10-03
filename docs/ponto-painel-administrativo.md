# Painel de ponto

Em Equipe, selecione o mes e o funcionario. O painel mostra dias registrados,
atrasos, faltas sem entrada, faltas por atraso e horas apuradas. Abra um dia para conferir entrada,
saida e marcacoes. As evidencias carregam a foto apenas ao abrir a marcacao.
O CSV exporta o funcionario e o mes selecionados.

## Regras de pontualidade

- Verde: entrada ate o horario individual configurado.
- Laranja: atraso dentro da tolerancia (por padrao, 10 minutos).
- Vermelho: atraso acima da tolerancia ou ausencia sem entrada.
- Aguardando entrada: o horario mais a tolerancia ainda nao passou.
- Folgas nao geram falta automaticamente.

Em Equipe, administrador ou gerente configura entrada, saida, dias de trabalho
e inicio de validade de cada funcionario. Configure todos antes de bater ponto.
Mudancas futuras preservam os horarios dos dias anteriores. Um periodo que
ja tenha marcacoes nao pode ter seu horario substituido. O limite de atraso
continua em Configuracoes de jornada e local. A classificacao preserva os registros.
Horas apuradas descontam intervalos completos. Dias sem entrada, saida ou com
intervalo aberto ficam pendentes. A apuracao usa o fuso America/Sao_Paulo.

## Trocas de horario

Na aba Trocas, o funcionario escolhe uma data, colega e motivo. O colega recebe
o pedido e pode aceitar ou recusar. O solicitante pode cancelar enquanto pendente.
Somente o aceite do colega troca os horarios dos dois naquela data; no dia
seguinte cada um volta automaticamente ao habitual.

Pedidos pendentes, recusados, cancelados ou vencidos nao mudam o horario.
Se nao houver aceite e a pessoa nao comparecer no proprio horario, a ausencia
e registrada normalmente. A troca nao pode ser aceita depois que qualquer
um dos dois ja tenha batido ponto naquele dia. Folgas e horarios conflitantes
impedem a troca; se o horario habitual mudar antes do aceite, envie novo pedido.

## Localizacao da loja

O ponto exige coordenadas da entrada da loja e raio de 1 a 15 metros.
Em Equipe, abra Configuracoes de jornada e local. Estando na entrada da
Rua Maragogi, 27, Penha, Rio de Janeiro, toque em Localizar entrada da loja
e Salvar configuracoes. Nao use uma coordenada aproximada de busca por endereco.
Sem coordenadas, fora do raio ou com precisao GPS maior que o raio, a batida
e bloqueada. Ative a localizacao precisa no celular. O GPS e aproximado:
nao delimita exatamente a calcada nem comprova sozinho a presenca fisica.
Contas excluidas ou inativas perdem acesso ao ponto mesmo com sessao anterior.

## Atualizacao na VPS

```bash
cd /var/www/griffystore
git pull --ff-only origin main
npm run db:schema
npm run check
npm run test:timeclock
pm2 restart griffystore --update-env
curl --fail http://127.0.0.1:3789/api/health
```

Abra https://ponto.griffystore.com.br e acesse Equipe.
Esta alteracao e do ponto web; nao exige reinstalar o PDV desktop.

## Aplicativo no celular

O ponto tem navegacao inferior para Ponto, Historico, Trocas, Equipe (administrador e
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
