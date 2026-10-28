# Localizacao nas batidas

As batidas nao sao bloqueadas por distancia da loja nem pela precisao do GPS.
Latitude, longitude, precisao disponivel e selfie continuam salvas por batida.
A permissao de localizacao e coordenadas validas continuam necessarias;
nao e criada uma localizacao ficticia quando o celular nao fornece GPS.

Em Equipe, selecione o funcionario e abra Marcacoes e evidencias para consultar
as coordenadas, precisao e o link Ver localizacao da batida no Google Maps.
O mapa so e aberto por esse link; nao e preciso geocodificar nem transmitir
automaticamente as coordenadas a um servico externo ao salvar a batida.

O local de referencia da loja e opcional. Se configurado, permite mostrar a
distancia apenas como informacao; nao aprova nem rejeita a marcacao.
As antigas configuracoes de raio nao sao mais usadas para bloquear batidas.
Registros e evidencias historicos nao sao alterados.

Testes: `npm run test:timeclock`. O teste opcional de banco isolado usa
`TIMECLOCK_INTEGRATION=1 node scripts/test-timeclock-attempts.js`.
