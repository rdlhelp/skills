# Técnicas campo a campo

Para cada campo do mapa, escolha as classes que fazem sentido (um CEP não precisa de RTL; uma observação livre precisa). Registre no relatório quais classes aplicou em cada campo — isso é a cobertura.

Para cada entrada, observe três lugares: **a tela** (aceitou? mostrou erro claro? perdeu o que estava digitado?), **a rede** (o que foi enviado e o que o servidor respondeu: 400 com mensagem é bom; 500 é bug; 200 aceitando lixo é bug) e **onde o valor reaparece** (lista, detalhe, link do desmonte, mensagem no log `[whatsapp local]`, painel). Bug de escape quase sempre aparece em outra tela, não na que recebeu o valor.

## 1. Valor-limite e partição de equivalência

Ache o limite no código (`min`, `max`, `maxLength`, `slice`, validação no servidor) e teste: mínimo, mínimo−1, máximo, máximo+1, zero, negativo, decimal onde se espera inteiro, número enorme (`99999999999999999999`), notação científica (`1e5`), `NaN`, `Infinity`.

Partições típicas aqui:
- quantidade: 1 (válida mínima), 99 (máxima), 0, −1, 100, 1,5, vazio
- ano: 1949, 1950, ano atual + 1, ano atual + 2, 0, `20 13`, 5 dígitos (RN-006 diz: fora do intervalo é **ignorado**, sem quebrar a busca)
- dinheiro: 0,00, 0,01, 0,001, valor negativo, R$ 1.000.000,00, R$ 999.999.999,99, só vírgula, só ponto
- raio do selo: 0, 1, 1000, 1001; degustação: 0, 1, 60, 61

**Limite da tela × limite do servidor:** quando a tela corta (ex.: ano em 4 dígitos, UF em 2), mande o valor fora do limite direto pela API (snippet `fetchJson` em `scripts/snippets.js`, com a sessão do próprio navegador). O servidor precisa validar sozinho; a tela é só conveniência.

## 2. Vazio e espaços

- vazio em cada obrigatório, um de cada vez (a mensagem diz qual?)
- só espaços (`"   "`), só tab, só quebra de linha
- espaços nas pontas (`"  PORTA  "`): foi aparado? a busca e a idempotência tratam `"REF1"` e `" REF1 "` como iguais?
- espaço sem quebra (U+00A0) e espaço de largura zero (U+200B) — parecem vazio mas não são

## 3. Tamanho

- 1.000 caracteres: deve ser aceito com limite claro ou recusado com mensagem; a tela não pode quebrar o layout (overflow horizontal em 375 px)
- 100.000 caracteres: use o snippet `fillInput` (digitar trava o navegador). Esperado: recusa com mensagem, ou aceite sem travar a tela e sem 500. Observe o tempo de resposta e se a lista/detalhe ficaram lentos
- uma "palavra" de 300 caracteres sem espaço (quebra layout que texto normal não quebra)

## 4. Unicode e caracteres especiais

- acentos e cedilha: `PARA-CHOQUE DIANTEIRO ÇÃÉÍ` (a busca trata com e sem acento, PRD 7.3)
- emoji simples e composto: `🚗`, `👨‍👩‍👧`, bandeira `🇧🇷`, tom de pele `👍🏽` — contam como quantos caracteres no limite?
- RTL: `مرحبا`, e o caractere de sobrescrita `‮` (U+202E) no meio de um nome — inverte a exibição?
- combinações: `é` (e + U+0301) vs `é` pré-composto — idempotência e busca tratam igual?
- caracteres de controle: `\u0000`, `\u0007`, `\u001b`; quebra de linha em campo de uma linha (colar)
- zalgo: `P̸̢̛O̴̡R̷T̶A̵` — quebra a altura da linha?
- aspas tipográficas e apóstrofo: `D'Ávila`, `“ ”`, `‘ ’`

## 5. Entradas hostis (sanitização e escape)

O objetivo é ver se o valor é **escapado** onde reaparece, não invadir nada. Use só contra o ambiente de teste, e só payloads que se denunciam sozinhos (um `alert` ou um `console.log` com marca), nunca algo que exfiltre dado ou chame domínio externo.

XSS (veja se aparece como texto ou se executa; confira console e DOM):
```
<script>console.log('QA-XSS-1')</script>
"><img src=x onerror="console.log('QA-XSS-2')">
<svg/onload=console.log('QA-XSS-3')>
javascript:console.log('QA-XSS-4')
<a href="javascript:console.log('QA-XSS-5')">clique</a>
{{7*7}} ${7*7} <%= 7*7 %>
```
Se `QA-XSS-n` aparecer no console, ou `49` aparecer no lugar do template, é bug alto (crítico se for numa tela que o desmonte ou outra organização vê). Atenção especial a campos que viram **link** (`href`) ou vão para a mensagem do WhatsApp.

