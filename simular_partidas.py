import json, random

with open('data/tabuleiro.json', 'r', encoding='utf-8') as f:
    grafo = json.load(f)

casas_dict = {c['id']: c for c in grafo['casas']}

print('Total casas no grafo:', len(grafo['casas']))
print('Hub Central:', grafo['hub']['nome'], 'no ID:', grafo['hub']['id'])
print('Checkpoints:', [cp['nome'] for cp in grafo['checkpoints']])

partidas = []
for i in range(1, 6):
    pos = 0
    rodada = 0
    tokens = 20
    bifurcacoes_escolhidas = []
    hub_eventos = []
    checkpoints_atingidos = []
    
    # Tempo estimado realista por acao pedagógica:
    # - Rolar + animar peao: 3s
    # - Ler carta e responder desafio: 22s
    # - Bifurcacao (analise do dilema etico): 12s
    # - Hub Central (mostrador giratorio): 8s
    # - Checkpoint modal: 6s
    tempo_segundos = 0
    
    while pos < 60 and rodada < 45 and tokens > 0:
        rodada += 1
        dado = random.randint(1, 6)
        passos = dado
        tempo_segundos += 3
        
        while passos > 0 and pos < 60:
            nodo = casas_dict[pos]
            if not nodo['proximos']:
                pos = 60
                break
                
            if len(nodo['proximos']) > 1:
                escolha = random.choice(nodo['proximos'])
                opcao_info = next(op for op in nodo['bifurcacao']['opcoes'] if op['proximo'] == escolha)
                bifurcacoes_escolhidas.append(opcao_info['nome'])
                tempo_segundos += 12
                pos = escolha
            else:
                pos = nodo['proximos'][0]
                
            passos -= 1
            
            # Hub Central
            if pos == 33 and 33 not in hub_eventos:
                hub_eventos.append(33)
                ev = random.choice(grafo['hub']['eventos'])
                tokens += ev.get('tokens', 0)
                tempo_segundos += 8
                
            # Checkpoints
            if pos == 27 and 27 not in checkpoints_atingidos:
                checkpoints_atingidos.append(27)
                tokens += 3
                tempo_segundos += 6
            if pos == 53 and 53 not in checkpoints_atingidos:
                checkpoints_atingidos.append(53)
                tokens += 5
                tempo_segundos += 6
            if pos >= 60 and 60 not in checkpoints_atingidos:
                checkpoints_atingidos.append(60)
                tempo_segundos += 6
                break
                
        if pos < 60 and pos not in [27, 53, 33]:
            tempo_segundos += 22
            tokens += random.choice([-2, 1, 2, 3])
            
    minutos = tempo_segundos / 60
    partidas.append({
        'partida': i,
        'rodadas': rodada,
        'tokens_finais': tokens,
        'bifurcacoes': bifurcacoes_escolhidas,
        'tempo_minutos': round(minutos, 1),
        'tempo_segundos': tempo_segundos
    })

print('\n=== RESULTADO DAS 5 SIMULAÇÕES ===')
for p in partidas:
    bifs_str = ', '.join(p['bifurcacoes'])
    print(f"Partida {p['partida']}: {p['rodadas']} rodadas | {p['tokens_finais']} tokens | Duração: {p['tempo_minutos']} min ({p['tempo_segundos']}s) | Escolhas: [{bifs_str}]")

media_min = sum(p['tempo_minutos'] for p in partidas) / len(partidas)
print(f"\nDuração Média Geral: {round(media_min, 1)} minutos (Meta: 8 a 10 min)")
