# Interface e acessibilidade básica

Faça cada tela do escopo em dois tamanhos: `resize_window {preset: "mobile"}` (375×812) e `{preset: "desktop"}`. Volte para `desktop` ao terminar (o tamanho emulado fica na aba).

## Layout
- 375 px: nada com rolagem horizontal (snippet `overflowCheck` lista os elementos mais largos que a tela); botões principais visíveis sem zoom; tabelas viram cartão ou rolam dentro do próprio contêiner
- textos longos (nome de oficina de 120 caracteres, descrição de peça de 300) quebram linha sem empurrar o layout
- cabeçalho fixo não cobre o conteúdo nem os alertas; a faixa "HOMOLOGAÇÃO" (hml) ou "Demonstração" aparece

## Teclado e foco
- Tab percorre os campos na ordem visual; Shift+Tab volta; nada fica preso
- foco visível em todo elemento interativo (não sumiu com `outline: none`)
- Enter envia o formulário (e envia só uma vez); Esc fecha diálogos
- botões de alternância (Tenho/Não tenho) funcionam por teclado e têm `aria-pressed`
- após erro de validação, o foco vai para o campo com erro ou a mensagem é anunciada

## Mensagens e estados
- erro diz **o quê** e **como corrigir**, em português claro ("Informe o CEP com 8 dígitos", não "Erro 400" nem "invalid input")
- nenhuma mensagem técnica para o usuário (stack, nome de tabela, `undefined`, `[object Object]`, `NaN`, `null`, `R$ NaN`)
- estado de carregamento em tudo que demora (busca nas redes pode levar segundos)
- estado vazio com orientação (lista sem cotações, peça sem resultado, área do desmonte sem cotação)
- sucesso confirmado (o usuário sabe que a cotação foi criada e qual número ela tem)
- textos públicos (links do desmonte, mensagens): nunca "boleto", desconto ou prazo de pagamento onde a regra 4 do CLAUDE.md proíbe; marca só "LinkaPeça"

## Acessibilidade básica (sem ferramenta externa)
- `read_page` mostra nome acessível em todo botão e campo (botão só com ícone precisa de `aria-label`)
- imagens com `alt`; fotos da peça com descrição útil
- contraste: texto cinza claro sobre branco em informação importante (use `javascript_tool` com `getComputedStyle` para ler as cores quando suspeitar)
- `prefers-reduced-motion`: `resize_window` não emula; leia o CSS (`motion-reduce:` do Tailwind) e anote como verificação por código
- zoom de 200%: não dá para emular no navegador do app; anote como não coberto
- modo escuro: `resize_window {colorScheme: "dark"}` — o texto continua legível?
