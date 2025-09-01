import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { NodeData, LinkData } from "./graph/types";
import { getColorByComunidade, PARTIDO_COLOR_PALETTE } from "./utils/colors";
import { exibirModalDiscursos } from "./ui/speech-viewer";
import { createYearSlider } from "./ui/year-slider";
import { createSearchBar } from "./ui/search-bar";

// ... (código inicial inalterado) ...
let mapaDiscursos: Record<string, string> = {};
let sigmaRenderer: Sigma | null = null;
let grafo: Graph | null = null;
const container = document.getElementById("container");
if (!container) throw new Error("Elemento #container não encontrado.");
const anos = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];
let indiceAnoAtual = 0;
// ... (funções carregarMapeamento e carregarGrafo inalteradas) ...

async function carregarMapeamento() {
  try {
    const response = await fetch('/mapeamento_discursos.json');
    if (!response.ok) throw new Error('Falha ao carregar mapa de discursos');
    mapaDiscursos = await response.json();
    console.log("Mapa de discursos carregado com sucesso.");
  } catch (error) {
    console.error("Não foi possível carregar o arquivo de mapeamento:", error);
    alert("Atenção: A funcionalidade de exibir discursos pode não funcionar.");
  }
}

async function carregarGrafo(ano: string) {
  indiceAnoAtual = anos.indexOf(ano);

  try {
    const response = await fetch(`/${ano}.json`);;
    const texto = await response.text();
    if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
    const jsonData = JSON.parse(texto);
    construirGrafo(jsonData);
  } catch (err) {
    console.error("Erro ao carregar grafo:", err);
  }
}


