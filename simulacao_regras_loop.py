# -*- coding: utf-8 -*-
import json, random, math

# Carrega grafo do tabuleiro e cartas
with open('data/tabuleiro.json', 'r', encoding='utf-8') as f:
    grafo = json.load(f)

with open('data/cartas_fallback.json', 'r', encoding='utf-8') as f:
    cartas = json.load(f)

casas_dict = {c['id']: c for c in grafo['casas']}
# Assegura conexao do nó 60 ao nó 0
casas_dict[60]['proximos'] = [0]

# Organiza cartas por categoria e nivel
cartas_por_cat_nivel = {}
for c in cartas:
    cat = c['categoria']
    nv = c.get('nivel', 1)
    if cat not in cartas_por_cat_nivel:
        cartas_por_cat_nivel[cat] = {1: [], 2: [], 3: []}
    cartas_por_cat_nivel[cat][nv].append(c)

CONST_PONTOS = {
    'CASA': 5,
    'VOLTA': 150,
    'DESAFIO': 50,
    'PENSE_ANTES': 30,
    'BOA_PRATICA': 10,
    'ARMADILHA': 20
}

def simular_uma_partida(estrategia='aleatoria', semente=1):
    rng = random.Random(semente)
    tokens = 20
    pos = 0
    voltas = 0
    casas_avancadas = 0
    acertos_desafio = 0
    bonus_pense_antes = 0
    boas_praticas = 0
    armadilhas = 0
    rolagens = 0
    
    checkpoints_volta = set()
    cartas_compradas = []
    
    # Decks de compra por categoria e nivel
    decks_disponiveis = {}
    for cat in cartas_por_cat_nivel:
        decks_disponiveis[cat] = {}
        for nv in [1, 2, 3]:
            decks_disponiveis[cat][nv] = list(cartas_por_cat_nivel[cat][nv])
            rng.shuffle(decks_disponiveis[cat][nv])

    def comprar(cat, nivel):
        disp = decks_disponiveis[cat].get(nivel, [])
        if not disp:
            # Fallback reembaralha
            decks_disponiveis[cat][nivel] = list(cartas_por_cat_nivel[cat][nivel])
            rng.shuffle(decks_disponiveis[cat][nivel])
            disp = decks_disponiveis[cat][nivel]
        carta = disp.pop(0)
        cartas_compradas.append(carta['id'])
        return carta

    # Armadilha extra determinística por volta
    def get_armadilhas_volta(v):
        if v == 0: return set()
        rng_v = random.Random(semente + v * 997)
        candidatos = [cid for cid, c in casas_dict.items() if cid not in [0, 20, 27, 33, 40, 53, 60]]
        return set(rng_v.sample(candidatos, min(v, 4)))

    while tokens > 0 and rolagens < 120:
        # Custo de rolagem por volta
        if voltas == 0:
            custo = 1
        elif voltas == 1:
            custo = 2
        else:
            custo = 3
            
        if tokens < custo:
            # Tokens insuficientes para pagar a rolagem
            break
            
        tokens -= custo
        rolagens += 1
        
        dado = rng.randint(1, 6)
        passos = dado
        
        while passos > 0:
            nodo = casas_dict[pos]
            proxs = nodo.get('proximos', [])
            if not proxs:
                proxs = [0]
                
            if len(proxs) > 1:
                # Bifurcação
                if estrategia == 'otima':
                    # Rota Segura (geralmente segundo caminho ou com menos armadilhas)
                    prox_id = proxs[1] if len(proxs) > 1 else proxs[0]
                else:
                    prox_id = rng.choice(proxs)
            else:
                prox_id = proxs[0]
                
            pos = prox_id
            casas_avancadas += 1
            passos -= 1
            
            # Chegada ou passagem pelo Portal (60)
            if pos == 60:
                voltas += 1
                checkpoints_volta.clear()
                # Bônus de volta completa (10, 5, 2...)
                bonus_portal = max(1, round(10 / (2 ** (voltas - 1))))
                tokens += bonus_portal
                # Imediatamente segue para a Casa 0
                pos = 0
                
            # Checkpoints (20 e 40)
            if (pos == 20 or pos == 27) and pos not in checkpoints_volta:
                checkpoints_volta.add(pos)
                bonus_cp = max(1, round(3 / (2 ** voltas)))
                tokens += bonus_cp
            elif (pos == 40 or pos == 53) and pos not in checkpoints_volta:
                checkpoints_volta.add(pos)
                bonus_cp = max(1, round(5 / (2 ** voltas)))
                tokens += bonus_cp
                
            # Hub central (33)
            if pos == 33 and 33 not in checkpoints_volta:
                checkpoints_volta.add(33)
                ev_tokens = rng.choice([-2, 2, 4, 3])
                tokens = max(0, tokens + ev_tokens)
                
        # Casa onde o peão parou ao final do dado
        armadilhas_extras = get_armadilhas_volta(voltas)
        eh_armadilha_extra = pos in armadilhas_extras
        
        # Categoria da casa
        nodo_final = casas_dict[pos]
        cat = nodo_final.get('tipo_fixo') or 'boa_pratica'
        if eh_armadilha_extra:
            cat = 'armadilha'
        elif cat not in ['inicio', 'checkpoint', 'hub']:
            # Sorteia categoria da trilha se não for fixo
            cat = rng.choice(['pense_antes', 'boa_pratica', 'desafio', 'armadilha', 'conexao', 'evento'])
            
        nivel_carta = min(3, voltas + 1)
        
        if cat == 'armadilha':
            armadilhas += 1
            tokens = max(0, tokens - rng.choice([3, 4, 5]))
        elif cat == 'boa_pratica':
            boas_praticas += 1
            tokens += rng.choice([3, 4])
        elif cat == 'pense_antes':
            carta = comprar('pense_antes', nivel_carta)
            if estrategia == 'otima' or rng.random() > 0.35:
                bonus_pense_antes += 1
                tokens += 3
            else:
                tokens = max(0, tokens - 2)
        elif cat == 'desafio':
            carta = comprar('desafio', nivel_carta)
            if estrategia == 'otima' or rng.random() > 0.45:
                acertos_desafio += 1
                tokens += 4
            else:
                tokens = max(0, tokens - 3)
        elif cat == 'conexao':
            tokens += rng.choice([3, 4])
        elif cat == 'evento':
            tokens = max(0, tokens + rng.choice([-2, 3, 4, 5]))

    # Cálculo da pontuação oficial pela nova regra
    pontos = (casas_avancadas * CONST_PONTOS['CASA'] +
              voltas * CONST_PONTOS['VOLTA'] +
              acertos_desafio * CONST_PONTOS['DESAFIO'] +
              bonus_pense_antes * CONST_PONTOS['PENSE_ANTES'] +
              boas_praticas * CONST_PONTOS['BOA_PRATICA'] -
              armadilhas * CONST_PONTOS['ARMADILHA'])
    pontos = max(0, pontos)
    
    # Tempo estimado: ~22 segundos por rolagem (leitura de carta, reflexão, animação)
    tempo_minutos = (rolagens * 22) / 60.0
    
    # Repeticoes de cartas nesta partida
    unicas = len(set(cartas_compradas))
    totais = len(cartas_compradas)
    pct_repetidas = ((totais - unicas) / totais * 100.0) if totais > 0 else 0.0

    return {
        'rolagens': rolagens,
        'tempo_minutos': tempo_minutos,
        'voltas': voltas,
        'casas_avancadas': casas_avancadas,
        'tokens_finais': tokens,
        'pontos': pontos,
        'pct_repetidas': pct_repetidas
    }

