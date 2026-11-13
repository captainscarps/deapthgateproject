# -*- coding: utf-8 -*-
import os
import time
import json
from selenium import webdriver
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.common.by import By

ARTIFACTS_DIR = r"C:\Users\rafaelscarpille\.gemini\antigravity\brain\c1092d29-8b81-4512-96ab-2ee9d58c0818"

def get_driver(width, height):
    opts = EdgeOptions()
    opts.add_argument("--headless=new")
    opts.add_argument(f"--window-size={width},{height}")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--hide-scrollbars")
    driver = webdriver.Edge(options=opts)
    driver.set_window_size(width, height)
    return driver

def responder_modais_pendentes(driver):
    driver.execute_script("""
        // 1. Opção da carta
        const opt = document.querySelector('.opcao-card');
        if (opt) opt.click();
        
        // 2. Continuar carta
        const cont = document.querySelector('#btn-carta-continuar');
        if (cont && cont.offsetParent !== null) cont.click();

        // 3. Bifurcação
        const bif = document.querySelector('.bifurcacao-card-opcao button, .bifurcacao-card-opcao');
        if (bif) bif.click();

        // 4. Checkpoint
        const cpBtn = document.querySelector('#btn-fechar-checkpoint');
        if (cpBtn) cpBtn.click();
    """)

