# Vendas por dia e fechamento

Relatorios abre no dia atual. A data pode ser alterada para consultar outro dia;
Mensal fica em uma visualizacao separada. Vendas, itens, pagamentos, cancelamentos,
descontos, trocos, sangrias, reforcos e caixas fechados usam o periodo selecionado.
Os cancelamentos permanecem visiveis, mas nao entram no total de vendas ativas.

`GET /api/reports/period?type=day&period=2026-10-28` consulta um dia operacional.
Para um mes: `type=month&period=2026-10`. A consulta valida a data e usa parametros,
sem os limites de 20 caixas e 1200 vendas do snapshot da tela inicial.
O periodo usa `sale_date` e `business_date`, sem reclassificar vendas pelo timestamp
UTC nem alterar o historico do banco.

Antes de abrir o fechamento, o aplicativo atualiza os dados e carrega todas as
vendas do dia do caixa. Os detalhes incluem apenas o turno aberto. Vendas legadas
sem turno sao consideradas somente quando possuem a mesma data operacional;
vendas de outros turnos nunca sao incluidas. Caixa fechado nao soma todo o historico.

Os calculos financeiros existentes, valores informados em fechamentos e registros
anteriores nao sao modificados por esta alteracao. Nenhum caixa e fechado
automaticamente na virada do dia ou as 21h.

Testes: `npm run test:sales-reports` e `npm run test:sale-duplicates`.
