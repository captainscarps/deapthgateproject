# Plano de Melhorias • Trilha Inteligente

> Documento vivo. Consolida o diagnóstico, as mecânicas propostas, o modo Liga + Duelo,
> as métricas de engajamento, as decisões pendentes e a ordem de execução.
> Última atualização: 16/11/2026.

---

## 1. Diagnóstico (versão atual)

### Visual
- Tabuleiro ocupa ~metade da área central; casas pequenas e parecidas (diferença só por cor).
- Fundo de madeira sem relação com o tema "Cidade dos Dados".
- Painéis laterais com muito texto (checkpoints em lista descritiva).
- Emojis misturados com ícones SVG (contraria a regra do CONTEXTO.md).
- Pequenas quebras: selo "CONVIDADO" cortado, botão "ROLAR DADO · -1" quebrando linha.
- O momento-chave (cair numa casa) é só um modal de texto, sem impacto.

### Mecânica
- Partida sem fim definido (acaba ao zerar tokens ou ao encerrar). Como pontos vêm de
  casas andadas (5) e voltas (150), **quem joga mais tempo pontua mais**: o ranking mede
  persistência/sorte, não conhecimento.
- Poucas decisões por turno (rolar o dado + 2 bifurcações).
- Banco de perguntas pequeno (20 cartas `desafio`).

---

## 2. Métricas de engajamento (medir antes e depois)

| Métrica | Definição |
|---|---|
| Conclusão | partidas terminadas / iniciadas |
| Retorno | jogadores que voltam na semana seguinte |
| Participação por área | % de colaboradores da área que jogou na semana |
| Aprendizado | taxa de acerto por tema ao longo das semanas |
| Duelos | duelos lançados por jogador/semana e % respondidos no prazo |

No modo convidado, registrar eventos em log local para os playtests.

---

## 3. Mecânicas propostas

### 3.1 Estrutura estilo Mario Party (Fase 2)
- **Rodadas fixas** (ex.: 15) — iguala as chances e acaba com o grind.
- **Tokens viram moeda**, não vida.
- **Selos de Governança** (as "estrelas"): ficam numa casa que muda de lugar e são comprados
  com tokens. Ranking por selos, desempate por pontos.
- **Reta Final**: últimas 3 rodadas com prêmios/perdas dobrados.
- **Bônus surpresa no fim**: "Mais acertos seguidos", "Zero armadilhas", "Explorador".

### 3.2 Decisões dentro do turno
- **Loja de itens**: Escudo LGPD (anula armadilha), Consulta ao DPO (elimina 2 alternativas),
  Dado Duplo, Backup (recupera tokens perdidos).
- **Aposta de confiança** antes da pergunta (1, 2 ou 3 tokens).
- **Sequência de acertos**: 3 seguidos = ×1,5; 5 seguidos = ×2; erro zera. *(Fase 1 — feito)*

### 3.3 Minigames (20–30 s)
- Classifique o dado (pessoal / sensível / público).
- Limpe o prompt (clicar nos dados pessoais antes de enviar à IA).
- Verdade ou Alucinação.
- Caça ao phishing.

### 3.4 Aprendizado e progressão
- **Relatório final por tema** ("domina LGPD, reforçar IA generativa"). *(Fase 1 — feito)*
- Álbum de cartas e conquistas.
- Repetição espaçada: perguntas erradas voltam na semana seguinte.
- Itens de avatar desbloqueados por conhecimento.

---

## 4. Liga + Duelo assíncrono

### 4.1 Ligas
| Liga | Entrada |
|---|---|
| Bronze | todos começam aqui |
| Prata / Ouro / Diamante | sobem por pontos de liga |
| Guardião dos Dados | topo |

- Grupos de ~20–30 pessoas por liga, misturando áreas.
- Temporada semanal (semana ISO): os primeiros sobem, os últimos descem, o meio fica.
- **Pontos de liga são separados do ranking por área** (liga = disputa individual;
  ranking de área = instituição).

### 4.2 Duelo
1. **Lançar**: escolher um adversário do seu grupo e responder a bateria na hora
   (**7 perguntas × 15 s**).
2. **Pontuação selada**: ninguém vê o resultado até os dois terminarem.
3. **Adversário responde quando puder** (prazo de 48 h), mesmas perguntas, mesma ordem.
4. **Revelação**: tela de suspense pergunta por pergunta, lado a lado, com explicações.

