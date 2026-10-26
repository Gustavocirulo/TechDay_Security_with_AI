# TechDay Cadmus — AI Security Lab

Laboratório local para demonstrar, ao vivo, o ciclo:

**CÓDIGO → ANÁLISE DA IA → VULNERABILIDADE → CORREÇÃO → NOVA ANÁLISE**

Uma LLM lê o código-fonte de um backend propositalmente vulnerável, devolve um JSON estruturado e o frontend mostra cada achado (severidade, arquivo, linha, trecho, explicação, correção) com comparação **Vulnerável × Corrigido**.

> ⚠️ Uso exclusivo em ambiente local de laboratório. Dados e credenciais são fictícios; não há persistência, exfiltração nem chamadas externas nos exemplos de exploração.

## Estrutura

```
lab/
├── docker-compose.yml
├── .env.example
├── frontend/            UI (nginx + HTML/CSS/JS, sem dependências)
├── backend/             APLICAÇÃO-ALVO (Express)
│   └── src/
│       ├── vulnerable/  ← código inseguro (5 vulnerabilidades, comentário "VULN #n")
│       └── fixed/       ← mesma API, corrigida
├── scanner/             AI Security Scanner (separado do alvo)
│   ├── src/llm.js       cliente LLM (API compatível com OpenAI)
│   ├── src/normalize.js validação do JSON da LLM
│   └── demo/*.json      respostas pré-preparadas do DEMO MODE
```

## Vulnerabilidades (OWASP)

| # | Arquivo | Vulnerabilidade | Severidade |
|---|---------|-----------------|------------|
| 1 | `users.js` | SQL Injection | CRITICAL |
| 2 | `comments.js` | XSS armazenado | HIGH |
| 3 | `ping.js` | Command Injection | CRITICAL |
| 4 | `auth.js` | Hardcoded Secret | HIGH |
| 5 | `transfer.js` | Falta de validação de entrada | MEDIUM |

## Pré-requisitos

- Docker + Docker Compose v2 (`docker compose`)
- Internet e uma chave de LLM **apenas** para o Real Mode

## Configuração

```powershell
copy .env.example .env      # Linux/macOS: cp .env.example .env
```

Variáveis (todas em `.env`, nunca no código):

| Variável | Descrição |
|----------|-----------|
| `SCANNER_MODE` | `demo` (padrão) ou `real` — modo inicial da UI |
| `LLM_BASE_URL` | endpoint compatível com OpenAI (padrão `https://generativelanguage.googleapis.com/v1beta/openai`) |
| `LLM_API_KEY` | sua chave |
| `LLM_MODEL` | modelo (padrão `gemini-3.5-flash-lite`) |
| `LLM_JSON_MODE` | `false` se o provedor não aceitar `response_format` |
| `JWT_SECRET` | segredo fictício usado pela versão corrigida |
| `FRONTEND_PORT` | porta local (padrão `8088`) |

## Iniciar

```bash
docker compose up --build
```

Acesse **http://localhost:8088**.

## Roteiro da apresentação

1. Mostre a tela inicial e a busca de usuários (aplicação funcionando).
2. Abra `backend/src/vulnerable/*.js` e mostre os comentários `VULN #n`.
3. Com **Código analisado = Vulnerável**, clique em **Executar análise de segurança**.
4. Mostre o resumo e os cards; clique em **Ver código** / **Ver correção** e use o toggle **Vulnerável / Corrigido** do visualizador.
5. Mude para **Código analisado = Corrigido** e execute novamente: o resultado cai para 0 vulnerabilidades.

### Demo Mode (sem API externa)

Selecione **DEMO MODE** (padrão). O scanner devolve `scanner/demo/vulnerable.json` ou `fixed.json`, com um pequeno atraso simulado. O frontend deixa explícito: "DEMO MODE · resultado pré-preparado". Funciona totalmente offline.

### Real Mode (LLM)

1. Gere uma chave em https://aistudio.google.com/apikey (Google AI Studio).
2. No `.env` (copiado de `.env.example`): `LLM_API_KEY=sua_chave_gemini`. O padrão já usa o endpoint OpenAI-compatível do Gemini e o modelo `gemini-3.5-flash-lite`; para outro modelo altere `LLM_MODEL` (ex.: `gemini-3.5-flash-lite`). Outros provedores também funcionam via `LLM_BASE_URL`/`LLM_MODEL` (OpenAI, Ollama `http://host.docker.internal:11434/v1`, OpenRouter).
3. `docker compose up --build -d` (use `docker compose up -d --force-recreate scanner` se só mudou o `.env`).
3. Na UI selecione **REAL MODE (LLM)**. O resultado exibe "Analyzed by LLM · modelo".

O scanner pede JSON estruturado, tolera markdown em volta, tenta de novo se o JSON vier inválido, descarta itens malformados e reposiciona a linha pelo trecho de código. Se a LLM falhar, a UI mostra o erro e você pode voltar ao Demo Mode.

## Testes

```bash
docker compose exec backend npm test      # ataques funcionam no vulnerable e são bloqueados no fixed
docker compose exec scanner npm test      # parsing/validação do JSON
```

## Isolamento do laboratório

- Containers sem root, sistema de arquivos `read_only`, `cap_drop: ALL`, `no-new-privileges`, limites de memória/processos.
- Backend em rede Docker `internal` (sem internet e sem acesso ao host); SQLite apenas em memória.
- Scanner monta o código-fonte como somente leitura e é o único com saída de rede (somente para a LLM no Real Mode).
- Porta publicada apenas em `127.0.0.1`.
- Atenção: no Real Mode o código dos arquivos é enviado ao provedor de LLM — aqui é código fictício; não faça isso com código proprietário sem aprovação.

## Solução de problemas

- **Porta ocupada** (no Windows, algumas portas são reservadas): altere `FRONTEND_PORT` no `.env`.
- **Real Mode retorna erro**: confira `LLM_API_KEY`, `LLM_BASE_URL` e `LLM_MODEL`.
