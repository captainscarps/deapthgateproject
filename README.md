# 🎲 Trilha Inteligente • Governança de IA (SEST SENAT)

> **Jogo de tabuleiro digital SOLO** para colaboradores do **SEST SENAT** aprenderem, de forma prática e engajadora, sobre o uso consciente e seguro de Inteligência Artificial, governança de dados corporativos, conformidade com a LGPD e boas práticas institucionais.

---

## 🎯 Visão Geral do Jogo
- **Duração**: 5 a 8 minutos por partida.
- **Público**: Colaboradores de todas as diretorias e unidades do SEST SENAT.
- **Mecânica**:
  - Trilha em formato serpente de **31 casas** (0 a 30) gerada de forma determinística a cada semana ISO.
  - Dado semanal determinístico (faces 1 a 6) baseado em semente temporal.
  - **Checkpoints** educativos de progresso nas casas 10, 20 e 30 com bônus pedagógicos.
  - Cartas de 6 categorias temáticas: *Pense Antes*, *Boa Prática*, *Desafio*, *Armadilha*, *Conexão* e *Evento*.
  - **Classificação Ética**: Ranking semanal competitivo entre diretorias (calculado pela média de pontuação com quórum mínimo de 3 colaboradores) e ranking individual na área.
  - **Selo Oficial vs. Treino**: A primeira partida jogada na semana conta para o ranking oficial da área; partidas subsequentes funcionam como modo de treino e aperfeiçoamento.

---