function construirGrafo(jsonData: { nodes: NodeData[]; links: LinkData[] }) {
  if (sigmaRenderer) sigmaRenderer.kill();
  if (grafo) grafo.clear();

  const idsParaRemover = [
    "buscaInput", "comunidadeContainer", "partidoCheckbox", "partidoLabel",
    "toggleMenuPartidos", "menuPartidos"
  ];
  idsParaRemover.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  const graph = new Graph();
  grafo = graph;

  // ... (lógica de criação de cores e nós inalterada) ...
  const partidoColors: Record<string, string> = {};
  let colorIndex = 0;

  jsonData.nodes.forEach((node: NodeData) => {
    if (!partidoColors[node.partido]) {
      partidoColors[node.partido] = PARTIDO_COLOR_PALETTE[colorIndex++ % PARTIDO_COLOR_PALETTE.length];
    }
  });

  jsonData.nodes.forEach((node) => {
    graph.addNode(node.id, {
      label: node.nome,
      partido: node.partido,
      x: (Math.random() - 0.5) * 5000,
      y: (Math.random() - 0.5) * 5000,
      size: 4,
      color: getColorByComunidade(node.comunidade),
      comunidade: node.comunidade,
      hidden: false
    });
  });

  jsonData.links.forEach((link) => {
    graph.addEdge(link.source, link.target, {
      size: link.concordancia * 2,
      color: "rgba(0, 0, 0, 0.08)",
    });
  });

  // ... (lógica do forceAtlas2 e Sigma inalterada) ...
  const fa2Settings = forceAtlas2.inferSettings(graph);
  fa2Settings.scalingRatio = 30;
  fa2Settings.barnesHutOptimize = true;
  fa2Settings.linLogMode = false;
  fa2Settings.outboundAttractionDistribution = true;
  fa2Settings.gravity = 0;
  fa2Settings.edgeWeightInfluence = 0;
  forceAtlas2.assign(graph, { ...fa2Settings, iterations: 1000 });

  sigmaRenderer = new Sigma(graph, container as HTMLElement);

  sigmaRenderer.on("clickNode", ({ node }) => {
    const attrs = graph.getNodeAttributes(node);
    const nomePolitico = attrs.label.toUpperCase();
    const nomeArquivo = mapaDiscursos[nomePolitico];
    
    if (nomeArquivo) {
      exibirModalDiscursos(attrs.label, nomeArquivo);
    } else {
      console.log(`Nenhum arquivo de discurso encontrado no mapa para: ${attrs.label}`);
    }
  });


  // ================================================================
  // A CRIAÇÃO DOS COMPONENTES DE UI COMEÇA A SER CENTRALIZADA AQUI
  // ================================================================
  
  // O código da barra de busca foi REMOVIDO daqui.
  
  createSearchBar(graph); // <-- CHAMADA PARA O NOVO COMPONENTE

  // ================================================================


  //Filtro de comunidades (ainda será movido)
  const communityContainer = document.createElement("div");
  communityContainer.id = "comunidadeContainer";
  communityContainer.style.position = "absolute";
  communityContainer.style.top = "10px";
  communityContainer.style.right = "150px";
  communityContainer.style.zIndex = "10";
  document.body.appendChild(communityContainer);

  const communityButton = document.createElement("button");
  communityButton.textContent = "Comunidades";
  communityButton.style.padding = "5px 10px";
  communityContainer.appendChild(communityButton);

  const communityOptions = document.createElement("div");
  communityOptions.style.display = "none";
  communityOptions.style.position = "absolute";
  communityOptions.style.background = "white";
  communityOptions.style.border = "1px solid black";
  communityOptions.style.padding = "5px";
  communityButton.style.minWidth = "145px";
  communityContainer.appendChild(communityOptions);

  communityButton.addEventListener("click", () => {
    communityOptions.style.display = communityOptions.style.display === "none" ? "block" : "none";
  });

  const communities = Array.from(new Set(jsonData.nodes.map(n => n.comunidade)));
  const communityCheckboxes: Record<string, HTMLInputElement> = {};

  communities.forEach((comunidade) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = comunidade.toString();
    checkbox.checked = true;
    communityCheckboxes[comunidade.toString()] = checkbox;

    checkbox.addEventListener("change", () => {
      const selected = Object.entries(communityCheckboxes)
        .filter(([_, cb]) => cb.checked)
        .map(([k]) => parseInt(k));
      graph.forEachNode((node, attrs) => {
        graph.setNodeAttribute(node, "hidden", !selected.includes(attrs.comunidade));
      });
    });

    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";
    label.style.padding = "2px 5px";
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(`Comunidade ${comunidade}`));
    communityOptions.appendChild(label);
  });

  //Toggle de cor por partido (ainda será movido)
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "partidoCheckbox";
  checkbox.style.position = "absolute";
  checkbox.style.top = "40px";
  checkbox.style.left = "10px";
  checkbox.style.zIndex = "10";

  const label = document.createElement("label");
  label.htmlFor = "partidoCheckbox";
  label.id = "partidoLabel";
  label.textContent = "Veja por partidos";
  label.style.position = "absolute";
  label.style.top = "40px";
  label.style.left = "30px";
  label.style.zIndex = "10";

  document.body.appendChild(checkbox);
  document.body.appendChild(label);

  checkbox.addEventListener("change", () => {
    graph.forEachNode((node, attrs) => {
      const cor = checkbox.checked
        ? partidoColors[attrs.partido]
        : getColorByComunidade(attrs.comunidade);
      graph.setNodeAttribute(node, "color", cor);
    });
  });

  //Menu de partidos (ainda será movido)
  const toggleMenu = document.createElement("button");
  toggleMenu.id = "toggleMenuPartidos";
  toggleMenu.textContent = "Mostrar Partidos";
  toggleMenu.style.position = "absolute";
  toggleMenu.style.top = "70px";
  toggleMenu.style.left = "10px";
  toggleMenu.style.zIndex = "10";
  document.body.appendChild(toggleMenu);

  const partidoMenu = document.createElement("div");
  partidoMenu.id = "menuPartidos";
  partidoMenu.style.position = "absolute";
  partidoMenu.style.top = "100px";
  partidoMenu.style.left = "10px";
  partidoMenu.style.zIndex = "10";
  partidoMenu.style.padding = "5px";
  partidoMenu.style.border = "1px solid black";
  partidoMenu.style.display = "none";
  partidoMenu.style.background = "white";
  document.body.appendChild(partidoMenu);

  toggleMenu.onclick = () => {
    partidoMenu.style.display = partidoMenu.style.display === "none" ? "block" : "none";
  };

  for (const partido in partidoColors) {
    if (partidoColors.hasOwnProperty(partido)) {
      const color = partidoColors[partido];
      const partidoItem = document.createElement("div");
      partidoItem.style.display = "flex";
      partidoItem.style.alignItems = "center";
      partidoItem.innerHTML = `<span style="width: 15px; height: 15px; background: ${color}; display: inline-block; margin-right: 5px;"></span> ${partido}`;
      partidoMenu.appendChild(partidoItem);
    }
  }
}

//Botão de reset (inalterado)
const resetButton = document.createElement("button");
resetButton.textContent = "Recriar";
resetButton.style.position = "absolute";
resetButton.style.top = "10px";
resetButton.style.right = "10px";
resetButton.style.padding = "5px 10px";
resetButton.style.zIndex = "10";
resetButton.addEventListener("click", () => {
  const anoAtual = anos[indiceAnoAtual];
  carregarGrafo(anoAtual);
});
document.body.appendChild(resetButton);

// Função de inicialização (inalterada)
async function iniciarAplicacao() {
  await carregarMapeamento();
  createYearSlider(carregarGrafo); 
  carregarGrafo("2017");
}

iniciarAplicacao();