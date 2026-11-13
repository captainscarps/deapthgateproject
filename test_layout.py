import json

# Definindo a grade 18 colunas (0..17) x 11 linhas (0..10)
# Vamos mapear as coordenadas (col, row) de cada nó

def planejar_trilha():
    casas = []
    ocupadas = {}
    
    def add(id, col, row, proximos, tipo_fixo=None, bifurcacao=None, rotulo=None, caminho=None):
        if (col, row) in ocupadas:
            raise Exception(f"Conflito em ({col}, {row}) entre nó {ocupadas[(col, row)]} e nó {id}")
        ocupadas[(col, row)] = id
        casas.append({
            "id": id,
            "col": col,
            "row": row,
            "x": col * 80 + 40,
            "y": row * 80 + 40,
            "tipo_fixo": tipo_fixo,
            "proximos": proximos,
            "bifurcacao": bifurcacao,
            "rotulo": rotulo,
            "caminho": caminho
        })

    # =========================================================================
    # TRECHO 1: INÍCIO (Casa 0) ATÉ BIFURCAÇÃO 1 (Casa 12)
    # Contorna a borda inferior (Row 9) e sobe na borda direita (Col 16)
    # =========================================================================
    add(0, 1, 9, [1], tipo_fixo="inicio", rotulo="INÍCIO")
    add(1, 2, 9, [2])
    add(2, 3, 9, [3])
    add(3, 4, 9, [4])
    add(4, 5, 9, [5])
    add(5, 6, 9, [6])
    add(6, 7, 9, [7])
    add(7, 8, 9, [8])
    add(8, 9, 9, [9])
    add(9, 10, 9, [10])
    add(10, 11, 9, [11])
    add(11, 12, 9, [12])
    
    # Casa 12: Bifurcação 1 (no canto inferior direito perto de virar para cima)
    # Opção A: Rota Segura (Caminho 13..19 contornando a borda direita até o Checkpoint 1 na Casa 20)
    # Opção B: Atalho da IA Pública (Corta por dentro na Col 12 subindo até o Checkpoint 1)
    bif1_data = {
        "titulo": "Bifurcação 1: Validação de Demanda de IA",
        "pergunta": "Como você validará a nova ferramenta de IA?",
        "opcoes": [
            {
                "proximo": 61,
                "nome": "Atalho da IA Pública",
                "icone": "⚡",
                "tag": "Mais Curto / Risco de Vazamento",
                "desc": "Corta 4 casas pelo interior, mas com alta densidade de armadilhas e sem homologação de segurança."
            },
            {
                "proximo": 13,
                "nome": "Rota Segura Institucional",
                "icone": "🛡️",
                "tag": "Caminho Principal Seguro",
                "desc": "Contorna a borda externa com conformidade LGPD, boas práticas e conexões institucionais."
            }
        ]
    }
    add(12, 13, 9, [13, 61], tipo_fixo="bifurcacao", bifurcacao=bif1_data, rotulo="BIF 1")
    
    # ROTA SEGURA (Casas 13..19 pelo anel externo)
    add(13, 14, 9, [14], caminho="segura_1")
    add(14, 15, 9, [15], caminho="segura_1")
    add(15, 16, 9, [16], caminho="segura_1")
    add(16, 16, 8, [17], caminho="segura_1") # vira para cima na borda direita (Col 16)
    add(17, 16, 7, [18], caminho="segura_1")
    add(18, 16, 6, [19], caminho="segura_1")
    add(19, 16, 5, [20], tipo_fixo="desafio", caminho="segura_1") # Desafio antes do Checkpoint 1!
    
    # ATALHO 1 (Nós 61, 62, 63 cortando por dentro na Col 13/14)
    add(61, 13, 8, [62], caminho="atalho_1")
    add(62, 13, 7, [63], caminho="atalho_1")
    add(63, 14, 6, [20], caminho="atalho_1") # entra direto no Checkpoint 1!
    
    # CHECKPOINT 1: Casa 20 (no anel externo, Col 16, Row 4)
    add(20, 16, 4, [21], tipo_fixo="checkpoint", rotulo="CP 1")
    
    # =========================================================================
    # TRECHO 2: CHECKPOINT 1 (Casa 20) ATÉ CENTRAL DE DADOS (HUB - Casa 29)
    # Continua pelo anel externo até o canto superior direito (16, 1),
    # vira à esquerda e desce para o Hub Central (Col 8, Row 5)
    # =========================================================================
    add(21, 16, 3, [22])
    add(22, 16, 2, [23])
    add(23, 16, 1, [24]) # Canto superior direito
    add(24, 15, 1, [25])
    add(25, 14, 1, [26])
    add(26, 13, 1, [27])
    add(27, 12, 1, [28])
    add(28, 11, 1, [29])
    
    # Caminho que desce em direção ao Hub Central
    add(29, 10, 1, [30])
    add(30, 10, 3, [31]) # desce na Col 10 (Row 2 é vazia)
    add(31, 10, 5, [32]) # chega na linha central (Row 5)
    add(32, 9, 5, [33])  # entra no Hub Central
    
    # HUB CENTRAL: Casa 33 na Coluna 8, Linha 5 (Centro Exato da Grade!)
    add(33, 8, 5, [34], tipo_fixo="hub", rotulo="HUB")
    
    # Saída do Hub: Casa 34 (Col 7, Row 5)
    # Casa 34: Bifurcação 2 (Automação Direta vs Supervisão Humana)
    bif2_data = {
        "titulo": "Bifurcação 2: Modelo Operacional de IA",
        "pergunta": "Como você estruturará o fluxo de trabalho da IA?",
        "opcoes": [
            {
                "proximo": 64,
                "nome": "Automação Direta",
                "icone": "⚙️",
                "tag": "Mais Rápido / Risco de Alucinação",
                "desc": "Corta caminho pelo centro sem validação humana, com riscos severos de viés algorítmico."
            },
            {
                "proximo": 35,
                "nome": "Supervisão Humana (Human-in-the-Loop)",
                "icone": "🤝",
                "tag": "Caminho Principal Seguro",
                "desc": "Validação com especialistas humanos, garantia ética e conformidade contínua."
            }
        ]
    }
    add(34, 7, 5, [35, 64], tipo_fixo="bifurcacao", bifurcacao=bif2_data, rotulo="BIF 2")
    
    # SUPERVISÃO HUMANA (Casas 35..39 dando volta pelo quadrante inferior esquerdo)
    add(35, 6, 5, [36], caminho="humano_2")
    add(36, 5, 5, [37], caminho="humano_2")
    add(37, 4, 5, [38], caminho="humano_2")
    add(38, 4, 7, [39], caminho="humano_2") # desce para Row 7 (Row 6 é livre)
    add(39, 3, 7, [40], tipo_fixo="desafio", caminho="humano_2") # Desafio antes do Checkpoint 2!
    
    # ATALHO 2 (Nós 64, 65 cortando direto para o Checkpoint 2)
    add(64, 7, 7, [65], caminho="automacao_2")
    add(65, 5, 7, [40], caminho="automacao_2")
    
    # CHECKPOINT 2: Casa 40 (no anel esquerdo, Col 1, Row 7)
    add(40, 1, 7, [41], tipo_fixo="checkpoint", rotulo="CP 2")
    
    # =========================================================================
    # TRECHO 3: CHECKPOINT 2 (Casa 40) ATÉ O PORTAL FINAL (Casa 60)
    # Sobe pela borda esquerda (Col 1) contornando até o topo e converge no centro
    # =========================================================================
    add(41, 1, 6, [42])
    add(42, 1, 5, [43])
    add(43, 1, 4, [44])
    add(44, 1, 3, [45])
    add(45, 1, 2, [46])
    add(46, 1, 1, [47]) # Canto superior esquerdo
    add(47, 2, 1, [48])
    add(48, 3, 1, [49])
    add(49, 4, 1, [50])
    add(50, 5, 1, [51])
    add(51, 6, 1, [52])
    add(52, 6, 3, [53]) # laço interno elegante (Row 2 livre)
    add(53, 5, 3, [54])
    add(54, 4, 3, [55])
    add(55, 3, 3, [56])
    add(56, 3, 2, [57])
    add(57, 4, 2, [58])
    add(58, 6, 2, [59]) # converge para a reta final
    add(59, 7, 1, [60], tipo_fixo="desafio") # Desafio antes do Portal!
    
    # PORTAL FINAL: Casa 60 (Centro do fundo, Col 8, Row 1)
    add(60, 8, 1, [], tipo_fixo="checkpoint", rotulo="PORTAL FINAL")
    
    print(f"Sucesso! Total de casas mapeadas: {len(casas)}")
    return casas, ocupadas

casas, ocupadas = planejar_trilha()
