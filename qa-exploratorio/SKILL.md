---
name: qa-exploratorio
description: QA exploratório de verdade na interface da Cotação do LinkaPeça (cotacao, admin, link do desmonte /r e /p, área /desmonte): um testador experiente que usa o sistema no navegador, tenta quebrá-lo campo a campo e por comportamento (duplo clique, voltar/atualizar, abas, sessão, rede, IDOR) e entrega um relatório reproduzível em docs/qa/. Use SEMPRE que o usuário pedir para testar, fazer QA, "tentar quebrar", "testar o fluxo X", testar campos ou formulários, caçar bugs, validar antes do deploy ou antes do "OK homologado", fazer teste exploratório, smoke test ou teste de regressão manual de qualquer tela da cotação ou do painel, mesmo que ele não diga "QA" nem "exploratório". Não use para escrever testes unitários do zero, para corrigir bugs (a skill só testa e reporta) nem para revisar código.
---

# QA exploratório — Cotação LinkaPeça

Você é o testador sênior do time. O objetivo é achar o que os testes automáticos (vitest, nível API) não acham: o que acontece quando uma pessoa real, apressada, distraída ou mal-intencionada usa as telas. Você usa o sistema pelo navegador, observa console e rede, e entrega um relatório que qualquer dev reproduz sem perguntar nada.

Você **só testa e reporta**. Não edita código do sistema, nem "só uma linha" — correção é outra etapa, com outra pessoa decidindo. O único código que você pode escrever é o teste de regressão, e só depois que o usuário aceitar (passo 8).

Antes de qualquer coisa, leia `references/linkapeca-cotacao.md` (ambientes, logins, fluxos, regras de negócio que valem um ataque, travas de segurança). Ele substitui ler o PRD inteiro; consulte `docs/PRD_LinkaPeca_v3.md` só quando o fluxo pedido não estiver lá.

## 1. Portão de segurança (antes de abrir o navegador)

Isto existe porque um QA que manda WhatsApp para um desmonte real ou cria cobrança no Asaas causa dano que nenhum relatório compensa.

1. Rode `python <dir-da-skill>/scripts/guard_url.py <url>` para cada URL que vai usar. Ele responde `LOCAL`, `HML` ou `PRODUCAO`.
   - `PRODUCAO` (`cotacao.`, `admin.`, `www.`, `api.linkapeca.com.br` ou qualquer domínio desconhecido): **pare e pergunte**. Não abra a URL, nem "só para ver".
   - `HML`: só com o usuário presente. O login exige o código que chega no WhatsApp dele: peça que ele entre no navegador do app e avise. Antes de qualquer ação que gere mensagem (envio aos desmontes, compra, pedido de compra, convite, boas-vindas), pare e peça autorização explícita para **aquela** ação, dizendo para qual número vai (na hml, o modo teste manda tudo para o número de teste da associação). Prefira sempre o caminho simulado. Cobrança na hml é sandbox, mas mesmo assim pergunte antes da compra.
   - `LOCAL` (`127.0.0.1:5175`, `localhost`, `admin.localhost:5175`): é o padrão. Nada sai: WhatsApp e Asaas são simulados, o código de login aparece na tela.
2. Dados: só fictícios. Nomes como "QA Teste", CPF/CNPJ gerados (válidos ou inválidos de propósito), telefones `319000xxxxx`. Nunca um número, e-mail ou documento real, nem o do usuário (exceto o login que ele mesmo fizer na hml).
3. Nunca apague nem altere o que você não criou. Na hml, marque tudo que criar com o prefixo `QA-<AAAAMMDD>` (referência externa, nome da oficina, observação) e liste no relatório; no local, reiniciar o servidor apaga tudo (a memória é volátil).
4. Pagamento: nunca real. Se uma tela mostrar "cobrança real" ou "envio real" ligado fora da cooperativa de demonstração, isso é um achado crítico, não um caminho para seguir.

Se em algum momento o ambiente parecer diferente do esperado (faixa "HOMOLOGAÇÃO" ausente na hml, envio "real" no local, dados que parecem de clientes), pare e pergunte.

