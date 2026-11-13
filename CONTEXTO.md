# CONTEXTO.md • Trilha Inteligente: Governança de IA

## 1. Visão Geral do Jogo e Objetivos Pedagógicos
A **Trilha Inteligente** é um jogo educativo interativo (*party game retro arcade*) desenvolvido para os colaboradores e instrutores do **SEST SENAT** (Serviço Social do Transporte e Serviço Nacional de Aprendizagem do Transporte).

### Objetivos Pedagógicos
- **Governança e Ética em IA**: Difundir as diretrizes corporativas do SEST SENAT sobre o uso seguro, ético e responsável de inteligências artificiais generativas e preditivas.
- **Princípio Pense Antes**: Estimular a reflexão crítica antes de inserir comandos (*prompts*), enviar dados institucionais ou aceitar saídas de modelos de IA sem validação humana.
- **Proteção de Dados & LGPD**: Conscientizar sobre a sensibilidade de dados de motoristas, alunos do simulador, prontuários de saúde odontológica e registros de telemetria de frotas.
- **Prevenção de Vieses e Alucinações**: Capacitar para identificar falhas conceituais, alucinações e respostas tendenciosas em modelos de linguagem e ferramentas de IA pública.
- **Sustentabilidade de Recursos**: Introduzir a conscientização sobre o custo computacional e ambiental de inferência de IA através da mecânica de *tokens* como recurso finito e precioso.

---

## 2. Arquitetura da Solução
A aplicação foi construída com padrão moderno de arquitetura web estática acoplada a serviços de nuvem seguros:

- **Frontend Estático (SPA Puro)**:
  - HTML5, CSS3 moderno (Custom Properties, Flexbox, CSS Grid, 3D Transforms com `preserve-3d`), JavaScript ES Modules (`import`/`export`).
  - Sem frameworks pesados (sem React, Vue ou Angular) para máxima performance, leveza e portabilidade institucional.
  - Biblioteca de animação **GSAP 3.12.5** para tweening do peão, dados 3D, câmeras e transições suaves de tela.
  - Biblioteca de geração visual **SVG Dinâmico** para montagem procedural de cartas, casas e do Criador de Avatar Chibi.
- **Backend / Supabase**:
  - **PostgreSQL 15** com Row Level Security (RLS).
  - Tabela `partidas`: histórico auditado, pontuação consolidada, meta de voltas e casas avançadas, avatar do jogador, com restrição `pontos <= 50000`.
  - Tabela `jogadores`: registro institucional com e-mail `@sestsenat.org.br`, área de atuação, avatar normalizado Schema v1 e termos aceitos.
  - Tabela `areas`: unidades operacionais e setores institucionais do SEST SENAT.
  - **Edge Functions (Deno / TypeScript)**:
    - `registrar-partida`: função protegida por JWT que audita deterministricamente cada jogada enviada no histórico (teto de segurança: 400 itens) antes de calcular pontuação oficial e gravar no banco.
    - `registrar-partida-convidado`: auditoria idêntica para partidas anônimas em Modo Convidado sem persistência em ranking oficial.

---

## 3. Estrutura de Dados e Expansão

### 3.1 Tabuleiro em Grafo (`data/tabuleiro.json`)
- Layout fixo em grade manual de **18 colunas x 11 linhas** (célula: `80px x 80px`, diorama: `1440px x 880px`).
- Total de **66 casas (nós)** interconectadas por **68 arestas**:
  - Caminho externo e vias internas contornando props 3D originais.
  - **2 Bifurcações Pedagógicas**:
    - **Nó 12**: Escolha entre o *Atalho da IA Pública* (nó 61, alto risco) x *Rota Segura Institucional* (nó 13, boas práticas), reencontrando no nó 20.
    - **Nó 34**: Escolha entre o *Atalho dos Dados Abertos* (nó 64) x *Rota de Governança* (nó 35), reencontrando no nó 40.
  - **1 Hub Central ("Central de Dados" - Nó 33)**: Roleta giratória com 6 eventos corporativos de governança ao cruzar o nó central.
  - **Checkpoints**: Nós 20 (Dado Protegido), 40 (IA Bem Usada) e 60 (Portal Final / Guardião dos Dados).
  - **Loop Contínuo**: Aresta explícita conectando o Nó 60 de volta ao Nó 0 (`proximos: [0]`).

