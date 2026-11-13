import sys
import os
import time
sys.stdout.reconfigure(encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

ARTIFACTS_DIR = r"C:\Users\rafaelscarpille\.gemini\antigravity\brain\c1092d29-8b81-4512-96ab-2ee9d58c0818"

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1600,1050')

driver = webdriver.Chrome(options=opts)
try:
    # 1. Print do editor-tabuleiro.html
    driver.get('http://localhost:8080/editor-tabuleiro.html')
    time.sleep(1.5)
    
    path_editor = os.path.join(ARTIFACTS_DIR, "validacao_editor_vista_de_cima.png")
    driver.save_screenshot(path_editor)
    print(f"Screenshot do editor salvo: {path_editor}")

    # 2. Print da cena 2.5D no modo Mesa
    driver.get('http://localhost:8080/index.html')
    time.sleep(1.0)
    btn_conv = driver.find_element(By.ID, 'btn-jogar-convidado')
    btn_conv.click()
    time.sleep(1.5)

    path_mesa = os.path.join(ARTIFACTS_DIR, "validacao_cena_2_5d_modo_mesa.png")
    driver.save_screenshot(path_mesa)
    print(f"Screenshot da cena 2.5D modo Mesa salvo: {path_mesa}")

finally:
    driver.quit()