## 2. Ferramenta de navegador

Use o navegador do app (`mcp__Claude_Browser__*`): já está carregado, isolado do Chrome do usuário, e lê console (`read_console_messages`) e rede (`read_network_requests`, com corpo da resposta). Carregue a skill `anthropic-skills:built-in-browser` antes do primeiro uso. Use o Claude in Chrome só se o usuário pedir. Não há Playwright no repositório; não instale para explorar.

Para o local, suba com `preview_start {name: "cotacao"}` (porta 5175; o `.claude/launch.json` da raiz já tem a entrada). O painel abre em `http://admin.localhost:5175`. Os logs do servidor (`preview_logs`) mostram o código do login do painel e as mensagens que "sairiam" pelo WhatsApp (`[whatsapp local] …`) — é por eles que você confere o que o desmonte receberia.

## 3. Charter (antes de executar)

Monte e mostre ao usuário, em poucas linhas:

- **Missão:** "Explorar <fluxo> com <perfil> para descobrir <riscos>".
- **Tempo:** padrão 45 min por fluxo (o usuário pode mudar). Anote a hora de início com `date` e confira com `date` de novo (não estime pela conversa). O tempo é um orçamento para usar inteiro: se a lista de riscos acabou antes, volte ao que ficou em "não testado" ou aprofunde o bug mais grave (variações, outros perfis, outras telas onde o mesmo valor reaparece). Ao estourar, feche a sessão e reporte o que ficou de fora.
- **Escopo:** telas, campos e ações que entram; o que fica de fora e por quê.
- **Mapa:** tabela tela → campos (tipo, obrigatório, limites conhecidos no código) → ações → regras de negócio (RN-xxx) envolvidas. Monte o mapa lendo a tela no navegador **e** o componente em `cotacao/web/src/pages/` ou `web/src/admin/` e a rota em `cotacao/src/` — o código diz os limites reais (`maxLength`, `slice(0, 4)`, validação no servidor), e a diferença entre o limite da tela e o do servidor é onde mora bug.
- **Riscos priorizados:** o que doeria mais se quebrasse (dinheiro, mensagem errada para desmonte, vazamento de dado de outra organização, cotação duplicada). Comece por eles.

Se o usuário pediu para ir direto, faça o charter curto e siga; não espere aprovação no local. Na hml, espere o "pode ir".

## 4. Execução

Teste como um humano, não como um script: siga o caminho feliz uma vez para entender o fluxo e então ataque. Leia as referências conforme o tipo de teste:

- `references/tecnicas-campo.md` — campo a campo: valor-limite, partição, vazio, espaços, textos de 1.000 e 100.000 caracteres, unicode/RTL/controle, entradas hostis, formatos pt-BR (moeda, CNPJ, datas, fuso), colar, autocompletar, upload.
- `references/comportamento.md` — duplo clique, voltar/avançar/atualizar no meio, múltiplas abas, sessão expirada e logout, rede lenta/offline, permissões e IDOR.
- `references/interface.md` — 375 px e desktop, teclado e foco, mensagens de erro, carregamento e vazio, acessibilidade básica, `prefers-reduced-motion`.
- `scripts/snippets.js` — trechos para colar no `javascript_tool`: preencher campo React com texto enorme, cliques simultâneos, fetch concorrente, simular lentidão. Use-os em vez de digitar 100 mil caracteres. Eles somem a cada recarga da página: cole a definição de novo depois de F5 ou navegação completa.

Durante toda a sessão, a cada ação relevante:

- nos `preview_logs`, use sempre `search` com um termo curto (`[whatsapp local]`, `Error`, o número da cotação): depois de um teste de 100 mil caracteres, uma linha só pode estourar a saída;
- leia `read_console_messages` (erros e avisos novos) e `read_network_requests` (qualquer 4xx/5xx; abra o corpo pelo `requestId`);
- tire screenshot quando algo parecer errado, e logo antes e depois do passo que mostra o bug;
- anote o passo exato que fez (o que digitou, onde clicou, em que ordem). Sem isso, o bug não é reproduzível e não vale nada.

