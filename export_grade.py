import json

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

# TRECHO 1: INÍCIO (Casa 0) ATÉ BIFURCAÇÃO 1 (Casa 12)
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
add(16, 16, 8, [17], caminho="segura_1")
add(17, 16, 7, [18], caminho="segura_1")
add(18, 16, 6, [19], caminho="segura_1")
add(19, 16, 5, [20], tipo_fixo="desafio", caminho="segura_1") # Desafio antes do Checkpoint 1

# ATALHO 1 (Nós 61, 62, 63 cortando por dentro na Col 13/14)
add(61, 13, 8, [62], caminho="atalho_1")
add(62, 13, 7, [63], caminho="atalho_1")
add(63, 14, 6, [20], caminho="atalho_1")

# CHECKPOINT 1: Casa 20 (Col 16, Row 4)
add(20, 16, 4, [21], tipo_fixo="checkpoint", rotulo="CP 1")

# TRECHO 2: CHECKPOINT 1 (Casa 20) ATÉ CENTRAL DE DADOS (HUB - Casa 33)
add(21, 16, 3, [22])
add(22, 16, 2, [23])
add(23, 16, 1, [24])
add(24, 15, 1, [25])
add(25, 14, 1, [26])
add(26, 13, 1, [27])
add(27, 12, 1, [28])
add(28, 11, 1, [29])
add(29, 10, 1, [30])
add(30, 10, 3, [31])
add(31, 10, 5, [32])
add(32, 9, 5, [33])

# HUB CENTRAL: Casa 33 (Col 8, Row 5 - Centro)
add(33, 8, 5, [34], tipo_fixo="hub", rotulo="CENTRAL DE DADOS")

# BIFURCAÇÃO 2: Casa 34 (Col 7, Row 5)
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

# SUPERVISÃO HUMANA (Casas 35..39)
add(35, 6, 5, [36], caminho="humano_2")
add(36, 5, 5, [37], caminho="humano_2")
add(37, 4, 5, [38], caminho="humano_2")
add(38, 4, 7, [39], caminho="humano_2")
add(39, 3, 7, [40], tipo_fixo="desafio", caminho="humano_2") # Desafio antes do Checkpoint 2

# ATALHO 2 (Nós 64, 65)
add(64, 7, 7, [65], caminho="automacao_2")
add(65, 5, 7, [40], caminho="automacao_2")

# CHECKPOINT 2: Casa 40 (Col 1, Row 7)
add(40, 1, 7, [41], tipo_fixo="checkpoint", rotulo="CP 2")

# TRECHO 3: CHECKPOINT 2 (Casa 40) ATÉ O PORTAL FINAL (Casa 60)
add(41, 1, 6, [42])
add(42, 1, 5, [43])
add(43, 1, 4, [44])
add(44, 1, 3, [45])
add(45, 1, 2, [46])
add(46, 1, 1, [47])
add(47, 2, 1, [48])
add(48, 3, 1, [49])
add(49, 4, 1, [50])
add(50, 5, 1, [51])
add(51, 6, 1, [52])
add(52, 6, 3, [53])
add(53, 5, 3, [54])
add(54, 4, 3, [55])
add(55, 3, 3, [56])
add(56, 3, 2, [57])
add(57, 4, 2, [58])
add(58, 6, 2, [59])
add(59, 7, 1, [60], tipo_fixo="desafio") # Desafio antes do Portal

# PORTAL FINAL: Casa 60 (Col 8, Row 1 - Fundo Centro)
add(60, 8, 1, [], tipo_fixo="checkpoint", rotulo="PORTAL FINAL")

# Props reservados em células vazias:
props_reservados = [
    { "id": "prop_predios_1", "nome": "Prédios Gráfico de Barras", "col": 10, "row": 7, "w": 2, "h": 2 },
    { "id": "prop_onibus_1", "nome": "Mini Ônibus SEST SENAT", "col": 14, "row": 7, "w": 2, "h": 2 },
    { "id": "prop_racks_1", "nome": "Mini Racks de Servidor", "col": 13, "row": 3, "w": 2, "h": 2 },
    { "id": "prop_nuvem_1", "nome": "Nuvem de Dados", "col": 3, "row": 1, "w": 2, "h": 1 },
    { "id": "prop_caminhao_1", "nome": "Mini Caminhão de Carga", "col": 2, "row": 5, "w": 2, "h": 2 },
    { "id": "prop_cubos_1", "nome": "Blocos Binários (0101)", "col": 7, "row": 3, "w": 1, "h": 1 }
]

tabuleiro_export = {
    "versao": "2.1.0",
    "nome": "Trilha da Governança de IA - Grade Fixa 18x11",
    "grade": {
        "colunas": 18,
        "linhas": 11,
        "tamanho_celula": 80
    },
    "dimensoes": {
        "largura": 1440,
        "altura": 880
    },
    "hub": {
        "id": 33,
        "nome": "Central de Dados",
        "col": 8,
        "row": 5,
        "x": 8 * 80 + 40,
        "y": 5 * 80 + 40,
        "raio": 56,
        "eventos": [
            { "id": "ev_hub_1", "rotulo": "+4 Tokens", "tokens": 4, "desc": "Auditoria de dados aprovada com louvor!" },
            { "id": "ev_hub_2", "rotulo": "+2 Casas", "mover": 2, "desc": "Pipeline de governança acelerou sua jornada!" },
            { "id": "ev_hub_3", "rotulo": "+3 Tokens", "tokens": 3, "desc": "Catálogo corporativo de dados atualizado." },
            { "id": "ev_hub_4", "rotulo": "Bônus IA", "tokens": 5, "desc": "Modelo de IA homologado sem vieses detectados!" },
            { "id": "ev_hub_5", "rotulo": "+1 Casa", "mover": 1, "desc": "Fluxo contínuo de conformidade e integridade." },
            { "id": "ev_hub_6", "rotulo": "+2 Tokens", "tokens": 2, "desc": "Workshop de boas práticas concluído." }
        ]
    },
    "checkpoints": [
        { "id": 20, "numero": 1, "nome": "Dado Protegido", "bonus": 3, "desc": "Etapa 1: Coleta, higienização e classificação segura de dados." },
        { "id": 40, "numero": 2, "nome": "IA Bem Usada", "bonus": 5, "desc": "Etapa 2: Aplicação ética, supervisão humana e prevenção de vieses." },
        { "id": 60, "numero": 3, "nome": "Guardião dos Dados", "bonus": 0, "desc": "Fim da Jornada: Portal de Excelência em Governança SEST SENAT." }
    ],
    "props": props_reservados,
    "casas": casas
}

with open("data/tabuleiro.json", "w", encoding="utf-8") as f:
    json.dump(tabuleiro_export, f, indent=2, ensure_ascii=False)

print(f"data/tabuleiro.json atualizado com sucesso! Total nós: {len(casas)}")
