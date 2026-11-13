# build_grid.py - Gerador e validador do percurso fixo 18x11

grid = {} # (col, row) -> node_id

# Requisitos:
# - Grade: 18 colunas (0..17), 11 linhas (0..10)
# - Início: canto inferior esquerdo (col 1, row 9)
# - Caminho principal contorna pelas bordas externas
# - Caminho interno com 2 bifurcações:
#   Bifurcação 1: Atalho IA Pública (curto, arriscado) vs Rota Segura (longo, seguro)
#   Hub Central: no centro (col 8, row 5)
#   Bifurcação 2: Automação Direta vs Supervisão Humana
# - Checkpoints nas casas:
#   Casa 20 = Checkpoint 1 (Dado Protegido)
#   Casa 40 = Checkpoint 2 (IA Bem Usada)
#   Casa 60 = Portal Final (Guardião dos Dados)
# - Desafio antes de cada checkpoint: Casas 19, 39, 59
# - Mínimo 1 célula livre entre trilhas paralelas; zero cruzamentos!

casas = []

def add_node(id, col, row, tipo_fixo=None, proximos=None, bifurcacao=None, rotulo=None, caminho=None):
    if (col, row) in grid:
        raise ValueError(f"Conflito de célula em ({col}, {row}): nós {grid[(col, row)]} e {id}")
    grid[(col, row)] = id
    casas.append({
        "id": id,
        "col": col,
        "row": row,
        "x": col * 80 + 40,
        "y": row * 80 + 40,
        "tipo_fixo": tipo_fixo,
        "proximos": proximos or [],
        "bifurcacao": bifurcacao,
        "rotulo": rotulo,
        "caminho": caminho
    })

# Vamos desenhar o caminho:
# Perna 1: Início (1, 9) subindo pelo anel externo esquerdo até (1, 2)
# 0: (1, 9) [INÍCIO]
# 1: (1, 8)
# 2: (1, 7)
# 3: (1, 6)
# 4: (1, 5)
# 5: (1, 4)
# 6: (1, 3)
# 7: (1, 2) [Curva para a direita no anel superior]
# 8: (2, 2)
# 9: (3, 2)
# 10: (4, 2)
# 11: (5, 2)
# 12: (6, 2)
# 13: (7, 2)
# 14: (8, 2) [Bifurcação 1: Atalho da IA Pública x Rota Segura]
#
# Daqui temos:
# Atalho 1 (desce direto pelo meio em direção ao centro, mais rápido):
#   15: (8, 3) [atalho_1]
#   16: (8, 4) [atalho_1]
# Rota Segura 1 (continua pelo anel externo superior e dobra na lateral):
#   17: (9, 2) [segura_1]
#   18: (10, 2) [segura_1]
#   19: (11, 2) [segura_1]
#   ...
# Espere! O checkpoint 1 precisa ser a CASA 20!
# Se Casa 20 é o Checkpoint 1, então a bifurcação 1 pode se reencontrar na Casa 19 (Desafio) ou Casa 20 (Checkpoint 1)!
# Para que a numeração seja contínua, o caminho principal tem casas sequenciais.
# Vamos calcular exatamente!
