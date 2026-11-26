import json
import os
import random
import time
from typing import Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import mysql.connector
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "camara_deputados")

if not GOOGLE_API_KEY:
    raise RuntimeError("Erro: a variável GOOGLE_API_KEY não foi encontrada no .env.")

client = genai.Client(
    api_key=GOOGLE_API_KEY,
    http_options=types.HttpOptions(timeout=60_000),
)

MODEL_NAME = "gemini-3.5-flash-lite"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RequestCalculo(BaseModel):
    ano: int
    modo_agrupamento: str
    selecao: str
    metricas_grafo: Optional[Dict[str, Dict[str, float]]] = None

COLUNAS_TABELA = ["deputado", "partido", "gpd", "grau", "clustering", "betweenness"]

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=DB_HOST, user=DB_USER, password=DB_PASSWORD, database=DB_NAME
        )
        cursor = conn.cursor()
        cursor.execute("SET SESSION group_concat_max_len = 16777216")
        cursor.close()
        return conn
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro MySQL: {err}")

def _tentar_modelo(model_name, prompt, max_tentativas, espera_inicial):
    for tentativa in range(max_tentativas):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                ),
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"[{model_name}] tentativa {tentativa + 1}/{max_tentativas} falhou: {type(e).__name__}: {e}", flush=True)
            if tentativa == max_tentativas - 1:
                return None
            time.sleep(espera_inicial * (2 ** tentativa) + random.uniform(0, 1))
    return None

def call_gemini_with_retry(prompt, max_tentativas=5, espera_inicial=2):
    resultado = _tentar_modelo(MODEL_NAME, prompt, max_tentativas, espera_inicial)
    if resultado is None:
        raise HTTPException(status_code=503, detail=f"Modelo {MODEL_NAME} indisponível após {max_tentativas} tentativas.")
    return resultado

def extrair_topicos_base(resumo_texto):
    prompt = f"""
Atue como um cientista político.

Você receberá o RESUMO COMPLETO de uma comunidade ou partido.

Sua tarefa é extrair os principais tópicos políticos presentes
nesse resumo em duas categorias:

1. pontos favoráveis
2. críticas

IMPORTANTE:
- Os tópicos devem representar ideias políticas concretas presentes no resumo.
- Não invente tópicos que não estejam relacionados ao conteúdo.
- Não use informações externas ao resumo.
- Não misture vários assuntos completamente diferentes em um único tópico.
- Preserve a distinção entre pontos favoráveis e críticas.
- Gere tópicos suficientemente específicos para que, posteriormente, seja possível procurar evidências desses tópicos no resumo de um deputado.
- Não gere explicações longas.
- Cada item deve ser um tópico curto e identificável.

Retorne EXCLUSIVAMENTE JSON válido neste formato:
{{
  "favoraveis": ["topico 1", "topico 2"],
  "criticas": ["critica 1", "critica 2"]
}}

RESUMO DA COMUNIDADE/PARTIDO:
{resumo_texto}
"""
    return call_gemini_with_retry(prompt)

def avaliar_resumo_deputado(nome_deputado, texto_resumo, base_favoraveis, base_criticas):
    agenda_favoraveis = json.dumps(base_favoraveis, ensure_ascii=False, indent=2)
    agenda_criticas = json.dumps(base_criticas, ensure_ascii=False, indent=2)
    
    prompt = f"""
Atue como um cientista político realizando uma análise sistemática de aderência discursiva.

Você receberá:
1. Uma lista de PONTOS FAVORÁVEIS extraída do resumo de uma comunidade/partido.
2. Uma lista de CRÍTICAS extraída do resumo da mesma comunidade/partido.
3. Um RESUMO de um deputado.

Sua tarefa é verificar quais tópicos da agenda estão efetivamente presentes no resumo do deputado.

REGRA PRINCIPAL:
Você DEVE analisar TODOS os tópicos individualmente. Não selecione apenas os tópicos mais evidentes. Faça mentalmente a seguinte verificação para todos os pontos favoráveis e críticas antes de produzir o JSON:
Ponto X → há evidência?

REGRAS DE INTERPRETAÇÃO:
1. O tópico NÃO precisa aparecer literalmente no texto.
2. Entretanto, não faça associações excessivamente genéricas.
3. Deve existir uma ideia concreta no resumo que sustente a relação com o tópico.
4. Não use conhecimento externo sobre o deputado nem invente citações.
5. Toda citação deve ser um trecho EXATAMENTE presente no resumo fornecido (não altere, corrija ou resuma).
6. Um mesmo resumo pode conter vários tópicos. Continue verificando todos.
7. Uma mesma frase pode servir como evidência para mais de um tópico quando houver relação real.
8. Se o mesmo tópico aparecer em mais de uma parte do resumo, inclua todas as evidências relevantes sem duplicar o tópico.
9. Não confunda a simples menção a uma palavra com aderência ao tópico.

RESUMO DO DEPUTADO:
Nome: {nome_deputado}
Texto: {texto_resumo}

AGENDA FAVORÁVEL:
{agenda_favoraveis}

AGENDA DE CRÍTICAS:
{agenda_criticas}

FORMATO OBRIGATÓRIO:
Retorne EXCLUSIVAMENTE JSON válido no formato exato abaixo, usando os nomes exatos dos tópicos da agenda:
{{
  "favoraveis_encontrados": [
    {{
      "topico": "nome EXATO do tópico da agenda",
      "citacoes": ["trecho EXATO do resumo"]
    }}
  ],
  "criticas_encontradas": [
    {{
      "topico": "nome EXATO da crítica da agenda",
      "citacoes": ["trecho EXATO do resumo"]
    }}
  ]
}}
"""
    return call_gemini_with_retry(prompt)

