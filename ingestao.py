import os
import json
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD'), 
    'database': os.getenv('DB_NAME', 'camara_deputados')
}

def setup_database():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    # Criamos com VARCHAR(100) para evitar qualquer erro de tamanho futuro
    cursor.execute("CREATE TABLE IF NOT EXISTS deputados (id VARCHAR(100) PRIMARY KEY, nome VARCHAR(255) NOT NULL, INDEX idx_nome (nome))")
    cursor.execute("CREATE TABLE IF NOT EXISTS anos_atuacao (id_deputado VARCHAR(100), ano INT, partido VARCHAR(20), uf CHAR(2), strength DOUBLE, comunidade INT, PRIMARY KEY (id_deputado, ano), FOREIGN KEY (id_deputado) REFERENCES deputados(id))")
    cursor.execute("CREATE TABLE IF NOT EXISTS links (id_link INT AUTO_INCREMENT PRIMARY KEY, ano INT, source_id VARCHAR(100), target_id VARCHAR(100), concordancia DOUBLE, probability DOUBLE, FOREIGN KEY (source_id) REFERENCES deputados(id), FOREIGN KEY (target_id) REFERENCES deputados(id))")
    cursor.execute("CREATE TABLE IF NOT EXISTS discursos (id_discurso INT AUTO_INCREMENT PRIMARY KEY, id_deputado VARCHAR(100), ano INT, conteudo LONGTEXT, nome_arquivo VARCHAR(255), FOREIGN KEY (id_deputado) REFERENCES deputados(id))")
    conn.commit()
    cursor.close()
    conn.close()

def processar_dados():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    public_path = 'public'
    
    # 1. PROCESSAR JSONs
    for file in [f for f in os.listdir(public_path) if f.endswith('.json')]:
        ano = file.replace('.json', '')
        print(f"-> Importando grafo de {ano}...")
        with open(os.path.join(public_path, file), 'r', encoding='utf-8') as f:
            data = json.load(f)
            for node in data.get('nodes', []):
                cursor.execute("INSERT IGNORE INTO deputados (id, nome) VALUES (%s, %s)", (node['id'], node['nome']))
                cursor.execute("INSERT IGNORE INTO anos_atuacao (id_deputado, ano, partido, uf, strength, comunidade) VALUES (%s, %s, %s, %s, %s, %s)", (node['id'], ano, node['partido'], node['uf'], node['strength'], node['community'] if 'community' in node else node.get('comunidade', 0)))
            for link in data.get('links', []):
                cursor.execute("INSERT INTO links (ano, source_id, target_id, concordancia, probability) VALUES (%s, %s, %s, %s, %s)", (ano, link['source'], link['target'], link['concordancia'], link['probability']))

    # 2. PROCESSAR DISCURSOS (COM VALIDAÇÃO DE ID)
    discursos_base = os.path.join(public_path, 'discursos')
    if os.path.exists(discursos_base):
        for ano_pasta in os.listdir(discursos_base):
            caminho_ano = os.path.join(discursos_base, ano_pasta)
            if os.path.isdir(caminho_ano):
                print(f"-> Analisando discursos de {ano_pasta}...")
                for txt_file in os.listdir(caminho_ano):
                    if not txt_file.endswith('.txt'): continue
                    
                    # Extrai o ID (ex: 73433)
                    dep_id = txt_file.split('_')[-1].replace('.txt', '').strip()
                    
                    # VALIDAÇÃO: Se o ID não for numérico (ex: "AVANTE"), ignoramos o arquivo
                    if not dep_id.isdigit():
                        print(f"   [PULADO] Arquivo inválido ignorado: {txt_file}")
                        continue

                    with open(os.path.join(caminho_ano, txt_file), 'r', encoding='utf-8') as f:
                        conteudo = f.read()
                        cursor.execute("INSERT IGNORE INTO deputados (id, nome) VALUES (%s, %s)", (dep_id, f"Deputado {dep_id}"))
                        cursor.execute("INSERT INTO discursos (id_deputado, ano, conteudo, nome_arquivo) VALUES (%s, %s, %s, %s)", (dep_id, ano_pasta, conteudo, txt_file))

    conn.commit()
    cursor.close()
    conn.close()
    print("\n[OK] Tudo pronto, Luís! Banco de dados populado.")

if __name__ == "__main__":
    setup_database()
    processar_dados()