def executar_bateria(estrategia, n=100):
    resultados = [simular_uma_partida(estrategia, semente=1000 + i) for i in range(n)]
    
    rolagens = [r['rolagens'] for r in resultados]
    tempos = [r['tempo_minutos'] for r in resultados]
    pontos = [r['pontos'] for r in resultados]
    repeticoes = [r['pct_repetidas'] for r in resultados]
    
    return {
        'estrategia': estrategia,
        'n': n,
        'rolagens': { 'min': min(rolagens), 'med': sum(rolagens)/n, 'max': max(rolagens) },
        'tempo_min': { 'min': min(tempos), 'med': sum(tempos)/n, 'max': max(tempos) },
        'pontos': { 'min': min(pontos), 'med': sum(pontos)/n, 'max': max(pontos) },
        'pct_repetidas_media': sum(repeticoes)/n
    }

res_aleatoria = executar_bateria('aleatoria', 100)
res_otima = executar_bateria('otima', 100)

print('=== 1. PARTIDAS COM ESCOLHAS ALEATÓRIAS (100 SIMULAÇÕES) ===')
print(f"Rolagens: Mín={res_aleatoria['rolagens']['min']} | Média={res_aleatoria['rolagens']['med']:.1f} | Máx={res_aleatoria['rolagens']['max']}")
print(f"Duração Estimada: Mín={res_aleatoria['tempo_min']['min']:.1f} min | Média={res_aleatoria['tempo_min']['med']:.1f} min | Máx={res_aleatoria['tempo_min']['max']:.1f} min")
print(f"Pontuação: Mín={res_aleatoria['pontos']['min']} | Média={res_aleatoria['pontos']['med']:.0f} | Máx={res_aleatoria['pontos']['max']}")
print(f"Taxa Média de Repetição de Cartas: {res_aleatoria['pct_repetidas_media']:.2f}% (Meta < 5%)")

print('\n=== 2. PARTIDAS COM ESCOLHAS SEMPRE CORRETAS (100 SIMULAÇÕES) ===')
print(f"Rolagens: Mín={res_otima['rolagens']['min']} | Média={res_otima['rolagens']['med']:.1f} | Máx={res_otima['rolagens']['max']}")
print(f"Duração Estimada: Mín={res_otima['tempo_min']['min']:.1f} min | Média={res_otima['tempo_min']['med']:.1f} min | Máx={res_otima['tempo_min']['max']:.1f} min")
print(f"Pontuação: Mín={res_otima['pontos']['min']} | Média={res_otima['pontos']['med']:.0f} | Máx={res_otima['pontos']['max']}")
print(f"Taxa Média de Repetição de Cartas: {res_otima['pct_repetidas_media']:.2f}% (Meta < 5%)")
