# Perfil do projeto — Cotação LinkaPeça

Repositório: `D:\Projetos\linkapeca` (monorepo). O que se testa aqui é o Worker `cotacao` (telas em `cotacao/web/src`, API Hono em `cotacao/src`). Leia também o `CLAUDE.md` da raiz: as regras invioláveis 2, 3, 4 e 7 viram critérios de bug.

Conferido em 07/10/2026 (commit 2d5fde0). Se algo daqui não bater com o código, confie no código e avise o usuário que o perfil está desatualizado.

## Ambientes

| Ambiente | Endereços | Pode testar? | Login |
|---|---|---|---|
| Local | `http://127.0.0.1:5175` (áreas), `http://admin.localhost:5175` (painel), `/r/<token>`, `/p/<token>`, `/desmonte` | Sim, padrão | o código vai pela camada de WhatsApp local, que só escreve no log: peça o código e leia a última linha `[whatsapp local] LinkaPeça: seu código de acesso é *NNNNNN*` em `preview_logs` (a linha não diz o número; peça um código por vez) |
| Homologação | `https://cotacao-hml.linkapeca.com.br`, `https://admin-hml.linkapeca.com.br` (Cloudflare Access) | Só com o usuário presente, ações com mensagem só com OK por ação | o usuário entra no navegador do app (código chega no WhatsApp dele) |
| Produção | `cotacao.`, `admin.`, `www.`, `api.linkapeca.com.br` | **Nunca** | — |

Subir o local: `preview_start {name: "cotacao"}` (equivale a `npm run dev --workspace @linkapeca/cotacao`). A API roda dentro do Vite com memória (`cotacao/dev/dev-app.ts`): reiniciar o servidor zera tudo, que é a limpeza do local. O gateway de busca é simulado: toda peça devolve três desmontes da Grande BH (Desmonte Planalto 4 km, Auto Peças Contagem 14 km, CDV Betim 32 km — este não homologado, match "incerto").

O limite de login é de 3 códigos por número em 15 min e 10 tentativas por IP por minuto. Se travar no 429, use outro perfil ou reinicie o servidor; não trate o 429 em si como bug.

## Perfis do local (fictícios)

| Quem | WhatsApp | Papel | Organização | Para testar |
|---|---|---|---|---|
| Ana | 31900000001 | orçamentista (`quoter`) | Associação Demonstração | criar cotação, acionar, ver soluções; **não** aprova compra |
| Bruno | 31900000002 | aprovador, limite R$ 5.000 | Associação Demonstração | aprovar compra até o limite; acima → `AWAITING_APPROVAL` |
| Dora | 31900000004 | administradora da associação | Associação Demonstração | usuários, modo de cotação, preferências |
| Carla | 31900000003 | gestora da cooperativa | Mutual Coop (demonstração) | área da cooperativa: associações, homologação, condições, desmontes |
| Admin | 5531900000009 | administrador do painel | — | `admin.localhost:5175` |
| Desmontes | 31900001001, 31900001002, 31900001003 | fornecedor | — | área `/desmonte` (só depois de serem acionados numa cotação) |

Há um pedido de demonstração já com NF: o link do fornecedor sai nos `preview_logs` como `[pedido de demonstração] link do fornecedor: /p/<token>`.

Homologação (seed `cotacao/scripts/seed-hml.mjs`): Associação Homologação (aprovador Rodolfo), Cooperativa Homologação (gestor Marcelo), envio em **modo teste** para o número do Rodolfo, cobrança sandbox, não homologados liberados.

## Mapa de telas

Áreas por `#` (com login), em `cotacao/web/src/App.tsx`:

| Rota | Tela (arquivo) | Perfil |
|---|---|---|
| `#/` ou `#/cotacoes` | lista de cotações (`pages/Quotations.tsx`) | associação |
| `#/cotacoes/nova` | nova cotação: abas formulário, colar WhatsApp, link gestaosegura (`pages/NewQuotation.tsx`) | associação |
| `#/cotacoes/<id>` | detalhe: resultados por peça, acionamento (`DispatchPanel.tsx`), respostas, soluções, compra (`ClosePurchase.tsx`), pedidos, entrega, ocorrência, avaliação, devolução | associação |
| `#/cotacoes/<id>/ciente/<pedido>` | abre o "ciente" do pedido | associação |
| `#/usuarios` | usuários e limites (`Users.tsx`) | administradora / aprovador |
| `#/creditos` | créditos (`Credits.tsx`) | associação |
| `#/` (cooperativa) | área da cooperativa (`Coop.tsx`, `CoopAssociations.tsx`) | gestora |

Sem login (por caminho):

| Rota | Tela | Observação |
|---|---|---|
| `/r/<token>` | resposta do desmonte (`SupplierReply.tsx`): tem/não tem, preço, observação, fotos, frete (motivo se mudar), prazo | token ≥ 20 caracteres `[A-Za-z0-9_-]` |
| `/p/<token>` | pedido de compra do desmonte (`SupplierOrder.tsx`): aceitar, NF, despacho, arquivos | `?entrega=1` abre a captura do comprovante |
| `/desmonte`, `/fornecedor` | área do desmonte (`SupplierArea.tsx`) | login por código |
| `/ensaio/<token>` | roteiro do ensaio | |

Painel (`admin.localhost:5175`, `web/src/admin/`): dashboard, mensagens (caixa de entrada), convites, links privados, cooperativas, fornecedores (funil, tags, importação de CSV, homologação com observação, Selo de Alta-Confiança, conferência do WhatsApp), redes, demonstração, ensaios.