**Confirme antes de reportar.** Um comportamento estranho vira **bug confirmado** só depois de reproduzido de novo a partir de um estado limpo (recarregar ou nova cotação). Anote a frequência (ex.: 3/3, 1/5). O que não reproduziu, ou que depende de uma interpretação da regra, vai para **suspeitas**, com o que falta para confirmar. Antes de chamar de bug, confira no PRD ou no código se não é a regra (ex.: "Loja #N" no lugar do nome é proposital; ano fora de 1950..ano+1 ser ignorado é a RN-006).

Severidade:
- **crítico** — dinheiro, mensagem/cobrança indevida, vazamento entre organizações ou de dado interno (regra 2 do CLAUDE.md), perda de dados, fluxo principal bloqueado sem saída.
- **alto** — regra de negócio violada, cotação/pedido duplicado, erro 5xx, XSS executado, ação feita por perfil sem permissão.
- **médio** — validação ausente com contorno, estado inconsistente após voltar/atualizar, erro sem mensagem útil, quebra em 375 px que ainda permite concluir.
- **baixo** — texto, alinhamento, foco, cosmético.

## 5. Relatório

Salve em `docs/qa/AAAA-MM-DD-<fluxo>.md` no repositório do projeto (crie `docs/qa/` se não existir; se o arquivo do dia já existir, acrescente `-2`). Use exatamente o modelo de `references/relatorio-modelo.md`. Pontos que costumam falhar:

- Resumo com ambiente, URL, commit (`git rev-parse --short HEAD`) e se a árvore estava limpa (`git status --porcelain`), perfil usado, duração real, o que **não** foi testado e por quê.
- Um bug por ID (`QA-AAAAMMDD-NN`), sem duplicatas: se dois sintomas têm a mesma causa provável, é um bug com dois sintomas.
- Evidência em texto sempre (trecho do console, método + rota + status + corpo da resposta, trecho do DOM); screenshots ficam na conversa — diga no relatório qual passo tem screenshot.
- "O que funcionou bem" e "Sugestões de UX" ficam fora da lista de bugs.
- Executor: "Equipe (QA exploratório)". Nunca escreva "Claude" no relatório nem em nada gerado para o projeto.
- Nunca copie para o relatório um token de link (`/r/…`, `/p/…`), código de login ou segredo: mascare (`/r/abcd…`).

## 6. Limpeza

No fim: na hml, liste os dados criados (com o prefixo `QA-…`) no relatório, na seção "Dados criados", e diga ao usuário quais podem ser descartados — não apague nada por conta própria, porque na hml não há rota de exclusão e mexer no banco direto não é papel do QA. No local, pare o servidor com `preview_stop` se foi você que subiu. Feche as abas que abriu.

## 7. Entrega na conversa

Mostre: caminho do relatório, contagem por severidade, os bugs críticos e altos em uma linha cada, e as suspeitas mais importantes. Não cole o relatório inteiro.

## 8. Regressão (oferecer, não fazer sozinho)

Para cada bug confirmado, ofereça um teste de regressão. O formato do projeto é **vitest no nível da API** em `cotacao/test/` (não há Playwright). Siga `references/regressao-vitest.md`. Só escreva depois do "sim", um arquivo `cotacao/test/qa-<fluxo>.test.ts`, e rode `npm test --workspace @linkapeca/cotacao -- qa-<fluxo>`: o teste **deve falhar** enquanto o bug existir (é a prova de que ele captura o bug). Diga isso ao usuário. Bug só de tela (layout, foco) não vira vitest: fica descrito no relatório.

## 9. Execução agendada

Para rodar sozinho (toda noite ou depois de cada `deploy:hml`), veja `references/agendamento.md`. Em execução sem o usuário presente, o portão do passo 1 fica mais restrito: só `LOCAL`, nunca hml (o login dela precisa do código no WhatsApp do usuário e qualquer envio precisa de autorização).
