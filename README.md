# Griffy Store - Sistema de Gestao

Sistema desktop para gerenciamento de loja de celulares, acessorios, assistencia tecnica, caixa e operadores.

## Rodar como programa

1. Instale o MySQL 8 ou MariaDB.
2. Crie o banco e usuario executando `database/setup.sql` como administrador do MySQL.
3. Copie `.env.example` para `.env` e ajuste a senha do banco.
4. Rode `npm install`.
5. Rode `npm run db:schema` para criar tabelas e dados iniciais.
6. Rode `npm start` para abrir o programa.

## Gerar instalador .exe

Depois de testar o sistema:

```bash
npm run build:win
```

O instalador sera gerado na pasta `dist`.

## Modo demonstracao

Se abrir `index.html` direto no navegador, o sistema funciona em modo demonstracao usando `localStorage`. Para uso real da loja, utilize `npm start` com MySQL configurado.

## Acessos iniciais

- Administrador: PIN `1234`
- Caixa: PIN `2222`
- Vendedor: PIN `3333`
- Tecnico: PIN `4444`

## Modulos

- Painel de controle com vendas, caixa, ordens abertas e alertas de estoque
- Caixa com carrinho, desconto, cliente, forma de pagamento e baixa automatica
- Estoque com produtos, categorias, custos, precos, margem e movimentacao
- Assistencia tecnica com ordens de servico por status
- Clientes para historico de vendas e servicos
- Operadores com perfis de administrador, caixa, vendedor e tecnico
- Relatorios com vendas, saldo e movimentos de caixa

## Categorias iniciais

O sistema ja cria as categorias comerciais da Griffy Store no MySQL e usa essa lista no cadastro de produtos.

ADAPTADOR DE ENERGIA, BOLSA A PROVA D'ÁGUA, CABOS DE CARREGADOR, CAPAS, CARREGADOR COMPLETO, CARREGADOR VEICULAR, CHIP, COPO TÉRMICO, FONES, HOVERBOARD, IPHONES, JBL, LUZ PARA VÍDEO, MAQUININHA DE APARAR PÉ, PELÍCULA DE CÂMERA, PELÍCULAS, PENDRIVE, PERFUMES ÁRABES, POWER BANK, RASTREADOR DE DISPOSITIVO, SMART WATCH, SUPORTE DE CELULAR, TECLADO DE COMPUTADOR, UMIDIFICADOR, VIDEO GAMES.

## Nota fiscal

O sistema ja tem ponto de integracao fiscal por venda. Para emitir NF-e ou NFC-e de verdade ainda e necessario configurar:

- certificado digital A1 da empresa
- CNPJ, inscricao estadual, regime tributario e dados do contador
- CSC/ID Token para NFC-e, quando aplicavel no estado
- CFOP, NCM, CSOSN/CST, aliquotas e regras fiscais dos produtos
- ambiente de homologacao da SEFAZ antes da producao

Essa parte deve ser validada com o contador antes de emitir notas reais.
