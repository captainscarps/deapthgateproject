# -*- coding: utf-8 -*-
import os
import time
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

def capture_editor():
    print("=== CAPTURANDO EDITOR DE TABULEIRO (1600x1000) ===")
    driver = get_driver(1600, 1000)
    try:
        driver.get("http://127.0.0.1:8080/editor-tabuleiro.html")
        time.sleep(2)
        out_path = os.path.join(ARTIFACTS_DIR, "editor_18x11_vista_de_cima.png")
        driver.save_screenshot(out_path)
        print("Salvo:", out_path)
    finally:
        driver.quit()

def capture_resolution(w, h, prefix):
    print(f"\n=== CAPTURANDO CENAS EM {w}x{h} ({prefix}) ===")
    driver = get_driver(w, h)
    try:
        driver.get("http://127.0.0.1:8080/index.html")
        time.sleep(2)
        
        # 1. Inicia como convidado
        btn_guest = driver.find_element(By.ID, "btn-jogar-convidado")
        btn_guest.click()
        time.sleep(2)
        
        # Foto 1: Casa 0 (Início)
        p1 = os.path.join(ARTIFACTS_DIR, f"{prefix}_01_inicio.png")
        driver.save_screenshot(p1)
        print("Salvo 01 (Início):", p1)

        # Foto 2: Bifurcação 1 (Casa 12) com modal de escolha aberto e os 2 caminhos visíveis
        driver.execute_script("""
            import('./js/state.js').then(st => {
                st.state.set({ posicao: 12 });
                const grafo = st.state.get().grafoTabuleiro;
                const nodo12 = grafo.casas.find(c => c.id === 12);
                
                // Abre o modal de bifurcação
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

                // Move câmera e peão para a Casa 12
                const plano = document.querySelector('#tabuleiro-3d');
                plano.style.transform = `rotateX(var(--incl)) translate(${-nodo12.x}px, ${-nodo12.y + 80}px)`;
            });
        """)
        time.sleep(1.5)
        p2 = os.path.join(ARTIFACTS_DIR, f"{prefix}_02_bifurcacao.png")
        driver.save_screenshot(p2)
        print("Salvo 02 (Bifurcação):", p2)

        # Foto 3: Hub Central (Casa 33) com mostrador e texto nítidos
        driver.execute_script("""
            const modal = document.querySelector('#modal-bifurcacao');
            if (modal) modal.classList.remove('ativo');

            import('./js/state.js').then(st => {
                st.state.set({ posicao: 33 });
                const grafo = st.state.get().grafoTabuleiro;
                const nodo33 = grafo.casas.find(c => c.id === 33);
                const plano = document.querySelector('#tabuleiro-3d');
                plano.style.transform = `rotateX(var(--incl)) translate(${-nodo33.x}px, ${-nodo33.y + 80}px)`;
            });
        """)
        time.sleep(1.5)
        p3 = os.path.join(ARTIFACTS_DIR, f"{prefix}_03_hub.png")
        driver.save_screenshot(p3)
        print("Salvo 03 (Hub Central):", p3)

        # Foto 4: Checkpoint 2 (Casa 40)
        driver.execute_script("""
            import('./js/state.js').then(st => {
                st.state.set({ posicao: 40 });
                const grafo = st.state.get().grafoTabuleiro;
                const nodo40 = grafo.casas.find(c => c.id === 40);
                const plano = document.querySelector('#tabuleiro-3d');
                plano.style.transform = `rotateX(var(--incl)) translate(${-nodo40.x}px, ${-nodo40.y + 80}px)`;
            });
        """)
        time.sleep(1.5)
        p4 = os.path.join(ARTIFACTS_DIR, f"{prefix}_04_checkpoint.png")
        driver.save_screenshot(p4)
        print("Salvo 04 (Checkpoint):", p4)

        # Foto 5: "Ver tabuleiro todo" ativo (placa inteira enquadrada, sem cortes)
        driver.execute_script("""
            const btnVisao = document.querySelector('#btn-visao-geral');
            if (btnVisao) btnVisao.click();
        """)
        time.sleep(1.2) # Durante a animação de zoom geral
        p5 = os.path.join(ARTIFACTS_DIR, f"{prefix}_05_ver_tabuleiro_todo.png")
        driver.save_screenshot(p5)
        print("Salvo 05 (Ver Tabuleiro Todo):", p5)

    finally:
        driver.quit()

if __name__ == "__main__":
    capture_editor()
    capture_resolution(1920, 1080, "1920x1080")
    capture_resolution(1366, 768, "1366x768")
    print("\nTODAS AS CAPTURAS CONCLUÍDAS COM SUCESSO!")