### 3.2 Catálogo de Cartas (`data/cartas_fallback.json`)
- Expandido para **120 cartas escritas** (20 cartas por categoria, divididas nos níveis 1, 2 e 3):
  1. `pense_antes` (20 cartas): dilemas éticos que exigem análise de risco corporativo.
  2. `boa_pratica` (20 cartas): atitudes exemplares de conformidade e segurança.
  3. `armadilha` (20 cartas): armadilhas cotidianas de vazamento, shadow AI e alucinações.
  4. `desafio` (20 cartas): quiz de múltipla escolha com feedback pedagógico detalhado.
  5. `conexao` (20 cartas): dinâmicas de colaboração entre unidades e TI/DPO.
  6. `evento` (20 cartas): acontecimentos operacionais externos e impactos regulatórios.
- **Pools de Dificuldade (Níveis 1 a 3)**:
  - Volta 1 (Voltas = 0): compra prioritária de cartas Nível 1 (conceitos fundamentais).
  - Volta 2 (Voltas = 1): compra prioritária de cartas Nível 2 (casos intermediários).
  - Volta 3+ (Voltas >= 2): compra de cartas Nível 3 (cenários avançados e incidentes complexos).
- **Algoritmo Anti-Repetição**: O `DeckManager` organiza cartas em filas por `(categoria, nivel)`. Nenhuma carta se repete na mesma partida até que todas as cartas daquele nível tenham sido consumidas, resultando em taxa de repetição < 5% (0.0% em partidas normais).

### 3.3 Modelos Procedurais e Datasets SEST SENAT
- `data/dados.json`: 8 categorias de dados sensíveis ou operacionais (telemetria, prontuários, biometria de alunos, avaliações psicológicas).
- `data/destinos.json`: 6 ambientes corporativos e externos com avaliação de risco (repositório público, nuvem homologada, chatbot não autorizado).
- `data/ativos.json`: 6 ativos críticos do SEST SENAT (Simulador de Direção, Clínica Odontológica, AVA, BI Corporativo).
- 3 modelos procedurais no `js/deck.js` com no mínimo 4 frases-base por modelo para geração infinita e determinística de novos cenários.

### 3.4 Criador de Avatar Chibi (`js/avatar.js` & `data/avatar_opcoes.json`)
- Miniatura estilo chibi/boardgame (cabeça volumosa, corpo compacto, base redonda, contorno navy grosso e sombra projetada dura).
- Renderização em camadas SVG empilhadas em ordem rígida:
  1. Base redonda de diorama
  2. Acessório de costas (mochila)
  3. Corpo base (pele 1 a 6)
  4. Roupa institucional / casual
  5. Expressão facial
  6. Barba
  7. Cabelo com paleta de cores
  8. Acessório de rosto (óculos)
  9. Acessório de cabeça (fones, boné)
  10. Item na mão (tablet, crachá, cafezinho)
- Três modos de renderização:
  - `completo`: corpo inteiro 120x150 para criador e tela de resultados.
  - `busto`: close-up circular 48x48 para HUD e rankings.
  - `peao`: miniatura vertical 52x70 com billboard e sombra para o tabuleiro 3D.
- Suporte a reações animadas: `neutro`, `pulando`, `comemorando`, `assustado`.

---

## 4. Regras do Jogo e Fórmula de Pontuação Oficial

### 4.1 Mecânica de Loop Contínuo
1. **O Portal Final (Nó 60) NÃO Encerra a Partida**:
   - Ao passar pelo Nó 60, o jogador completa uma **volta** (`voltas_completas += 1`), recebe o bônus de volta (10 tokens na 1ª volta, reduzido pela metade nas seguintes) e o peão segue continuamente para o Nó 0 ao longo da aresta `60 -> 0`.
2. **Condição de Fim de Partida**:
   - A partida termina **SOMENTE quando os tokens chegam a 0** (esgotamento de recursos de IA) ou quando o jogador decide clicar em **"🛑 Encerrar Partida"** para consolidar os pontos alcançados.
3. **Custo de Rolagem Progressivo por Volta**:
   - Volta 1 (Voltas = 0): cada rolagem custa **1 token**.
   - Volta 2 (Voltas = 1): cada rolagem custa **2 tokens**.
   - Volta 3+ (Voltas >= 2): cada rolagem custa **3 tokens**.
   - O custo é exibido no botão arcade: `🎲 ROLAR DADO · -1 🪙`.
4. **Alerta de Recursos Críticos**:
   - Quando o saldo de tokens atinge 5 ou menos, a UI ativa pulso vermelho de advertência.
   - Ao zerar tokens, abre-se a tela intermediária educativa:
     > *"Toda IA consome recursos. Use com consciência."*
5. **Duração Calibrada da Partida**:
   - Partidas duram em média **8 a 12 minutos** (20 a 40 rolagens equilibradas).

