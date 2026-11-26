# Visualizador da Câmara dos Deputados

Sistema interativo de análise visual e computacional de redes de votação parlamentar e discursos na Câmara dos Deputados do Brasil. Desenvolvido no âmbito de projeto de Iniciação Científica (FAPESP, Processo 2025/16194-6 - Departamento de Computação, UFSCar), o ecossistema integra modelagem de grafos ponderados, detecção de comunidades por consenso, sumarização hierárquica via Modelos de Linguagem (LLMs) e métricas de pertinência discursiva.

---

## Visão Geral e Arquitetura

A plataforma organiza-se em duas camadas principais integradas por um banco de dados relacional MySQL (`camara_deputados`):

1. **Pipeline de Processamento e Modelagem (Linux / Python):**
   - **Extração e Ingestão:** Coleta de registros cadastrais, votações nominais, votos individuais e transcrições de discursos via API de Dados Abertos da Câmara dos Deputados (baseado no extrator disponível em [votacoes-Deputados-VINI](https://github.com/Interfaces-UFSCAR/votacoes-Deputados-VINI.git)).
   - **Redes Complexas:** Construção de grafos não direcionados e ponderados pelo índice de concordância de votos utilizando `NetworkX`, detecção de comunidades via Propagação de Rótulos Assíncrona (LPA) com protocolo de consenso ($N = 1000$ execuções alinhadas pelo índice de Jaccard) e extração de métricas topológicas locais (grau, coeficiente de *clustering* local e centralidade *betweenness*).
   - **Sumarização Hierárquica e Avaliação Discursiva:** Geração de perfis discursivos em árvore binária recursiva (por parlamentar, partido e comunidade) utilizando `meta-llama/Llama-3.2-3B-Instruct`, acompanhada pelo cálculo do Grau de Pertinência Discursiva (GPD) com avaliação automatizada via `gemini-3.5-flash-lite`.

2. **Aplicação Web Interativa (Multiplataforma: Linux e Windows):**
   - **Backend:** Servidor em Node.js responsável por consultar o banco MySQL e servir os grafos processados, métricas topológicas e resumos consolidados.
   - **Frontend:** Interface desenvolvida em TypeScript e React utilizando `Graphology`, `Sigma.js` e o algoritmo de disposição espacial `ForceAtlas2` para exploração temporal, filtragem por partido ou comunidade, busca nominal e inspeção conjunta de métricas de rede e sínteses discursivas.

---

## Compatibilidade de Ambiente

- **Pipeline completo (Extração, Processamento de Grafos, Sumarização LLM, Backend e Frontend):** Projetado e validado integralmente em ambiente **Linux**.
- **Interface Visual Principal (Banco de Dados MySQL, Servidor Node.js e Frontend Web):** Compatível com **Linux** e **Windows** mediante importação do dump pré-processado.

---

## Pré-requisitos

Certifique-se de possuir instalados os seguintes componentes:

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [MySQL Server](https://dev.mysql.com/downloads/) (versão 8.0 ou superior) e cliente gerenciador (ex.: MySQL Workbench)
- [Python](https://www.python.org/) (versão 3.10 ou superior — necessário para execução do pipeline de dados e modelagem em Linux)
- GPU compatível com CUDA (recomendado para execução acelerada em meia precisão `fp16` da etapa de sumarização com LLMs; o pipeline dispõe de contingência automática em CPU)

---

## Configuração do Projeto

### 1. Clonar o Repositório

```bash
git clone https://github.com/LuisFelipeNM/Projeto_VisualizarCamaraDosDeputados.git
cd Projeto_VisualizarCamaraDosDeputados
```

### 2. Configuração do Banco de Dados (`camara_deputados`)

1. Abra o **MySQL Workbench** ou utilize o cliente de linha de comando do MySQL.
2. Importe o arquivo de dump SQL localizado no diretório `sql/` do repositório. Este procedimento criará automaticamente o esquema `camara_deputados`, suas tabelas relacionais e os dados pré-processados (redes, comunidades, métricas topológicas e resumos consolidados).

### 3. Variáveis de Ambiente (`.env`)

Na raiz do projeto, crie um arquivo `.env` contendo as credenciais de acesso ao banco de dados e, caso execute a etapa de avaliação automatizada do GPD, a chave da API do Google Gemini:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=camara_deputados

# Opcional: necessário apenas para executar a avaliação automatizada do GPD em Python
GEMINI_API_KEY=sua_chave_api_aqui
```

### 4. Configuração do Ambiente Python (Linux — Pipeline de Dados e LLMs)

Caso deseje executar os scripts de ingestão, geração das redes, detecção de comunidades ou sumarização hierárquica em ambiente Linux:

```bash
# Crie e ative o ambiente virtual
python3 -m venv visualizar_camara
source visualizar_camara/bin/activate

# Instale as dependências
pip install -r requirements.txt
```

Para executar a ingestão e atualização dos dados no banco relacional:

```bash
python ingestao.py
```

*(Para detalhes adicionais sobre a arquitetura do coletor de dados da Câmara dos Deputados, consulte o repositório original do extrator: [https://github.com/Interfaces-UFSCAR/votacoes-Deputados-VINI.git](https://github.com/Interfaces-UFSCAR/votacoes-Deputados-VINI.git)).*

### 5. Configuração do Node.js (Backend e Frontend)

Na raiz do projeto, instale as dependências da aplicação web:

```bash
npm install
```

---

## Execução da Aplicação Web

O repositório disponibiliza scripts de automação para inicializar simultaneamente o servidor backend (Node.js) e a interface frontend (Vite/React).

### Linux

Conceda permissão de execução ao script (apenas na primeira utilização) e inicie os serviços:

```bash
chmod +x iniciar.sh
./iniciar.sh
```

Para encerrar a aplicação no Linux, pressione `Ctrl + C` no terminal ativo (ambos os processos serão finalizados automaticamente).

### Windows (Interface Visual Principal)

Com o serviço do MySQL ativo e o banco `camara_deputados` devidamente importado, execute o script de inicialização pela interface gráfica (duplo clique) ou via terminal:

```bat
.\iniciar.bat
```

O script iniciará o servidor Node.js em segundo plano e abrirá o frontend no navegador padrão. Para encerrar a aplicação no Windows, feche a janela do terminal do frontend e a janela minimizada correspondente ao servidor backend.

---

## Referência Acadêmica

Projeto desenvolvido no Departamento de Computação da Universidade Federal de São Carlos (UFSCar), sob orientação do Prof. Dr. Alan Demétrius Baria Valejo, com apoio da Fundação de Amparo à Pesquisa do Estado de São Paulo (FAPESP — Processo 2025/16194-6).