Rotas da API: `grep -rhoE "\.(get|post|put|patch|delete)\('[^']+'" cotacao/src`. As das áreas começam com `/v1`, `/auth`; as sem login com `/api/r`, `/api/p`, `/api/d`; o painel com `/admin-api`.

## Campos que valem atenção (limites vistos no código)

- **Nova cotação (formulário):** marca, modelo (obrigatório), versão, ano (`inputMode=numeric`, a tela corta em 4 dígitos — o servidor aceita o quê via API?), peças (descrição, quantidade `min=1 max=99` com `Math.max(1, …)` na tela, PN opcional), destinatário, endereço, CEP, cidade, UF (a tela corta em 2), referência externa (é a chave da idempotência).
- **Colar WhatsApp:** textarea livre; parser em `cotacao/src/intake`. Placa no texto deve sumir (RN-003); PN no início da linha antes de " - "; modelos com hífen (T-CROSS, HR-V); "OFICINA X" vira destinatário; corrigir a leitura gera aviso ao LinkaPeça com placa mascarada.
- **Login:** WhatsApp (`inputMode=tel`), código de 6 dígitos (tela remove não dígitos, `maxLength=6`), validade 5 min, 5 tentativas.
- **Resposta do desmonte:** preço (`MoneyInput`, centavos), frete (motivo obrigatório se diferente do estimado), prazo em dias, observação, fotos (upload).
- **Pedido do desmonte:** NF obrigatória para despachar (RN-028), arquivos (upload).
- **Cooperativa:** condições (desconto %, prazo, frete por km, mínimo, tolerância, limites por peça/cotação, validades), contato do desmonte, homologação.
- **Painel:** importação de CSV (preview + import), tags, CNPJ, telefone, raio do selo (1 a 1.000 km), prazo da degustação (1 a 60 dias).

## Regras de negócio que mais valem um ataque

| Regra | O que tentar |
|---|---|
| RN-003 placa/chassi/RENAVAM/motor nunca saem | colar texto com placa (`ABC1D23`, `ABC-1234`), chassi de 17 caracteres; conferir no link do desmonte, na mensagem do log `[whatsapp local]` e nas respostas da API |
| Regra 2 do CLAUDE.md: nada interno vaza | nas respostas de `/api/r/*`, `/api/p/*`, `/api/d/*`: nada de `raw`, `supplier_resolution`, Elastic/Hub/Meili/SPL, CNPJ, telefone ou e-mail de outro desmonte |
| Nome do provedor nunca aparece | buscar no DOM e nas respostas por nomes de provedor e de índice |
| RN-009 porta DE nunca mostra DD | peça "PORTA DIANTEIRA ESQ" e ver o que volta como aprovado |
| RN-011 não homologado não entra em solução | CDV Betim (não homologado no local): pode aparecer sinalizado, não pode ser escolhido (salvo "comprar de não homologados" ligado) |
| RN-013 desconto só nas peças | conferir valores do pedido: frete sem desconto |
| RN-015 um pedido e um boleto por fornecedor; idempotência da compra | duplo clique em aprovar compra, duas abas aprovando juntas |
| RN-019 frete mudou → motivo | mudar o frete no link sem motivo; motivo só com espaços |
| RN-020 solução cobre 100% | resposta parcial e tentar comprar como completa |
| RN-022 cancelar só antes do despacho | cancelar depois de o desmonte despachar (outra aba) |
| RN-026 link expira, proposta alterável até a escolha | alterar resposta depois da escolha da solução |
| RN-028 NF obrigatória para despachar | despachar com NF vazia, só espaços, 1.000 caracteres |
| Aprovador com limite | Bruno aprovando acima de R$ 5.000; Ana (orçamentista) chamando a rota de compra direto |
| Idempotência da cotação só por `external_ref` + canal | duplo clique em "criar cotação" **sem** referência: sai duas cotações? |
| Isolamento entre organizações | Carla/Ana abrindo `#/cotacoes/<id>` de outra organização; `/v1/orgs/<outra>/users`; trocar `:id` nas rotas `/v1/orders/:id/*` |
| Demonstração | cooperativa de demonstração: envio e cobrança sempre simulados, "Loja #N" também no pedido |

## Travas de segurança do sistema (o que o QA confere, não o que ele contorna)

- `cotacao/src/send-mode.ts`: `simulated` (WhatsApp desligado: links na tela), `test` (tudo vai para o WhatsApp de teste da associação), `live` (só com `dispatch_live` da associação). Demonstração: sempre simulado.
- Cobrança real só com `ASAAS_ENABLED=true` + chave; no local é sempre simulada.
- Na hml, `MESSAGE_ALLOWLIST` barra qualquer número fora da lista.
- Se você vir `live`/"envio real" no local, ou cobrança real fora do sandbox, é bug crítico: pare e reporte.

## Testes automáticos que já existem

`cotacao/test/*.test.ts` (vitest): fluxo inteiro contra a memória e contra o SQL real (shim do D1), concorrência (`concurrency.test.ts`), auth, perfis, demo, compra etc. Antes de reportar algo como novo, uma busca rápida (`grep -rn "<regra ou rota>" cotacao/test`) mostra se já existe teste — se existe e passa, o bug provavelmente é de tela ou de integração, e isso é informação útil no relatório.
