import sys
import os
import time
import json
sys.stdout.reconfigure(encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

ARTIFACTS_DIR = r"C:\Users\rafaelscarpille\.gemini\antigravity\brain\c1092d29-8b81-4512-96ab-2ee9d58c0818"

RESOLUTIONS = [
    {"name": "1366x768", "width": 1366, "height": 768, "tipo": "desktop"},
    {"name": "1920x1080", "width": 1920, "height": 1080, "tipo": "desktop"},
    {"name": "390x844", "width": 390, "height": 844, "tipo": "mobile"}
]

def lidar_com_modais(driver):
    """Fecha qualquer modal pendente (carta, checkpoint, bifurcacao, hub)"""
    # 1. Modal Carta
    try:
        modal_carta = driver.find_elements(By.CSS_SELECTOR, "#modal-carta-global.ativo")
        if modal_carta and modal_carta[0].is_displayed():
            opcoes = driver.find_elements(By.CSS_SELECTOR, ".btn-opcao-carta")
            for op in opcoes:
                if op.is_displayed() and op.is_enabled():
                    try:
                        driver.execute_script("arguments[0].click();", op)
                        time.sleep(0.3)
                        break
                    except Exception:
                        pass
            btn_cont = driver.find_element(By.ID, "btn-carta-continuar")
            if btn_cont.is_displayed():
                driver.execute_script("arguments[0].click();", btn_cont)
                time.sleep(0.4)
    except Exception:
        pass

    # 2. Modal bifurcacao
    try:
        bifs = driver.find_elements(By.CSS_SELECTOR, "#modal-bifurcacao.ativo .btn-opcao-bifurcacao")
        if bifs and bifs[0].is_displayed():
            driver.execute_script("arguments[0].click();", bifs[0])
            time.sleep(0.4)
    except Exception:
        pass

    # 3. Modal checkpoint
    try:
        cp_btn = driver.find_element(By.ID, "btn-fechar-checkpoint")
        if cp_btn.is_displayed():
            driver.execute_script("arguments[0].click();", cp_btn)
            time.sleep(0.4)
    except Exception:
        pass

    # 4. Modal hub
    try:
        hub_btn = driver.find_element(By.ID, "btn-fechar-hub")
        if hub_btn.is_displayed():
            driver.execute_script("arguments[0].click();", hub_btn)
            time.sleep(0.4)
    except Exception:
        pass

def rolar_dado_uma_vez(driver):
    """Rola o dado e aguarda animacao completa"""
    lidar_com_modais(driver)
    
    # Aguarda botao rolar ficar habilitado
    for _ in range(25):
        lidar_com_modais(driver)
        btn_rolar = driver.find_element(By.ID, "btn-rolar-dado")
        if btn_rolar.is_enabled() and btn_rolar.is_displayed():
            break
        time.sleep(0.3)

    btn_rolar = driver.find_element(By.ID, "btn-rolar-dado")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn_rolar)
    time.sleep(0.2)
    driver.execute_script("arguments[0].click();", btn_rolar)
    
    # Aguarda movimento e animacoes
    time.sleep(3.0)
    lidar_com_modais(driver)
    time.sleep(0.5)

resultados_todos = {}

for res in RESOLUTIONS:
    w = res["width"]
    h = res["height"]
    name = res["name"]
    print(f"\n==========================================")
    print(f"Testando Resolução: {name} ({res['tipo']})")
    print(f"==========================================")

    opts = Options()
    opts.add_argument('--headless=new')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-gpu')
    opts.add_argument(f'--window-size={w},{h}')
    if res["tipo"] == "mobile":
        opts.add_argument('--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1')

    driver = webdriver.Chrome(options=opts)
    try:
        driver.set_window_size(w, h)
        driver.get('http://localhost:8080/index.html')
        time.sleep(1.0)

        # Clica em 'Jogar como convidado'
        btn_conv = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.ID, "btn-jogar-convidado"))
        )
        btn_conv.click()
        time.sleep(1.2)

        # Medição 1: Casa 0 (Início)
        medicao_casa0 = driver.execute_script("return window.verificarEnquadramento();")
        print(f"[{name}] Medição Casa 0:", json.dumps(medicao_casa0, indent=2))
        
        path_casa0 = os.path.join(ARTIFACTS_DIR, f"enquadramento_{name}_01_casa0.png")
        driver.save_screenshot(path_casa0)
        print(f"Screenshot salvo: {path_casa0}")

        # Realiza 5 rolagens do dado
        print(f"[{name}] Realizando 5 rolagens do dado...")
        for r_i in range(1, 6):
            try:
                rolar_dado_uma_vez(driver)
                pos = driver.execute_script("return (window._lastVerificacaoEnquadramento && window._lastVerificacaoEnquadramento.posicao) !== undefined ? window._lastVerificacaoEnquadramento.posicao : (window.state ? window.state.get().posicao : null);")
                print(f"   Rolagem {r_i}/5 concluída. Posição atual: {pos}")
            except Exception as e_rol:
                print(f"   Aviso na rolagem {r_i}: {e_rol}")
                lidar_com_modais(driver)

        time.sleep(1.2)
        lidar_com_modais(driver)
        time.sleep(0.5)

        # Medição 2: Após 5 rolagens
        medicao_apos5 = driver.execute_script("return window.verificarEnquadramento();")
        print(f"[{name}] Medição Após 5 rolagens:", json.dumps(medicao_apos5, indent=2))

        path_apos5 = os.path.join(ARTIFACTS_DIR, f"enquadramento_{name}_02_apos5.png")
        driver.save_screenshot(path_apos5)
        print(f"Screenshot salvo: {path_apos5}")

        resultados_todos[name] = {
            "casa0": medicao_casa0,
            "apos5": medicao_apos5,
            "screenshot_casa0": path_casa0,
            "screenshot_apos5": path_apos5
        }

    finally:
        driver.quit()

# Grava JSON com todos os resultados
with open(os.path.join(ARTIFACTS_DIR, "resultados_enquadramento.json"), "w", encoding="utf-8") as f:
    json.dump(resultados_todos, f, indent=2, ensure_ascii=False)

print("\n\n==========================================")
print("RESUMO COMPLETO DOS RESULTADOS")
print("==========================================")
for k, v in resultados_todos.items():
    print(f"\n--- {k} ---")
    c0 = v["casa0"]
    a5 = v["apos5"]
    if c0:
        if c0["modo"] == "mesa":
            print(f"Casa 0 (Mesa): margens E={c0['margem_esquerda']}px D={c0['margem_direita']}px (diff: {c0['diffHorizontalPx']}px, {c0['diffHorizontalPct']}%), T={c0['margem_topo']}px B={c0['margem_base']}px (diff: {c0['diffVerticalPx']}px, {c0['diffVerticalPct']}%) -> Passou? {c0['passou']}")
        else:
            print(f"Casa 0 (Seguir): dist={c0['distanciaPx']}px ({c0['distanciaPct']}%) -> Passou? {c0['passou']}")
    if a5:
        if a5["modo"] == "mesa":
            print(f"Após 5 (Mesa): margens E={a5['margem_esquerda']}px D={a5['margem_direita']}px (diff: {a5['diffHorizontalPx']}px, {a5['diffHorizontalPct']}%), T={a5['margem_topo']}px B={a5['margem_base']}px (diff: {a5['diffVerticalPx']}px, {a5['diffVerticalPct']}%) -> Passou? {a5['passou']}")
        else:
            print(f"Após 5 (Seguir): dist={a5['distanciaPx']}px ({a5['distanciaPct']}%) -> Passou? {a5['passou']}")