## 🛠️ Stack Tecnológica
- **Frontend**: HTML5 semântico, CSS3 corporativo (Design System Navy/Cyan) e JavaScript puro com **ES Modules**.
- **Sem Framework / Sem Build**: Zero dependências de Node.js, Webpack, Vite ou npm em tempo de execução.
- **Bibliotecas Externas (Apenas CDN)**:
  - [GSAP 3.12](https://greensock.com/gsap/): Animações fluidas de peão, rolagem 3D de dado e contadores de pontuação.
  - [@supabase/supabase-js v2](https://supabase.com/docs/reference/javascript): Autenticação OTP e cliente de banco de dados.
- **Áudio**: Sintetizado via **Web Audio API** nativa (zero download de arquivos de áudio), com chave de mudo (🔊 / 🔇) e respeito a `prefers-reduced-motion`.
- **Backend (Supabase)**:
  - Banco de Dados: PostgreSQL 15 com Row Level Security (RLS) rigorosa.
  - Autenticação: OTP de 6 dígitos restrito ao domínio `@sestsenat.org.br`.
  - Edge Function: `registrar-partida` (Deno) para auditoria e recálculo de pontuação no servidor.
- **Hospedagem**: GitHub Pages (Single Page Application).

---

## 📂 Estrutura do Projeto
```text
Trilha Inteligente/
├── index.html                   # Ponto de entrada SPA e viewport
├── favicon.svg                  # Identidade visual vetorial
├── README.md                    # Documentação do projeto
├── .gitignore                   # Exclusão de legados e arquivos temporários
├── css/
│   ├── style.css                # Variáveis de tema, botões, modais e acessibilidade
│   └── telas.css                # Estilos específicos de cada tela do jogo
├── js/
│   ├── main.js                  # Inicializador e roteador suave de telas SPA
│   ├── config.js                # Credenciais ativas do Supabase (Modo Mock se vazio)
│   ├── config.exemplo.js        # Modelo documentado de configuração
│   ├── state.js                 # Fonte única da verdade reativa com persistência
│   ├── rng.js                   # RNG determinístico (cyrb53 + mulberry32)
│   ├── deck.js                  # Baralho semanal, validação e tabuleiro determinístico
│   ├── regras.js                # Funções puras de movimentação, checkpoints e pontuação
│   ├── audio.js                 # Efeitos sonoros sintetizados (Web Audio API)
│   ├── api.js                   # Integração Supabase, modo mock e fila offline
│   └── ui/                      # Telas modulares
│       ├── inicio.js            # Boas-vindas, identificação OTP e trava de área
│       ├── privacidade.js       # Modal com termo LGPD e termo de aceite
│       ├── tutorial.js          # Guia ilustrado em 3 passos
│       ├── tabuleiro.js         # Trilha serpente de 31 casas, dado 3D e HUD
│       ├── carta.js             # Modal de decisão com flip 3D e feedback educativo
│       ├── resultado.js         # Fechamento auditado, contador animado e checklist
│       └── ranking.js           # Classificação de áreas e individual com quórum
├── data/
│   ├── cartas_fallback.json     # 42 cartas pedagógicas de governança de IA
│   └── areas_mock.json          # 7 diretorias oficiais do SEST SENAT
├── supabase/
│   ├── schema_final.sql         # DDL consolidado (tabelas, triggers, RLS e RPCs)
│   ├── seed_cartas.sql          # Carga de cartas ativas para a nuvem
│   ├── limpeza_piloto.sql       # Script de limpeza de testes pré-lançamento
│   └── functions/
│       └── registrar-partida/   # Edge Function para auditoria de partidas
│           └── index.ts
└── docs/
    └── termo_privacidade.md     # Minuta do termo de privacidade e LGPD institucional
```

---

## 🚀 Como Rodar Localmente

Como o projeto é construído em ES Modules puros, basta servi-lo através de qualquer servidor HTTP estático local (sem instalar ferramentas pesadas):

### Opção 1: Via Python (já presente no Windows/Mac/Linux)
No terminal da pasta do projeto, execute:
```bash
python -m http.server 8080
```
Abra no navegador: `http://localhost:8080`

### Opção 2: Via Extensão Live Server (VS Code / Antigravity)
Clique com o botão direito no arquivo `index.html` e selecione **"Open with Live Server"**.

### Opção 3: Via Node.js (sem instalar dependências)
```bash
npx serve .
```

### Testes Unitários de Regras
Abra o arquivo `tests.html` no navegador para rodar a suíte de validação determinística de RNG, regras de movimentação, pontuação e baralhos.

---

## ☁️ Como Configurar o Supabase

O projeto opera automaticamente em **Modo Mock** caso o Supabase não esteja configurado. Para conectar à sua infraestrutura corporativa:

1. **Crie um projeto no Supabase**:
   - Crie o projeto no [painel do Supabase](https://supabase.com).
2. **Execute o Script do Banco**:
   - Abra o **SQL Editor** no painel do Supabase.
   - Cole e execute o arquivo [`supabase/schema_final.sql`](supabase/schema_final.sql).
   - *(Opcional)*: Execute [`supabase/seed_cartas.sql`](supabase/seed_cartas.sql) para popular a tabela de cartas na nuvem.
3. **Crie a Edge Function**:
   - Em **Edge Functions** ➔ crie a função com o nome `registrar-partida`.
   - Cole o código de [`supabase/functions/registrar-partida/index.ts`](supabase/functions/registrar-partida/index.ts) e clique em **Deploy**.
4. **Configure o Auth com OTP de 6 Dígitos**:
   - Em **Authentication** ➔ **Providers** ➔ **Email**: certifique-se de que o provedor de e-mail está ativo.
   - Em **Authentication** ➔ **Email Templates** ➔ **Magic Link**:
     - No assunto: `Seu código de acesso ao Trilha Inteligente: {{ .Token }}`
     - No corpo HTML, inclua a variável `{{ .Token }}` para exibir o código de 6 dígitos.
5. **Conecte as Chaves no Frontend**:
   - No painel do Supabase, acesse **Project Settings** ➔ **API**.
   - Copie a **Project URL** e a chave **`anon` `public`**.
   - Abra [`js/config.js`](js/config.js) e preencha:
     ```javascript
     export const SUPABASE_URL = "https://SEU_PROJETO.supabase.co";
     export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI...";
     ```

---

## 🌐 Publicação no GitHub Pages

### 1. Inicializar Repositório e Enviar Código
```bash
git init
git add .
git commit -m "feat: lancamento do jogo Trilha Inteligente"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/trilha-inteligente.git
git push -u origin main
```

### 2. Ativar o GitHub Pages
1. No seu repositório no GitHub, clique em **Settings** ➔ **Pages**.
2. Em **Build and deployment** ➔ **Source**, selecione:
   - **Deploy from a branch**
   - Branch: `main` / pasta: `/(root)`
3. Clique em **Save**.
4. Em 1 a 2 minutos, o GitHub disponibilizará o link público:
   `https://SEU_USUARIO.github.io/trilha-inteligente/`

### 3. Configurar as URLs no Supabase Auth
Para que o envio de e-mails com OTP reconheça o domínio de publicação:
1. No painel do Supabase, vá em **Authentication** ➔ **URL Configuration**.
2. No campo **Site URL**, informe a URL do Pages:
   ```text
   https://SEU_USUARIO.github.io/trilha-inteligente/
   ```
3. Em **Redirect URLs**, adicione:
   ```text
   https://SEU_USUARIO.github.io/trilha-inteligente/**
   ```
4. Clique em **Save**.

---

## 📋 Checklist Final para o Piloto Oficial

Antes de divulgar o link para os primeiros participantes do piloto:

- [ ] **Validação de Domínio Ativa**: Confirmar que e-mails fora de `@sestsenat.org.br` são barrados tanto no frontend quanto pela trigger `validar_email_institucional` no banco.
- [ ] **Template OTP Homologado**: Testar recebimento do e-mail corporativo com o token de 6 dígitos legível.
- [ ] **Área Institucional Travada**: Testar que após o 1º acesso o colaborador não consegue alterar seu `area_id`.
- [ ] **Auditoria da Edge Function**: Confirmar que a Edge Function `registrar-partida` recalcula e homologa a pontuação oficial da 1ª partida da semana.
- [ ] **Preservação de Modo Treino**: Confirmar que a 2ª partida do mesmo jogador na semana recebe o selo `🎯 TREINO` e não altera sua pontuação oficial.
- [ ] **Quórum no Ranking**: Confirmar que áreas com menos de 3 colaboradores exibem o aviso de quórum na tela de Ranking.
- [ ] **Contingência Offline**: Simular desconexão de rede e conferir reenvio automático via `localStorage` ao reconectar.
- [ ] **Limpeza de Testes**: Executar o script [`supabase/limpeza_piloto.sql`](supabase/limpeza_piloto.sql) no SQL Editor para zerar partidas e jogadores de teste, mantendo as 7 áreas e as cartas ativas.
