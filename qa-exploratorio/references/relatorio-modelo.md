# Modelo do relatório

Arquivo: `docs/qa/AAAA-MM-DD-<fluxo>.md` (fluxo em minúsculas com hífen: `nova-cotacao`, `resposta-desmonte`, `compra`). Use este modelo inteiro; seção sem conteúdo fica com "Nada encontrado." (não apague a seção — a ausência também é informação).

```markdown
# QA exploratório — <Fluxo> — DD/MM/AAAA

## Resumo

| | |
|---|---|
| Executado por | Equipe (QA exploratório) |
| Ambiente | Local (`http://127.0.0.1:5175`) · ou Homologação (`https://cotacao-hml…`) |
| Commit | `abc1234` (árvore limpa / com alterações locais: …) |
| Perfis usados | Ana (orçamentista), Bruno (aprovador) … |
| Duração | 45 min planejados · 52 min reais |
| Viewports | 375×812 e desktop |
| Resultado | X bugs confirmados (crítico N · alto N · médio N · baixo N) · Y suspeitas |

**Missão (charter):** Explorar … com … para descobrir …

**Testado:** lista curta das áreas/ações cobertas.

**Não testado (e por quê):** ex.: "expiração do código de login (5 min reais; sem relógio controlável no local)", "SQL injection no D1 (o local usa memória)".

### Cobertura por campo

| Tela | Campo | Classes aplicadas | Resultado |
|---|---|---|---|
| Nova cotação | Ano | limite, vazio, letras, 5 dígitos via API | ok / ver QA-…-02 |

## Bugs confirmados

### QA-AAAAMMDD-01 · <título curto que diz o defeito> · **alto**

- **Onde:** tela / rota
- **Perfil:** Ana (orçamentista)
- **Frequência:** 3/3
- **Passos:**
  1. Entrar como Ana (31900000001).
  2. Abrir `#/cotacoes/nova`, aba Formulário.
  3. …
- **Esperado:** … (cite a regra: RN-0xx, PRD §x, CLAUDE.md regra n, quando houver)
- **Obtido:** …
- **Evidência:**
  - Rede: `POST /v1/quotations` → 200 (duas vezes), corpos com `number` LP-2026-00012 e LP-2026-00013
  - Console: `TypeError: …` (ou "sem erros")
  - Screenshot: na conversa, passo 4
- **Teste automático existente:** nenhum cobre / `cotacao/test/x.test.ts` cobre a API e passa (o bug é de tela)
- **Regressão sugerida:** vitest de API / só manual (layout)

## Suspeitas (não confirmadas)

### QA-AAAAMMDD-S1 · <título>
- **O que se viu:** …
- **Por que não está confirmado:** reproduziu 1/4; ou depende de interpretar a regra X
- **O que falta para confirmar:** …

## O que funcionou bem

- Bloqueio correto de … (tentativa registrada: …)

## Sugestões de UX (não são bugs)

- …

## Dados criados

| Tipo | Identificação | Pode descartar? |
|---|---|---|
| Cotação | LP-2026-00012 (ref. `QA-20261007-1`) | sim |

(No local: "Memória volátil; tudo some ao reiniciar o servidor.")
```

Regras de escrita:
- Título do bug diz o defeito ("Duplo clique em Criar cotação cria duas cotações"), não a área ("Problema na nova cotação").
- Passos começam de um estado que qualquer um alcança (login), com o texto exato digitado entre crases.
- Uma causa provável = um bug, mesmo com vários sintomas; liste os sintomas.
- Tokens de link, códigos de login e segredos sempre mascarados (`/r/AbCd…`).
- Nunca "Claude" no texto; o executor é "Equipe (QA exploratório)".