def main():
    driver = get_driver(1920, 1080)
    resultados = []
    try:
        driver.get("http://127.0.0.1:8080/index.html")
        time.sleep(2)
        
        # Iniciar modo convidado
        btn_guest = driver.find_element(By.ID, "btn-jogar-convidado")
        btn_guest.click()
        time.sleep(2)

        # 1. CASA 0
        driver.execute_script("""
            import('./js/ui/tabuleiro.js').then(m => m.debugCamera());
        """)
        time.sleep(0.5)
        info0 = driver.execute_script("return window._lastDebugCamera;")
        p0 = os.path.join(ARTIFACTS_DIR, "debug_cam_01_casa0.png")
        driver.save_screenshot(p0)
        resultados.append(("Casa 0 (Início)", info0, p0))

        # 2. APÓS 3 ROLAGENS REAIS
        for r in range(3):
            time.sleep(0.8)
            responder_modais_pendentes(driver)
            time.sleep(0.5)
            
            # Clica rolar dado via JS ou elemento se habilitado
            driver.execute_script("""
                const btn = document.querySelector('#btn-rolar-dado');
                if (btn && !btn.disabled) btn.click();
            """)
            time.sleep(3.0) # Aguarda rolagem, pulo do peão e abertura de carta
            
            responder_modais_pendentes(driver)
            time.sleep(0.5)

        driver.execute_script("""
            import('./js/ui/tabuleiro.js').then(m => m.debugCamera());
        """)
        time.sleep(0.5)
        info3 = driver.execute_script("return window._lastDebugCamera;")
        p3 = os.path.join(ARTIFACTS_DIR, "debug_cam_02_apos_3_rolagens.png")
        driver.save_screenshot(p3)
        resultados.append(("Após 3 Rolagens", info3, p3))

        # 3. NUMA BIFURCAÇÃO (Casa 12)
        driver.execute_script("""
            responder_modais_pendentes = () => {};
            // Fecha qualquer modal aberto
            document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('ativo'));

            import('./js/state.js').then(st => {
                st.state.set({ posicao: 12 });
                const grafo = st.state.get().grafoTabuleiro;
                const nodo12 = grafo.casas.find(c => c.id === 12);
                
                // Abre modal de bifurcação
                const modal = document.querySelector('#modal-bifurcacao');
                const tituloEl = modal.querySelector('#bif-modal-titulo');
                const perguntaEl = modal.querySelector('#bif-modal-pergunta');
                const gradeEl = modal.querySelector('#bif-modal-grade');
                const bif = nodo12.bifurcacao;
                tituloEl.textContent = bif.titulo;
                perguntaEl.textContent = bif.pergunta;
                gradeEl.innerHTML = bif.opcoes.map((op, idx) => `
                  <div class="bifurcacao-card-opcao ${idx === 0 ? 'opcao-atalho' : 'opcao-segura'}">
                    <div>
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
                        <span style="font-size: 1.6rem;">${op.icone}</span>
                        <span class="badge ${idx === 0 ? 'badge-treino' : 'badge-oficial'}" style="font-size: 0.72rem;">${op.tag}</span>
                      </div>
                      <h4 style="font-size: 1.15rem; color: var(--text-white); font-weight: 800; margin-bottom: 6px;">${op.nome}</h4>
                      <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.35;">${op.desc}</p>
                    </div>
                    <button class="btn btn-primary btn-block" style="margin-top: 8px; font-size: 0.85rem; padding: 8px;">
                      Escolher Este Caminho
                    </button>
                  </div>
                `).join('');
                modal.classList.add('ativo');

                document.documentElement.style.setProperty('--cam-x', nodo12.x + 'px');
                document.documentElement.style.setProperty('--cam-y', nodo12.y + 'px');
                document.documentElement.style.setProperty('--cam-zoom', '1');

                import('./js/ui/tabuleiro.js').then(m => m.debugCamera());
            });
        """)
        time.sleep(1.0)
        infoBif = driver.execute_script("return window._lastDebugCamera;")
        pBif = os.path.join(ARTIFACTS_DIR, "debug_cam_03_bifurcacao.png")
        driver.save_screenshot(pBif)
        resultados.append(("Bifurcação (Casa 12)", infoBif, pBif))

        # 4. NO HUB CENTRAL (Casa 33)
        driver.execute_script("""
            document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('ativo'));

            import('./js/state.js').then(st => {
                st.state.set({ posicao: 33 });
                const grafo = st.state.get().grafoTabuleiro;
                const nodo33 = grafo.casas.find(c => c.id === 33);
                document.documentElement.style.setProperty('--cam-x', nodo33.x + 'px');
                document.documentElement.style.setProperty('--cam-y', nodo33.y + 'px');
                document.documentElement.style.setProperty('--cam-zoom', '1');
                import('./js/ui/tabuleiro.js').then(m => m.debugCamera());
            });
        """)
        time.sleep(1.0)
        infoHub = driver.execute_script("return window._lastDebugCamera;")
        pHub = os.path.join(ARTIFACTS_DIR, "debug_cam_04_hub.png")
        driver.save_screenshot(pHub)
        resultados.append(("Hub Central (Casa 33)", infoHub, pHub))

        # 5. NO PORTAL (Casa 60)
        driver.execute_script("""
            document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('ativo'));

            import('./js/state.js').then(st => {
                st.state.set({ posicao: 60 });
                const grafo = st.state.get().grafoTabuleiro;
                const nodo60 = grafo.casas.find(c => c.id === 60);
                document.documentElement.style.setProperty('--cam-x', nodo60.x + 'px');
                document.documentElement.style.setProperty('--cam-y', nodo60.y + 'px');
                document.documentElement.style.setProperty('--cam-zoom', '1');
                import('./js/ui/tabuleiro.js').then(m => m.debugCamera());
            });
        """)
        time.sleep(1.0)
        infoPortal = driver.execute_script("return window._lastDebugCamera;")
        pPortal = os.path.join(ARTIFACTS_DIR, "debug_cam_05_portal.png")
        driver.save_screenshot(pPortal)
        resultados.append(("Portal Final (Casa 60)", infoPortal, pPortal))

        print("\n=== RESULTADO DA VERIFICAÇÃO AUTOMÁTICA DA CÂMERA ===")
        for nome, inf, img in resultados:
            print(f"\nCaso: {nome}")
            print(f"Info: {inf}")
            if inf:
                print(f"Distância: {inf.get('distPct')}% da largura da cena (< 5% meta: {'PASSOU' if inf.get('passou') else 'FALHOU'})")
            print(f"Print: {img}")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