**Pontuação por pergunta**: acerto = 100 + bônus de velocidade até 50; erro/tempo esgotado = 0.
Sétima pergunta vale o dobro.

**Prêmio**: vencedor +30 pontos de liga; perdedor −10; empate +10 para ambos.

**Regras de convivência**
- Até 3 desafios lançados por dia; mesma pessoa no máximo 1×/semana.
- Prazo expirado: **desafio cancelado**, ninguém perde nada.
- Revanche com um clique; possibilidade de desligar o recebimento de duelos.

### 4.3 Arquitetura
- **Protótipo (agora)**: liga simulada com colegas fictícios, adversário simulado que
  "responde depois", tudo em `localStorage`.
- **Produção (Supabase)**: tabelas `ligas`, `grupos_liga`, `duelos`; semente define a bateria;
  função `registrar-duelo` corrige no servidor; gabarito nunca vai ao navegador; servidor
  entrega uma pergunta por vez e registra o horário.
- **Conteúdo**: meta de 100–150 perguntas por tema e dificuldade, com validação do DPO/jurídico.

---

## 5. Visual

- Câmera mais próxima seguindo o peão; casas maiores, com forma e ícone por categoria
  (acessível a daltônicos).
- Fundo temático "Cidade dos Dados" no lugar da madeira; bairros com cor própria.
- Efeitos: tokens voando até o contador, tremor na armadilha, confete no acerto,
  reação do peão.
- Cartas com animação de virar, cor por categoria e o mascote Dadinho.
- Painéis enxutos (checkpoints como barra de progresso), ícones só SVG.
- Tela inicial com destaque único e botão principal grande.

---

## 6. Decisões

| Decisão | Status |
|---|---|
| Rodadas fixas + Selos no lugar de "jogar até zerar tokens" | **pendente** (recomendado: sim) |
| Pontos de liga separados do ranking de área | adotado no protótipo |
| Bateria 7 × 15 s | adotado no protótipo |
| Prazo expirado = desafio cancelado | adotado no protótipo |
| Duração-alvo da partida | pendente (sugestão: 8 min) |
| Desktop apenas ou também celular | pendente |
| Validação de conteúdo (DPO/jurídico) | pendente |

---

## 7. Ordem de execução

| Período | Entrega |
|---|---|
| Semana 1 | Fase 1 (polimento visual, combo, relatório) + protótipo Liga/Duelo |
| Semanas 2–3 | Fase 2: rodadas, selos, loja, reta final, 2 minigames (após decisão) |
| Fim da semana 3 | Playtest com 5 colegas e ajustes |
| Semana 4+ | Fase 3: fantasma, álbum, temporadas, migração Supabase institucional |

Cada tarefa: implementar → prints antes/depois → `tests.html` e `smoke.html` → revisão.

---

## 8. Entregue nesta rodada (16/11/2026)

**Fase 1 — visual**
- Fundo "Cidade dos Dados" (skyline + grade) no lugar da mesa de madeira; placa com bairros de cor.
- Câmera segue o peão por padrão (zoom 1,25 no desktop); "Ver tabuleiro todo" e "Modo mesa" continuam disponíveis e a escolha fica salva.
- Casas maiores (60 px), ícones maiores, armadilhas com brilho vermelho.
- HUD: barra de progresso da volta com os 3 checkpoints, medidor de sequência de acertos, alerta de tokens críticos.
- Cartas: faixa colorida da categoria, mascote Dadinho comentando o resultado, flash verde/vermelho, tremor na armadilha.
- Tokens voando até o contador, confete nos checkpoints e no fim da partida.
- Emojis trocados por ícones SVG no tabuleiro, cartas, resultado e tela inicial (`js/icones.js`).

**Fase 1 — mecânica**
- Sequência de acertos (combo) em cartas de múltipla escolha: 3ª e 4ª seguidas +1 token, 5ª em diante +2 (`regras.calcularBonusSequencia`, espelhado em `auditarHistorico`). Pontos não mudam.
- Relatório de aprendizagem por macro-tema na tela de resultado (`js/temas.js`).

