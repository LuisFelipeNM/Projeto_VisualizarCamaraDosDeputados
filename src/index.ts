import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";

// Interfaces
interface NodeData {
  id: string;
  nome: string;
  partido: string;
  strength: number;
  comunidade: number;
}

interface LinkData {
  source: string;
  target: string;
  concordancia: number;
}

function getColorByComunidade(comunidade: number): string {
  const colors = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0",
    "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000"
  ];
  return colors[comunidade % colors.length] || "gray";
}

let sigmaRenderer: Sigma | null = null;
let grafo: Graph | null = null;

const container = document.getElementById("container");
if (!container) throw new Error("Elemento #container não encontrado.");

async function carregarGrafo(ano: string) {
  try {
    const response = await fetch(`/${ano}.json`);
    const texto = await response.text();
    console.log(`Resposta do fetch para vinicius${ano}.json:`, texto);
    if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
    const jsonData = JSON.parse(texto);
    construirGrafo(jsonData);
  } catch (err) {
    console.error("Erro ao carregar grafo:", err);
  }
}

function construirGrafo(jsonData: { nodes: NodeData[]; links: LinkData[] }) {
  // Limpa visualizações anteriores
  if (sigmaRenderer) sigmaRenderer.kill();
  if (grafo) grafo.clear();

  //Remove menus antigos da DOM
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

  const partidoColors: Record<string, string> = {};
  const colorPalette = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0",
    "#bcf60c", "#fabebe", "#008080", "#e6beff", "#9a6324", "#fffac8",
    "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
  ];
  let colorIndex = 0;

  jsonData.nodes.forEach((node: NodeData) => {
    if (!partidoColors[node.partido]) {
      partidoColors[node.partido] = colorPalette[colorIndex++ % colorPalette.length];
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

  const fa2Settings = forceAtlas2.inferSettings(graph);
  fa2Settings.scalingRatio = 30;
  fa2Settings.barnesHutOptimize = true;
  fa2Settings.linLogMode = false;
  fa2Settings.outboundAttractionDistribution = true;
  fa2Settings.gravity = 0;
  fa2Settings.edgeWeightInfluence = 0;
  forceAtlas2.assign(graph, { ...fa2Settings, iterations: 1000 });

  sigmaRenderer = new Sigma(graph, container as HTMLElement);

  //Search bar
  const searchInput = document.createElement("input");
  searchInput.id = "buscaInput";
  searchInput.type = "text";
  searchInput.placeholder = "Buscar por nome...";
  searchInput.style.position = "absolute";
  searchInput.style.top = "10px";
  searchInput.style.left = "10px";
  searchInput.style.zIndex = "10";
  document.body.appendChild(searchInput);

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    graph.forEachNode((node, attrs) => {
      if (!query || attrs.label.toLowerCase().includes(query)) {
        graph.setNodeAttribute(node, "size", query ? 10 : 5);
        graph.setNodeAttribute(node, "highlighted", !!query);
      } else {
        graph.setNodeAttribute(node, "size", 5);
        graph.setNodeAttribute(node, "highlighted", false);
      }
    });
  });

  //Filtro de comunidades
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

  //Toggle de cor por partido
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

  //Menu de partidos
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

//Botão para recarregr o gráfico
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


const anos = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];
let indiceAnoAtual = 0;

const sliderContainer = document.createElement("div");
sliderContainer.style.position = "absolute";
sliderContainer.style.bottom = "10px";
sliderContainer.style.left = "10px";
sliderContainer.style.zIndex = "10";
sliderContainer.style.display = "flex";
sliderContainer.style.flexDirection = "column";
// REMOVIDO alignItems para não atrapalhar centralização dos botões
sliderContainer.style.background = "white";
sliderContainer.style.padding = "6px 10px";
sliderContainer.style.border = "1px solid #ccc";
sliderContainer.style.borderRadius = "8px";
sliderContainer.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
sliderContainer.style.minWidth = "150px";

// Container da label + input lado a lado (Ano:)
const linhaAno = document.createElement("div");
linhaAno.style.display = "flex";
linhaAno.style.alignItems = "center";
linhaAno.style.gap = "8px";
linhaAno.style.marginBottom = "8px";
// Força largura igual ao slider (mais fácil controlar alinhamento)
linhaAno.style.width = "130px";

const labelAno = document.createElement("span");
labelAno.textContent = "Ano:";
labelAno.style.fontWeight = "bold";

const inputAno = document.createElement("input");
inputAno.type = "number";
inputAno.min = "2017";
inputAno.max = "2024";
inputAno.value = anos[indiceAnoAtual];
//Define largura do input para que junto com o label a linha tenha 130px
inputAno.style.width = "100px";
inputAno.style.padding = "3px 5px";
inputAno.style.border = "1px solid #ccc";
inputAno.style.borderRadius = "4px";
//Remover aparência padrão em alguns navegadores
(inputAno.style as any).mozAppearance = "textfield";
(inputAno.style as any).webkitAppearance = "none";

linhaAno.appendChild(labelAno);
linhaAno.appendChild(inputAno);
sliderContainer.appendChild(linhaAno);

//Slider com largura igual à linhaAno
const slider = document.createElement("input");
slider.type = "range";
slider.min = "0";
slider.max = (anos.length - 1).toString();
slider.value = indiceAnoAtual.toString();
slider.step = "1";
slider.style.width = "130px";  // mesma largura da linhaAno
slider.style.pointerEvents = "none"; 
slider.style.opacity = "0.5";
slider.style.marginBottom = "8px";
sliderContainer.appendChild(slider);

// Container dos botões ◀ ▶ alinhados ao centro do slider
const botoesContainer = document.createElement("div");
botoesContainer.style.display = "flex";
botoesContainer.style.gap = "8px";
botoesContainer.style.justifyContent = "center"; // centraliza os botões horizontalmente
botoesContainer.style.width = "130px"; // mesma largura do slider e linhaAno

const botaoMenos = document.createElement("button");
botaoMenos.textContent = "◀";
botaoMenos.style.padding = "4px 8px";
botaoMenos.addEventListener("click", () => {
  atualizarAno(indiceAnoAtual - 1);
});

const botaoMais = document.createElement("button");
botaoMais.textContent = "▶";
botaoMais.style.padding = "4px 8px";
botaoMais.addEventListener("click", () => {
  atualizarAno(indiceAnoAtual + 1);
});

botoesContainer.appendChild(botaoMenos);
botoesContainer.appendChild(botaoMais);
sliderContainer.appendChild(botoesContainer);


//Função para atualizar ano
function atualizarAno(novoIndice: number) {
  if (novoIndice < 0 || novoIndice >= anos.length) return;
  indiceAnoAtual = novoIndice;
  const anoSelecionado = anos[indiceAnoAtual];
  inputAno.value = anoSelecionado;
  slider.value = novoIndice.toString();
  carregarGrafo(anoSelecionado);
}

//Validação inputAno
inputAno.addEventListener("change", () => {
  const valor = inputAno.value;
  const indice = anos.indexOf(valor);
  if (indice !== -1) {
    atualizarAno(indice);
  } else {
    alert("Ano inválido. Digite um ano entre 2017 e 2024.");
    inputAno.value = anos[indiceAnoAtual];
  }
});

document.body.appendChild(sliderContainer);

//Carrega grafo inicial
carregarGrafo("2017");
