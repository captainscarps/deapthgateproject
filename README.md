# Roleta da Governança • SEST SENAT

Jogo de perguntas estilo *Perguntados* para colaboradores do **SEST SENAT** aprenderem, de forma rápida e divertida, sobre **LGPD, IA responsável, segurança da informação, governança de dados e políticas internas**. Feito primeiro para o celular, funciona também no computador.

## Como jogar
- Gire a roleta: 6 categorias + **Coroa**.
- Responda a pergunta da categoria em até **20 segundos** (4 alternativas).
- Acerto: **100 pontos + até 50** pela rapidez e **1 moeda**.
- **3 acertos seguidos** (ou cair na Coroa) liberam a disputa de um **selo**, valendo o dobro.
- Cada erro custa **1 vida** (3 no total). Junte os **6 selos** para vencer.
- Ajudas compradas com moedas: **Consultar o DPO** (elimina 2 alternativas), **+10 s**, **Pular** e **Segunda chance**.

## Categorias e mascotes
| Categoria | Mascote |
|---|---|
| LGPD e Privacidade | Lia, a Guardiã da Privacidade |
| IA Responsável | Bit, o Robô Consciente |
| Segurança da Informação | Duda, a Vigia da Rede |
| Governança de Dados | Gus, o Curador de Dados |
| Políticas SEST SENAT | Polly, a Conselheira |
| Pense Antes | Pipo, o Pensador |

## Estrutura
```text
index.html              Página do jogo
roleta.html             Redireciona para index.html (links antigos)
tests.html              Testes automáticos (banco de perguntas, personagens, mascotes)
css/style.css           Base (cores, botões, modais)
css/comum.css           Ícones, efeitos e criador de personagem
css/roleta.css          Visual do jogo
js/roleta.js            Regras e telas do jogo
js/perguntas.js         Categorias e carregamento do banco
js/mascotes.js          Mascotes das categorias (SVG)
js/avatar.js            Opções e validação do personagem
js/avatar_render.js     Desenho do personagem (SVG)
js/ui/avatar_criador.js Tela de personalização
js/fx.js, js/icones.js, js/audio.js   Efeitos, ícones SVG e sons (Web Audio)
data/perguntas.json     Banco de perguntas
docs/                   Plano de melhorias e termo de privacidade
```

## Banco de perguntas
Todas as perguntas ficam em `data/perguntas.json`:
```json
{ "id": "lgpd_001", "categoria": "lgpd", "nivel": 1,
  "pergunta": "…", "alternativas": ["…", "…", "…", "…"], "correta": 0,
  "explicacao": "…" }
```
- `categoria`: `lgpd`, `ia`, `seguranca`, `governanca`, `politicas` ou `pense_antes`.
- `nivel` 2 ou 3 é usado nas disputas de selo.
- `status: "exemplo"` marca perguntas provisórias (aparece a etiqueta "exemplo" no jogo). As de **Políticas SEST SENAT** são exemplos até recebermos as políticas oficiais e devem ser validadas pelo Encarregado (DPO).
- Depois de editar, abra `tests.html` para conferir a estrutura.

## Tecnologia
HTML, CSS e JavaScript puro (ES Modules), sem build e sem dependências. Hospedado no GitHub Pages. Recorde e personagem ficam salvos no navegador (`localStorage`).

## Histórico
O repositório começou com a **Trilha Inteligente** (jogo de tabuleiro). Ela foi aposentada em 16/11/2026 e a Roleta passou a ser o único jogo. O código da Trilha continua no histórico do Git (último commit com ela: `65beedf`).
