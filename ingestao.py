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
    
    cursor.execute("CREATE TABLE IF NOT EXISTS deputados (id VARCHAR(100) PRIMARY KEY, nome VARCHAR(255) NOT NULL, INDEX idx_nome (nome))")
    cursor.execute("CREATE TABLE IF NOT EXISTS anos_atuacao (id_deputado VARCHAR(100), ano INT, partido VARCHAR(20), uf CHAR(2), strength DOUBLE, comunidade INT, PRIMARY KEY (id_deputado, ano), FOREIGN KEY (id_deputado) REFERENCES deputados(id))")
    cursor.execute("CREATE TABLE IF NOT EXISTS links (id_link INT AUTO_INCREMENT PRIMARY KEY, ano INT, source_id VARCHAR(100), target_id VARCHAR(100), concordancia DOUBLE, probability DOUBLE, FOREIGN KEY (source_id) REFERENCES deputados(id), FOREIGN KEY (target_id) REFERENCES deputados(id))")
    
    # MODIFICAÇÃO 1: Removida a linha do nome_arquivo
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS discursos (
            id_discurso INT AUTO_INCREMENT PRIMARY KEY, 
            id_deputado VARCHAR(100), 
            ano INT, 
            conteudo LONGTEXT, 
            resumo LONGTEXT, 
            FOREIGN KEY (id_deputado) REFERENCES deputados(id)
        )
    """)
    conn.commit()
    cursor.close()
    conn.close()

def processar_dados():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    public_path = 'public'
    
    # 1. PROCESSAR GRAFOS
    arquivos_grafos = [f for f in os.listdir(public_path) if f.endswith('.json') and f[0].isdigit()]
    for file in arquivos_grafos:
        ano = file.replace('.json', '')
        print(f"-> Sincronizando Grafo {ano}...")
        cursor.execute("DELETE FROM links WHERE ano = %s", (ano,))
        with open(os.path.join(public_path, file), 'r', encoding='utf-8') as f:
            data = json.load(f)
            for node in data.get('nodes', []):
                cursor.execute("INSERT IGNORE INTO deputados (id, nome) VALUES (%s, %s)", (node['id'], node['nome']))
                cursor.execute("INSERT IGNORE INTO anos_atuacao (id_deputado, ano, partido, uf, strength, comunidade) VALUES (%s, %s, %s, %s, %s, %s)", (node['id'], ano, node['partido'], node['uf'], node['strength'], node.get('community', node.get('comunidade', 0))))
            for link in data.get('links', []):
                cursor.execute("INSERT INTO links (ano, source_id, target_id, concordancia, probability) VALUES (%s, %s, %s, %s, %s)", (ano, link['source'], link['target'], link['concordancia'], link['probability']))
    
    conn.commit()

    # 2. PROCESSAR DISCURSOS
    discursos_path = os.path.join(public_path, 'discursos')
    resumos_path = os.path.join(public_path, 'resumos')

    if os.path.exists(discursos_path):
        print(f"-> Analisando arquivos de discursos em {discursos_path}...")
        
        if not conn.is_connected():
            conn.reconnect()
            cursor = conn.cursor()

        for disc_file in os.listdir(discursos_path):
            if disc_file.startswith('_') or not disc_file.endswith('.json'):
                continue

            try:
                ano_extraido = disc_file.split('-')[0]
                dep_id = disc_file.split('_')[-1].split('.')[0].strip()
                
                if not dep_id.isdigit(): continue

                with open(os.path.join(discursos_path, disc_file), 'r', encoding='utf-8') as f:
                    conteudo = json.dumps(json.load(f), ensure_ascii=False)

                resumo_texto = None
                nome_resumo_txt = os.path.splitext(disc_file)[0] + ".txt"
                path_resumo = os.path.join(resumos_path, ano_extraido, nome_resumo_txt)

                if os.path.exists(path_resumo):
                    with open(path_resumo, 'r', encoding='utf-8') as f:
                        resumo_texto = f.read().strip()
                
                # MODIFICAÇÃO 2: Removido nome_arquivo do SQL e dos valores
                sql = "INSERT IGNORE INTO discursos (id_deputado, ano, conteudo, resumo) VALUES (%s, %s, %s, %s)"
                cursor.execute(sql, (dep_id, ano_extraido, conteudo, resumo_texto))
                
                conn.commit()

            except Exception as e:
                print(f"   [!] Erro no arquivo {disc_file}: {e}")
                if "MySQL Server has gone away" in str(e):
                    conn.reconnect()
                    cursor = conn.cursor()

    cursor.close()
    conn.close()
    print("\n[OK] Sincronização finalizada!")

if __name__ == "__main__":
    setup_database()
    processar_dados()