SQL/injeção (o D1 usa consultas parametrizadas; o que se procura é 500, mensagem de erro do banco vazando ou comportamento diferente):
```
' OR '1'='1
'; DROP TABLE quotations; --
" OR ""="
1; SELECT 1
%' --
\'; --
```
No local, a memória não tem SQL; esses payloads só fazem sentido no shim do D1 (testes) e na hml. No local, anote que a classe não foi coberta pela tela e sugira um teste de API no D1 shim.

Outros:
- HTML inofensivo: `<b>negrito</b>`, `<h1>grande</h1>`, `&lt;b&gt;` (dupla codificação)
- CSV/fórmula (importação de CSV do painel e qualquer exportação): `=1+1`, `+SUM(1,1)`, `-1+1`, `@SUM(1,1)`, `=HYPERLINK("http://exemplo.invalid","x")`
- caminho/nome: `../../etc/passwd`, `CON`, `nul`, nome de arquivo `<img>.png`
- JSON no texto: `{"a":1}`, `"]`, `"`
- números de "preenchimento" no PN: `0000002`, `1234`, `12` (RN-005: PN inválido não vira certeza)

Lista ampla de referência (consulta, não copiar inteira): Big List of Naughty Strings (`blns.txt` do repositório minimaxir/big-list-of-naughty-strings). Escolha 5–10 por campo, das categorias que fazem sentido.

## 6. Formatos brasileiros

- **Moeda:** `1.234,56`, `1,234.56`, `1234.56`, `1234,5`, `R$ 10`, `10,`, `,50`, `1.234` (mil ou um vírgula dois três quatro?), colar `R$ 1.234,56` com o símbolo. O valor salvo em centavos bate com o digitado?
- **Decimal:** vírgula e ponto em percentual (desconto `10,5` e `10.5`), frete por km.
- **CPF/CNPJ:** bem formatado mas com dígito verificador errado (`11.222.333/0001-80`), todos iguais (`00.000.000/0000-00`, `11111111111111`), com e sem máscara, com letras (CNPJ alfanumérico, previsto para 2026: `12.ABC.345/01DE-35`), 13 e 15 dígitos. CNPJ válido de teste: `11.222.333/0001-81`.
- **Telefone/WhatsApp:** com e sem DDI 55, com e sem nono dígito, `(31) 9 9999-9999`, `+55 31 99999-9999`, 8 dígitos, DDD inexistente (`20`), só zeros. Use sempre números fictícios `319000xxxxx`.
- **CEP:** `31730-680`, `31730680`, `3173068`, `00000-000`, letras, CEP válido de outro estado com UF diferente digitada.
- **UF:** minúscula, `XX`, nome por extenso.
- **Datas:** `29/02/2025` (não bissexto), `29/02/2028`, `31/04`, `00/00/0000`, ano `0001` e `9999`, formato americano `02/29/2028`, ISO `2028-02-29`. Prazos e vencimentos (RN-014, dias úteis): virada de mês, sexta → segunda, feriado nacional.
- **Fuso:** o produto usa Brasília (`America/Sao_Paulo`). Mude o fuso do navegador não é possível no navegador do app; em vez disso, compare horários exibidos com o `created_at` da resposta da API (UTC) e confira a conversão, especialmente perto da meia-noite UTC (21h em Brasília).

## 7. Colar, autocompletar, obrigatórios

- colar texto com formatação (de uma planilha: tabs; de um PDF: quebras no meio)
- colar no campo de código de login um código com espaços (`123 456`) e com 7 dígitos
- autocompletar do navegador em telefone e endereço (`autocomplete` correto?)
- obrigatório marcado na tela mas não no servidor (e o contrário): remova o atributo `required` via snippet e envie
- campo opcional enviado como `null`, `""` e ausente pela API: o servidor trata os três igual?

## 8. Upload de arquivos (fotos do desmonte, NF, comprovante, CSV)

- tipo errado com extensão certa (texto renomeado para `.jpg`) e o contrário
- arquivo vazio (0 bytes)
- arquivo grande (gere no navegador com o snippet `makeFile`: 10 MB, 30 MB)
- imagem enorme em pixels mas pequena em bytes (PNG 20000×20000) — trava a prévia?
- nome com acento, espaço, emoji, `../`, 255 caracteres, sem extensão, extensão dupla `foto.jpg.html`
- SVG com `<script>` (se SVG for aceito, abrir a imagem executa?)
- vários arquivos de uma vez acima do limite de fotos (até 3 do anúncio por peça + atuais)
- cancelar o upload no meio; enviar e voltar a página durante o envio
- CSV do painel: separador `;` e `,`, BOM UTF-8, Latin-1, linha em branco no fim, coluna faltando, 10.000 linhas, injeção de fórmula