@app.get("/api/filtros")
def get_filtros():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT DISTINCT ano FROM discursos ORDER BY ano DESC")
        anos = [r["ano"] for r in cursor.fetchall()]
        cursor.execute("SELECT DISTINCT comunidade FROM resumos_comunidades ORDER BY comunidade")
        comunidades = [r["comunidade"] for r in cursor.fetchall()]
        cursor.execute("SELECT DISTINCT partido FROM resumos_partidos ORDER BY partido")
        partidos = [r["partido"] for r in cursor.fetchall()]
        return {"anos": anos or [2020, 2021, 2022], "comunidades": comunidades, "partidos": partidos}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/calcular")
def calcular_metricas(req: RequestCalculo):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        tabela = "resumos_comunidades" if req.modo_agrupamento == "Comunidade" else "resumos_partidos"
        coluna = "comunidade" if req.modo_agrupamento == "Comunidade" else "partido"
        
        cursor.execute(f"SELECT resumo FROM {tabela} WHERE {coluna} = %s AND ano = %s LIMIT 1", (req.selecao, req.ano))
        resultado_resumo = cursor.fetchone()
        if not resultado_resumo: raise HTTPException(status_code=404, detail="Resumo base não encontrado.")
            
        resumo_base = resultado_resumo["resumo"]
        
        query = f"""
            SELECT d.id, d.nome, a.partido, GROUP_CONCAT(ds.resumo SEPARATOR '\\n\\n') AS texto_resumo
            FROM deputados d
            JOIN anos_atuacao a ON d.id = a.id_deputado
            JOIN discursos ds ON d.id = ds.id_deputado
            WHERE a.{coluna} = %s AND a.ano = %s AND ds.ano = %s AND ds.resumo IS NOT NULL AND TRIM(ds.resumo) <> ''
            GROUP BY d.id, d.nome, a.partido
        """
        cursor.execute(query, (req.selecao, req.ano, req.ano))
        dados_deputados = cursor.fetchall()
        
        if not dados_deputados: raise HTTPException(status_code=404, detail="Nenhum discurso encontrado.")

        base_estruturada = extrair_topicos_base(resumo_base)
        favoraveis, criticas = base_estruturada.get("favoraveis", []), base_estruturada.get("criticas", [])
        total_fav, total_crit = len(favoraveis), len(criticas)
        
        metricas_grafo = req.metricas_grafo or {}
        resultados_finais, evidencias = [], {}
        
        for dep in dados_deputados:
            texto = dep["texto_resumo"] or ""
            print(f"Analisando discursos de: {dep['nome']} ({len(texto)} caracteres)...", flush=True)
            if not texto.strip(): continue
            try:
                analise = avaliar_resumo_deputado(dep["nome"], texto, favoraveis, criticas)
                fav_enc = {item.get("topico") for item in analise.get("favoraveis_encontrados", []) if item.get("topico")}
                crit_enc = {item.get("topico") for item in analise.get("criticas_encontradas", []) if item.get("topico")}
                
                taxa_f = len(fav_enc) / total_fav if total_fav > 0 else 0
                taxa_c = len(crit_enc) / total_crit if total_crit > 0 else 0
                gpd = ((taxa_f + taxa_c) / 2) * 100

                m = metricas_grafo.get(str(dep["id"]), {})
                
                resultados_finais.append({
                    "deputado": dep["nome"],
                    "partido": dep["partido"],
                    "gpd": round(gpd, 2),
                    "grau": m.get("grau"),
                    "clustering": round(m["clustering"], 4) if "clustering" in m else None,
                    "betweenness": round(m["betweenness"], 4) if "betweenness" in m else None,
                })
                evidencias[dep["nome"]] = analise
            except Exception as e:
                print(f"Falha em {dep['nome']}: {type(e).__name__}: {e}", flush=True)
                continue
                
        df = pd.DataFrame(resultados_finais, columns=COLUNAS_TABELA).sort_values(by="gpd", ascending=False)
        media = df["gpd"].mean() if not df.empty else 0

        df_json = df.astype(object).where(pd.notnull(df), None)
        
        return {
            "metricas_gerais": {
                "aderencia_media": round(media, 1),
                "raio_discursivo": round(100 - media, 1),
                "lider": df.iloc[0]["deputado"] if not df.empty else "N/A",
                "borda": df.iloc[-1]["deputado"] if not df.empty else "N/A"
            },
            "tabela": df_json.to_dict(orient="records"),
            "citacoes": evidencias
        }
    finally:
        cursor.close()
        conn.close()