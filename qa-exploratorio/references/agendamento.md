# Execução agendada

Rodada agendada roda **só no local** (`127.0.0.1:5175`). A homologação fica de fora porque o login dela depende do código que chega no WhatsApp do usuário e qualquer envio precisa de autorização na hora — duas coisas que uma rodada sozinha não tem.

Relatórios das rodadas agendadas: `docs/qa/agendado/AAAA-MM-DD-<fluxo>.md` (mesmo modelo, com "Execução: agendada" no resumo). Não faça commit dos relatórios: o usuário revisa e decide.

## Opção A — tarefa agendada do app (recomendada)

O app Claude (aba Code) tem tarefas agendadas que rodam nesta máquina com o navegador do app disponível. Peça na conversa algo como:

> Crie uma tarefa agendada "QA noturno da cotação", todo dia às 22h, na pasta D:\Projetos\linkapeca, com o prompt: "Use a skill qa-exploratorio em modo agendado: só local. Faça `git pull` não; teste o commit atual. Fluxos: nova cotação (formulário e colar WhatsApp) e resposta do desmonte, 30 min cada. Salve em docs/qa/agendado/. No fim, pare o servidor e me mande só a contagem por severidade e os críticos/altos."

(Por baixo, isso usa as ferramentas `scheduled-tasks`; a skill `anthropic-skills:schedule` cuida da criação.) O computador precisa estar ligado e o app aberto na hora.

## Opção B — antes de cada `deploy:hml`

Não ponha o QA dentro do `npm run deploy:hml` (o script não deve depender de um agente). Em vez disso, o fluxo combinado é: antes de pedir o deploy, peça "roda o QA exploratório do fluxo X no local" — a skill testa o commit que vai subir. Se quiser um lembrete automático, um hook do Claude Code (`PreToolUse` no comando `npm run deploy:hml`) pode só **avisar** que não há relatório de QA de hoje em `docs/qa/`; configure com a skill `update-config` se quiser.

## Opção C — linha de comando (`claude -p`) pelo Agendador de Tarefas do Windows

Funciona sem o app aberto, mas **sem o navegador do app**: a rodada vira exploração pela API (`fetch` contra o `npm run dev` iniciado pelo próprio script), sem tela, foco nem layout. Use só se as opções A e B não servirem, e diga isso no resumo do relatório ("sem navegador: cobertura só de API").

```bash
claude -p "Use a skill qa-exploratorio em modo agendado, só local e só API (sem navegador). Fluxo: nova cotação. Salve em docs/qa/agendado/." --permission-mode acceptEdits
```

## O que a rodada agendada nunca faz

- abrir hml ou produção (o `guard_url.py` precisa dar `LOCAL` para tudo);
- commit, push, deploy;
- escrever teste de regressão (isso precisa do "sim" do usuário);
- alterar código do sistema.