### 4.2 Bônus de Checkpoint
- Checkpoints concedem bônus de tokens **1 vez por volta**:
  - CP 1 (Nó 20): Base 3 tokens (Volta 1: 3, Volta 2: 2, Volta 3+: 1).
  - CP 2 (Nó 40): Base 5 tokens (Volta 1: 5, Volta 2: 3, Volta 3+: 1).
  - Portal Final (Nó 60): Base 10 tokens (Volta 1: 10, Volta 2: 5, Volta 3+: 3).

### 4.3 Fórmula Oficial de Pontuação Auditada
A pontuação é calculada de forma idêntica e determinística tanto no cliente (`js/regras.js`) quanto no servidor (`supabase/functions/registrar-partida/index.ts`):

```text
pontos = (casas_avancadas * 5)
       + (voltas_completas * 150)
       + (acertos_desafio * 50)
       + (bonus_pense_antes * 30)
       + (boas_praticas * 10)
       - (armadilhas * 20)
       (mínimo 0)
```

#### Constantes Oficiais de Calibração (`CONSTANTES_PONTUACAO`):
| Constante | Valor | Descrição |
|---|---|---|
| `PTS_POR_CASA` | 5 | Recompensa por cada casa percorrida no percurso |
| `PTS_POR_VOLTA` | 150 | Recompensa por volta completa contornando o tabuleiro |
| `PTS_ACERTO_DESAFIO` | 50 | Acerto em perguntas e quizzes de múltipla escolha |
| `PTS_BONUS_PENSE_ANTES` | 30 | Escolhas que priorizam governança e reflexão crítica |
| `PTS_BOA_PRATICA` | 10 | Coleta de cartas e eventos de boas práticas corporativas |
| `PENALIDADE_ARMADILHA` | 20 | Penalidade em pontos por cair em armadilhas de segurança |

---

## 5. Diretrizes de Estilo Visual e Diorama 2.5D
- **Cena Isométrica 2.5D**:
  - `.cena-viewport`: overflow hidden, ocupa 100% da área útil central.
  - `.enquadramento`: recebe as transformações 2D da câmera (`translate` e `scale`).
  - `.cena`: perspective fixa de `1000px`.
  - `.plano`: rotação fixa `rotateX(55deg)`, transform-origin `50% 50%`.
- **Billboard Effect**:
  - Rótulos, discos, placas de checkpoint e peão possuem contrapeso de rotação `rotateX(-55deg)` para permanecerem perpendiculares à câmera, com leitura nítida e sem distorção.
- **Padrão de Ícones (Regra Rígida de Design)**:
  - **Nenhum emoji é utilizado na interface** do jogo (tabuleiro, botões, modais).
  - Todos os ícones são SVGs inline próprios com espessura de traço consistente (`stroke: #05101F`, `stroke-width: 2.5px`).
- **Paleta Oficial SEST SENAT Arcade**:
  - `Deep Navy Background`: `#071426` / `#0A192F`
  - `Cyan High-Tech`: `#00B4D8` / `#90E0EF`
  - `Gold / Checkpoints`: `#FFC93C` / `#FFE885`
  - `Green / Boa Prática`: `#3CCB7F`
  - `Red / Armadilha`: `#E8484F`
  - `Orange / Desafio`: `#FF7A3D`

---

## 6. Como Rodar Localmente e Executar Testes

### 6.1 Executando o Servidor Local
Abra o terminal PowerShell na pasta do projeto e inicie o servidor HTTP nativo:
```powershell
python -m http.server 8080
```
Acesse a aplicação no navegador em:
- **Jogo Principal**: `http://localhost:8080/index.html`
- **Smoke Test Automatizado**: `http://localhost:8080/smoke.html`
- **Suíte Integrada de Testes**: `http://localhost:8080/tests.html`

### 6.2 Executando a Suíte de Testes Automatizada
Abra `http://localhost:8080/tests.html` no navegador ou execute via linha de comando com Chrome Headless:
```powershell
python -c "
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
opts = Options(); opts.add_argument('--headless=new'); opts.add_argument('--no-sandbox')
driver = webdriver.Chrome(options=opts)
try:
    driver.get('http://localhost:8080/tests.html')
    import time; time.sleep(3)
    print(driver.find_element('id', 'placar').text)
finally:
    driver.quit()
"
```
Resultado esperado:
```text
✅ 38 TESTES PASSARAM | 100% DE APROVAÇÃO (Total: 38)
```

### 6.3 Executando o Teste de Alinhamento do Peão (20 Passos < 2px)
```powershell
python validar_20_passos_oficial.py
```
Resultado esperado:
```text
Total de passos auditados: 21
Desvio máximo absoluto: 1.83 px
Critério de aprovação (< 2.0 px): APROVADO 100%
```
