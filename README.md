# Portal de Análise de Cobertura Vacinal 🏥💉

> Laboratório 1 em Saúde Pública - MBA em Ciência de Dados e Inteligência Artificial da ENAP (Grupo 4)

## 📋 Índice

1. [Sobre o Projeto](#-sobre-o-projeto)
2. [Tecnologias Utilizadas](#-tecnologias-utilizadas)
3. [Estrutura do Projeto](#-estrutura-do-projeto)
4. [Como Funciona uma Aplicação Flask](#-como-funciona-uma-aplicação-flask)
5. [Instalação e Execução](#-instalação-e-execução)
6. [Funcionalidades](#-funcionalidades)
7. [API Endpoints](#-api-endpoints)
8. [Estrutura de Dados](#-estrutura-de-dados)
9. [Contribuidores](#-contribuidores)

## 🎯 Sobre o Projeto

O Portal de Análise de Cobertura Vacinal 2024 (faixa etária 5 anos) é uma aplicação web desenvolvida como parte do Laboratório 1 em Saúde Pública do MBA de Ciência de Dados e Inteligência Artificial da ENAP. Este projeto tem como objetivo fornecer uma ferramenta completa para visualização, análise e compreensão dos dados de cobertura vacinal no Brasil.

### Objetivos do Projeto

- Visualizar dados de cobertura vacinal de forma interativa e georreferenciada
- Analisar tendências e padrões na cobertura vacinal por região e tipologia municipal
- Identificar áreas prioritárias para intervenção
- Fornecer insights para tomada de decisão em saúde pública

## 🚀 Tecnologias Utilizadas

### Backend (Python)

- **Flask**: Framework web leve e flexível para Python
- **NumPy**: Biblioteca para computação numérica
- **Pandas**: Biblioteca para análise e manipulação de dados
- **SciPy**: Biblioteca para computação científica
- **JSON**: Formato de dados para comunicação entre frontend e backend

### Frontend (JavaScript/HTML/CSS)

- **Bootstrap**: Framework CSS para design responsivo
- **Leaflet.js**: Biblioteca para mapas interativos
- **Chart.js**: Biblioteca para criação de gráficos
- **Plotly**: Biblioteca para visualizações interativas
- **Marked**: Biblioteca para renderização de Markdown

## 🏗 Estrutura do Projeto

\`\`\`
projeto/
├── main.py # Arquivo principal da aplicação Flask
├── index.html # Interface do usuário
├── requirements.txt # Dependências do projeto
├── output.json # Dados de cobertura vacinal
└── README.md # Documentação do projeto
\`\`\`

## 🔄 Como Funciona uma Aplicação Flask

### O que é Flask?

Flask é um microframework web para Python, conhecido por sua simplicidade e flexibilidade. Diferente de frameworks mais robustos, o Flask fornece apenas o essencial, permitindo que os desenvolvedores escolham as ferramentas adicionais que desejam utilizar.

### Componentes Principais

1. **Rotas (Routes)**

   - Definem os endpoints da aplicação
   - Exemplo:
     \`\`\`python
     @app.route("/")
     def index():
     return send_from_directory(".", "index.html")
     \`\`\`

2. **Views (Visualizações)**

   - Funções que processam requisições e retornam respostas
   - Exemplo:
     \`\`\`python
     @app.route("/api/data")
     def get_data():
     try:
     data_path = os.path.join(os.path.dirname(**file**), "output.json")
     with open(data_path, "r", encoding="utf-8") as file:
     data = json.load(file)
     return jsonify(create_response(data))
     except Exception as e:
     return jsonify(create_response(None, str(e))), 500
     \`\`\`

3. **Models (Modelos)**
   - Representam a estrutura dos dados
   - Exemplo:
     \`\`\`python
     @dataclass
     class VaccineCoverage:
     municipio: str
     regiao: str
     tipo: str
     uf: str
     bcg: float # ... outros campos
     \`\`\`

### Fluxo de Dados

1. Cliente faz uma requisição HTTP
2. Flask roteia a requisição para a função apropriada
3. A função processa a requisição e acessa dados necessários
4. Flask retorna a resposta ao cliente

## 📥 Instalação e Execução

1. Clone o repositório:
   \`\`\`bash
   git clone [URL_DO_REPOSITORIO]
   cd [NOME_DO_DIRETORIO]
   \`\`\`

2. Crie um ambiente virtual:
   \`\`\`bash
   python -m venv venv
   \`\`\`

3. Ative o ambiente virtual:

   - Windows:
     \`\`\`bash
     venv\\Scripts\\activate
     \`\`\`
   - Linux/Mac:
     \`\`\`bash
     source venv/bin/activate
     \`\`\`

4. Instale as dependências:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

5. Execute a aplicação:
   \`\`\`bash
   python main.py
   \`\`\`

6. Acesse a aplicação em \`http://localhost:5000\`

## 💡 Funcionalidades

### 1. Dashboard Principal

- Indicadores gerais de cobertura vacinal
- Gráficos comparativos por região
- Análise por tipologia municipal
- Correlação entre UBS e cobertura

### 2. Mapa Georreferenciado

- Visualização espacial da cobertura
- Marcadores coloridos por município
- Informações detalhadas por localidade
- Análise de clusters

### 3. Análise de Dados

- Filtros por região e tipo de município
- Seleção de vacinas específicas
- Visualização de tendências
- Exportação de dados

## 🔌 API Endpoints

### Endpoints Principais

1. \`/api/data\`

   - Retorna todos os dados de cobertura vacinal

2. \`/api/regions\`

   - Lista todas as regiões disponíveis

3. \`/api/municipality_types\`

   - Lista todos os tipos de municípios

4. \`/api/vaccine_coverage\`
   - Retorna dados de cobertura com filtros

### Formato de Resposta

Todas as respostas seguem o formato:
\`\`\`json
{
"status": "success",
"data": [...],
"message": null,
"timestamp": "2024-..."
}
\`\`\`

## 📊 Estrutura de Dados

### Dados de Cobertura Vacinal

\`\`\`python
{
"municipio": "string",
"regiao": "string",
"tipo": "string",
"uf": "string",
"bcg": float,
"dtp": float,
"penta": float,
"polio": float,
"rotavirus": float,
"triplice_viral_1": float,
"triplice_viral_2": float,
"varicela": float,
"latitude": float,
"longitude": float,
"ubs_count": int,
"populacao": float
}
\`\`\`

## 👥 Contribuidores

Este projeto foi desenvolvido pelo Grupo 4 do MBA em Ciência de Dados e Inteligência Artificial da ENAP como parte do Laboratório 1 em Saúde Pública.

## 📝 Notas Adicionais

- A aplicação utiliza dados do arquivo output.json para análises
- Todas as visualizações são interativas e responsivas
- Os dados são atualizados em tempo real conforme os filtros são aplicados
- O sistema é otimizado para performance com grandes volumes de dados

Desenvolvido com ❤️ pelo Grupo 4 - MBA ENAP \_
