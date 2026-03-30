# Visualizador da Câmara dos Deputados

O **Visualizador da Câmara dos Deputados** é um projeto focado na exploração visual e interativa dos discursos e conexões políticas. Desenvolvido em **TypeScript** e utilizando a biblioteca **Sigma.js**, o projeto renderiza grafos de rede para mapear, filtrar e analisar o cenário político brasileiro de forma dinâmica. 

O ecossistema do projeto também conta com scripts em Python para a ingestão e estruturação dos dados, e um servidor Node.js leve para fornecer essas informações do banco de dados MySQL diretamente para a interface de visualização.

## Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:
* [Node.js](https://nodejs.org/) (Versão 18 ou superior)
* [Python](https://www.python.org/) (Versão 3.10 ou superior)
* [MySQL Server e Workbench](https://dev.mysql.com/downloads/)

---

## Como configurar o projeto localmente

Siga o passo a passo abaixo para configurar o banco de dados, as dependências e inicializar a aplicação.

### Passo 1: Configuração do Banco de Dados
O projeto utiliza um banco de dados MySQL chamado `camara_deputados`. Um arquivo de exportação já foi providenciado para facilitar a criação.

1. Abra o **MySQL Workbench** (ou outro gerenciador de sua escolha).
2. Importe o arquivo de dump localizado na pasta `sql/` do projeto. 
   *(Isso criará automaticamente o banco `camara_deputados`, as tabelas necessárias e os dados iniciais).*

### Passo 2: Variáveis de Ambiente (`.env`)
Tanto o Node.js quanto o Python precisam das suas credenciais do banco de dados para funcionar. 

Na **raiz do projeto**, crie um arquivo chamado **`.env`** (com o ponto no início e sem extensão) e adicione o seguinte conteúdo, substituindo pela sua senha do MySQL:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=camara_deputados
```

### Passo 3: Configuração do Python (Script de Ingestão)
O script Python (`ingestao.py`) utiliza um ambiente virtual isolado para não conflitar com outras dependências do seu sistema.

1. Abra o terminal na raiz do projeto e crie o ambiente virtual:
   ```bash
   python -m venv visualizar_camara
   ```
2. Ative o ambiente virtual:
   * **Windows:** `visualizar_camara\Scripts\activate`
   * **Linux/macOS:** `source visualizar_camara/bin/activate`
3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
*(Nota: O script de ingestão pode ser rodado manualmente com `python ingestao.py` quando for necessário atualizar os dados).*

### Passo 4: Configuração do Node.js (Backend e Frontend)
As dependências do JavaScript são gerenciadas pelo npm.

1. No terminal, na raiz do projeto, instale as dependências:
   ```bash
   npm install
   ```

---

## Rodando a Aplicação

Para facilitar, criamos scripts de automação que iniciam o Servidor (Backend) e o Frontend (Vite) simultaneamente.

### No Windows
Basta dar um duplo clique no arquivo **`iniciar.bat`** localizado na raiz do projeto, ou rodar no terminal:
```bash
.\iniciar.bat
```
*O script abrirá o servidor Node em segundo plano e iniciará o Frontend na sua janela atual, abrindo o navegador automaticamente.*

### No Linux / macOS
Basta utilizar o script `iniciar.sh` que já está na raiz do projeto. No terminal, execute:
```bash
# Dê permissão de execução (apenas na primeira vez)
chmod +x iniciar.sh

# Execute o script
./iniciar.sh
```

---

### Encerrando a aplicação
* **Windows:** Feche a janela do terminal onde o frontend está rodando e feche o terminal minimizado do "Backend Node".
* **Linux / macOS:** Pressione `Ctrl+C` no terminal onde o script está rodando (o script está configurado para encerrar o backend automaticamente junto com o frontend).
