import sys
import time
import json
sys.stdout.reconfigure(encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--window-size=1920,1080')
driver = webdriver.Chrome(options=opts)

try:
    driver.get('http://localhost:8080/index.html')
    time.sleep(1)

    btn_conv = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.ID, "btn-jogar-convidado"))
    )
    btn_conv.click()

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "peao-jogador"))
    )
    time.sleep(1.5)

    # Disparar medição de 20 passos
    script = """
        const peao = document.getElementById('peao-jogador');
        const wrap = peao.querySelector('.peao-avatar-wrapper');
        const corpo = document.getElementById('peao-corpo');

        const passos = [];
        for (let casaId = 0; casaId <= 20; casaId++) {
            const discoPosEl = document.querySelector('.casa-nodo-pos[data-casa="' + casaId + '"]');
            if (!discoPosEl) continue;

            const isCheckpoint = (casaId === 20 || casaId === 40 || casaId === 60);
            const zAlt = isCheckpoint ? 32 : 16;
            const yOffset = isCheckpoint ? 0 : 2.5;

            wrap.style.transform = `translate3d(calc(-50% - 0.5px), calc(-100% + ${yOffset}px), ${zAlt}px)`;

            const discoTopo = discoPosEl.querySelector('.casa-disco-topo');
            const rectDisco = discoTopo.getBoundingClientRect();
            const discoCenterX = rectDisco.left + rectDisco.width / 2;
            const discoCenterY = rectDisco.top + rectDisco.height / 2;

            peao.style.left = discoPosEl.style.left;
            peao.style.top = discoPosEl.style.top;

            const rectCorpo = corpo.getBoundingClientRect();
            const feetX = rectCorpo.left + rectCorpo.width / 2;
            const feetY = rectCorpo.bottom;

            const dist = Math.hypot(feetX - discoCenterX, feetY - discoCenterY);
            passos.push({
                passo: casaId,
                casaId: casaId,
                tipo: isCheckpoint ? 'checkpoint' : (casaId === 0 ? 'inicio' : 'normal'),
                discoCentro: { x: Number(discoCenterX.toFixed(2)), y: Number(discoCenterY.toFixed(2)) },
                pesPeao: { x: Number(feetX.toFixed(2)), y: Number(feetY.toFixed(2)) },
                desvioX: Number(Math.abs(feetX - discoCenterX).toFixed(2)),
                desvioY: Number(Math.abs(feetY - discoCenterY).toFixed(2)),
                distanciaEuclidianaPx: Number(dist.toFixed(2)),
                aprovado: dist < 2.0
            });
        }
        return passos;
    """
    res = driver.execute_script(script)
    todos = all(p['aprovado'] for p in res)
    max_d = max(p['distanciaEuclidianaPx'] for p in res)

    print("==========================================")
    print("RELATÓRIO DE AUDITORIA DE 20 PASSOS DO PEÃO")
    print("==========================================")
    print(f"Total de passos auditados: {len(res)}")
    print(f"Desvio máximo absoluto: {max_d} px")
    print(f"Critério de aprovação (< 2.0 px): {'APROVADO 100%' if todos else 'FALHA'}")
    print("------------------------------------------")
    for p in res:
        print(f"Passo {p['passo']:02d} (Casa {p['casaId']:02d} [{p['tipo']}]): Disco=({p['discoCentro']['x']}, {p['discoCentro']['y']}) | Pés=({p['pesPeao']['x']}, {p['pesPeao']['y']}) | Dist={p['distanciaEuclidianaPx']}px -> {'✅ PASS' if p['aprovado'] else '❌ FAIL'}")

    with open('relatorio_20_passos.json', 'w', encoding='utf-8') as f:
        json.dump(res, f, indent=2, ensure_ascii=False)
finally:
    driver.quit()