**Liga + Duelo (protótipo convidado)** — `js/liga.js`, `js/ui/liga.js`, `css/liga.css`
- Liga semanal com grupo de 20 (19 colegas fictícios), zonas de promoção/rebaixamento, virada de temporada.
- Desafiar → bateria 7 × 15 s → placar selado → colega simulado responde (20–75 s no protótipo) → revelação animada pergunta a pergunta → explicações e revanche.
- Desafios recebidos, caixa de desafios, limites diários, aviso de "resultado disponível".
- Botão "Reiniciar liga de teste" para playtests.

**Correções de bugs antigos**
- Central de Dados travava a rodada (`rngDado.escolher` não existia) — corrigido em `js/rng.js`.
- Modal de checkpoint mostrava o checkpoint errado (usava a casa onde o peão parou) — corrigido.
- Modal "Tokens esgotados" não existia no HTML, então a mensagem educativa nunca aparecia — adicionado.
- Botão de rolar perdia o custo após a primeira jogada; HUD de posição/checkpoints não atualizava — corrigido.
- Variável CSS `--amber` era usada mas não definida — definida.

**Testes**: `tests.html` 38/38 (casos 4 e 10 de `casos_pontuacao.json` atualizados: +2 tokens pela sequência) e `smoke.html` ok.

## 9. Achados técnicos para a Fase 2
- O dicionário de cartas da Edge Function `registrar-partida` tem só 7 cartas por categoria; o jogo usa 120. Partidas oficiais com cartas novas seriam rejeitadas. Gerar o dicionário a partir de `cartas_fallback.json`.
- O cliente conta `acertos_desafio` para qualquer opção correta (inclusive Pense Antes), mas o servidor conta só categoria `desafio`. Alinhar.
- A Edge Function ainda não aplica o bônus de sequência nos tokens (não afeta pontos).
- O validador do grafo registra avisos de arestas diagonais/longas no console (já existiam).

## 10. Rodada 2 — visual de tabuleiro e personagem (16/11/2026)
- **Personagem redesenhado** (`js/avatar_render.js`): miniatura chibi com base redonda; cabelo em duas camadas (atrás da cabeça + franja recortada pelo crânio), rosto sempre visível, barbas que não cobrem a boca, 8 trajes, acessórios, cadeira de rodas/bengala e reações (pulando, comemorando, assustado). Mesmo esquema de configuração v1 — avatares salvos continuam válidos.
- **Personalização**: abas em grade (sem cortes), cada opção mostra o próprio avatar com aquela escolha, nomes em português, prévia maior.
- **Tabuleiro físico**: mesa de madeira, tabuleiro como cartão impresso com moldura navy/dourada e bairros coloridos, trilha impressa em creme, casas como espaços impressos, peão maior.
- **Bug corrigido**: cartas "avança/volta N casas" somavam o número direto na posição (nos atalhos 61–65 o peão ia para a casa 60 e ganhava checkpoints indevidos) e o peão não se movia na tela. Agora o movimento segue o grafo e é animado (`StateManager.moverPorCarta`).

## 11. Roleta da Governança (segundo jogo da plataforma) — 16/11/2026
- Página própria `roleta.html` (mobile-first), mesmo repositório e mesmo site da Trilha; acesso pelo cartão "Roleta da Governança" na tela inicial.
- Regras: roleta com 6 categorias + Coroa; 4 alternativas e 20 s por pergunta; 3 vidas; 100 + até 50 pontos por acerto e +1 moeda; 3 acertos seguidos (ou Coroa) liberam a disputa de um selo valendo o dobro; 6 selos = vitória (+500 e +100 por vida).
- Ajudas com moedas: Consultar o DPO (−2 alternativas), +10 s, Pular, Segunda chance.
- **Banco de perguntas compartilhado** (`data/perguntas.json` + `js/perguntas.js`): 56 perguntas novas + as 40 cartas de múltipla escolha da Trilha, em 6 categorias (LGPD, IA Responsável, Segurança, Governança de Dados, Políticas SEST SENAT, Pense Antes).
- A categoria **Políticas SEST SENAT** usa perguntas marcadas como `exemplo` até recebermos as políticas oficiais (aparece a etiqueta "exemplo" na pergunta).
- Próximos passos: duelos e liga migram da Trilha para a Roleta; meta de ~50 perguntas por categoria; ranking por área somando os dois jogos.
