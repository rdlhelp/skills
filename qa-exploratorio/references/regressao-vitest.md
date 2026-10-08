# Teste de regressão (vitest, nível API)

O projeto não tem Playwright: a suíte é vitest em `cotacao/test/`, chamando a API pelo `app.request` do Hono com `MemoryStore` (e, quando o bug pode depender do SQL, com o shim do D1 em `test/d1-shim.ts`, como em `store-d1.test.ts`). Decisão do usuário em 07/10/2026: regressão no formato da suíte atual, sem dependência nova.

Só escreva depois que o usuário aceitar. Um arquivo por fluxo testado: `cotacao/test/qa-<fluxo>.test.ts`. Não altere os testes existentes nem o código do sistema.

## Como montar

1. Ache o teste existente mais parecido (`grep -rln "<rota>" cotacao/test`) e copie o `setup` dele em vez de inventar um. Para o fluxo cotação → envio → resposta → compra, o modelo é `cotacao/test/app-flow.test.ts` (função `setup()` com `MemoryStore`, gateway simulado e `call(method, path, body)`); para corrida, `concurrency.test.ts`; para login e perfis, `auth.test.ts` e `profiles.test.ts`.
2. Reproduza o bug pela API com os mesmos dados do relatório. O `describe` cita o ID: `describe('QA-20261007-01: duplo envio de cotação sem referência', …)`.
3. A asserção descreve o comportamento **esperado** (o que o PRD diz), não o atual.
4. Rode: `npm test --workspace @linkapeca/cotacao -- qa-<fluxo>`. Ele **deve falhar** agora. Se passar, o teste não captura o bug: ou o bug é de tela (então não vira vitest), ou o teste está errado — investigue antes de entregar.
5. Mostre ao usuário a saída da falha e diga: "fica vermelho até a correção; quem corrigir deve deixá-lo verde". Não marque como `skip` nem `todo` sem o usuário pedir.

## Exemplo de forma (adapte ao setup real)

```ts
import { describe, expect, it } from 'vitest';
// copie aqui o setup() do teste existente mais parecido

describe('QA-20261007-01: duplo clique em Criar cotação sem referência externa', () => {
  it('duas requisições iguais em paralelo criam uma única cotação', async () => {
    const { call, store } = await setup();
    const payload = { /* o mesmo corpo visto no read_network_requests */ };
    const [a, b] = await Promise.all([call('POST', '/v1/quotations', payload), call('POST', '/v1/quotations', payload)]);
    expect([a.status, b.status].every((s) => s < 500)).toBe(true);
    expect((await store.listQuotations('assoc_1', 50)).length).toBe(1);
  });
});
```

Bugs que não viram vitest (descreva no relatório como "regressão manual"): layout em 375 px, foco, mensagens de tela, comportamento do botão (desabilitar), Voltar/atualizar. Se um deles tiver uma parte de API (ex.: o botão não desabilita **e** o servidor aceita duas vezes), a parte de API vira teste.
