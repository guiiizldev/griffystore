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
