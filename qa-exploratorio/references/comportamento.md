# Comportamento, concorrência e permissões

Esta é a parte que mais acha bug sério nesse sistema, porque dinheiro e mensagem dependem de idempotência (PRD §19: o mesmo evento nunca gera dois pedidos, dois boletos ou duas cobranças). Para cada ação que cria ou muda algo, pergunte: o que acontece se ela acontecer duas vezes, fora de ordem, ou por quem não devia?

Depois de cada teste aqui, confira o **estado no servidor**, não só a tela: recarregue, abra a lista, e leia a resposta da API (`GET /v1/quotations`, `GET /v1/quotations/<id>`). Uma tela que mostra uma cotação enquanto o servidor tem duas é exatamente o bug.

## 1. Duplo clique e cliques rápidos

Botões alvo: criar cotação, buscar, acionar desmontes (`/dispatch`), enviar resposta do desmonte, aprovar compra (`/purchase`), cancelar pedido, aceitar/despachar no `/p/`, confirmar entrega, avaliar, encerrar janela, convites, homologar, importar CSV.

1. Duplo clique humano (`computer` `double_click` no botão).
2. Rajada: snippet `burstClick` (5 cliques no mesmo tick — simula o botão que não desabilita a tempo).
3. Corrida no servidor: snippet `raceFetch` dispara a mesma requisição N vezes em paralelo com a sessão do navegador. Pegue o corpo exato no `read_network_requests` de uma execução normal.

Os três medem coisas diferentes, e o relatório precisa dizer qual reproduziu: **(1)** é o que uma pessoa faz — se duplica, é bug de tela e de servidor; **(2)** nenhum humano faz (mesmo tick), serve para ver se o botão se protege — se só ele duplica, a parte de tela é suspeita ou médio, não alto; **(3)** é o que acontece com rede lenta, reenvio do navegador ou dois usuários — se duplica, é bug do servidor (idempotência) mesmo que o clique humano não duplique, porque no D1 e com latência real a janela é maior.

Esperado: um único efeito (uma cotação, um envio por desmonte, uma compra, um boleto por fornecedor); as repetições respondem `idempotent: true` ou 409, nunca 500. O botão deve desabilitar ou mostrar "enviando". Conte o efeito no servidor e nos `preview_logs` (`[whatsapp local]` repetido = mensagem duplicada ao desmonte = bug alto).

## 2. Navegação no meio do fluxo

- enviar e apertar Voltar antes da resposta; Voltar depois de criar (volta ao formulário preenchido? reenviar cria outra?)
- atualizar (F5) com formulário meio preenchido (perde tudo sem aviso? para o usuário de cotação longa colada do WhatsApp, isso dói)
- atualizar logo depois de clicar em aprovar compra
- Avançar depois de Voltar
- abrir um `#/cotacoes/<id>` direto pela URL, sem passar pela lista; id inexistente; id malformado (`#/cotacoes/'"><x>`)
- link do desmonte: abrir, responder, Voltar, responder de novo

## 3. Múltiplas abas e usuários ao mesmo tempo

Abas do navegador do app compartilham o cookie: um segundo login numa aba troca a sessão de todas. Para dois perfis ao mesmo tempo, use o navegador para um e, para o outro, a API pela linha de comando com um arquivo de cookie por perfil (`curl -c ana.txt -b ana.txt -H 'Content-Type: application/json' -d '{"whatsapp":"31900000001"}' http://127.0.0.1:5175/auth/code`, depois `/auth/verify` com o código do log). Diga no relatório qual lado foi pela tela e qual pela API.

- mesma cotação aberta em duas abas: aprovar compra numa e cancelar/alterar na outra
- desmonte altera a resposta (aba do `/r/`) enquanto a associação está na tela de soluções (aba da área): a solução escolhida usa o preço velho ou o novo? (RN-026: alterável até a escolha)
- desmonte despacha no `/p/` enquanto a associação cancela (RN-022)
- trocar de perfil (`/auth/switch`) numa aba com a outra aba aberta em tela que o perfil novo não pode ver: a aba antiga continua agindo com o perfil antigo?
- dois aprovadores (Bruno em duas abas) aprovando a mesma compra

## 4. Sessão

- logout numa aba e agir na outra (deve recusar com 401 e levar ao login, sem perder o que estava digitado sem aviso)
- encerrar a sessão por trás no meio de um formulário (snippet `logoutBehind`: o cookie é `HttpOnly`, então o JS não o apaga, mas o `POST /auth/logout` derruba a sessão) e então enviar
- código de login: expirado (o local usa o relógio real; anote como não coberto se não der para esperar 5 min), errado 5 vezes (bloqueia?), reutilizar o mesmo código depois de entrar, código de outro número
- link do desmonte expirado ou com um caractere trocado no token; token com 19 caracteres (a rota exige ≥ 20); o mesmo link aberto depois da escolha da solução
- área do desmonte: sessão de 30 dias; número com dois cadastros (escolha de qual ver)

## 5. Rede lenta, offline, timeout

O navegador do app não tem controle de throttling. Use o snippet `slowFetch` (envolve `window.fetch` com atraso e/ou falha) e depois recarregue para desfazer.

- atraso de 5 s em toda requisição: há indicador de carregamento? o botão bloqueia? dá para clicar de novo?
- falha de rede (`TypeError: Failed to fetch`) no envio: a mensagem é compreensível? o que foi digitado fica?
- 500 simulado numa resposta: a tela mostra erro ou fica em branco/carregando para sempre?
- falha no meio de uma sequência (busca OK, acionamento falha): o estado fica coerente depois de recarregar?

## 6. Permissões e controle de acesso (IDOR)

A regra (PRD §19): todo acesso filtrado pela organização do usuário e pela hierarquia. Teste com dois perfis e troque ids.

- Ana (orçamentista) chamando `POST /v1/quotations/<id>/purchase` direto: deve recusar (só aprovador)
- Bruno aprovando compra acima de R$ 5.000: deve ir para `AWAITING_APPROVAL`, não comprar
- usuário da associação acessando `/v1/coop/*` e rotas do painel (`/admin-api/*` no host das áreas)
- gestora da cooperativa abrindo cotação de associação que não é dela
- trocar `:id` em `/v1/orgs/:id/users`, `/v1/orgs/:id/prefs`, `/v1/orders/:id/*`, `/v1/images/:id` por id de outra organização (crie uma segunda cotação/pedido para ter ids; para outra organização, use os ids do seed: `assoc_b`, `coop_demo`)
- link `/r/<token>` de uma cotação tentando ler/alterar outra: `GET /api/r/<token>` devolve só o pedido daquele token? `DELETE /api/r/<token>/images/<id-de-outro>`?
- área do desmonte: `POST /api/d/quotations/<id>/open` com id de cotação em que ele não foi acionado
- painel: rotas `/admin-api/*` sem a sessão do painel, e com a sessão de um usuário das áreas
- respostas sem login: o que `/api/r/*` e `/api/p/*` devolvem tem algo além do necessário (CNPJ, telefone, e-mail, endereço completo antes do pedido, nome de outro desmonte, campos internos)? Isso é a regra 2 do CLAUDE.md: vazamento é crítico.

Registre cada tentativa de acesso, mesmo as que foram corretamente bloqueadas: "o que funcionou bem" também é evidência de cobertura.
