import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { NodeData, LinkData } from "./graph/types";
import { getColorByComunidade, PARTIDO_COLOR_PALETTE } from "./utils/colors";

// Variável para armazenar o mapa de discursos em memória
let mapaDiscursos: Record<string, string> = {};

let sigmaRenderer: Sigma | null = null;
let grafo: Graph | null = null;

const container = document.getElementById("container");
if (!container) throw new Error("Elemento #container não encontrado.");

async function exibirModalDiscursos(nomePolitico: string, nomeArquivo: string) {
  // ... (código do modal permanece o mesmo)
  // Cria o overlay de fundo
  const overlay = document.createElement("div");
  overlay.id = "modal-overlay";
  Object.assign(overlay.style, {
    position: "fixed", top: "0", left: "0",
    width: "100%", height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: "1000",
    display: "flex", alignItems: "center", justifyContent: "center",
  });

  // Cria o container do modal
  const modal = document.createElement("div");
  Object.assign(modal.style, {
    background: "white", padding: "20px",
    borderRadius: "8px", width: "80%",
    maxWidth: "700px", maxHeight: "90vh",
    overflowY: "auto", position: "relative",
  });

  // Adiciona título e botão de fechar
  modal.innerHTML = `
    <h2 style="margin-top: 0;">Discursos de ${nomePolitico}</h2>
    <button id="modal-close" style="position: absolute; top: 10px; right: 10px; font-size: 20px; border: none; background: transparent; cursor: pointer;">&times;</button>
    <div id="discursos-content"><p>Carregando...</p></div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Função para fechar o modal
  const fecharModal = () => document.body.removeChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fecharModal();
  });
  (modal.querySelector("#modal-close") as HTMLElement).onclick = fecharModal;

  // Busca e exibe os discursos
  try {
    // Assumindo que os arquivos de discursos estão na pasta /public/discursos/
    const response = await fetch(`/discursos/${nomeArquivo}`);
    if (!response.ok) throw new Error(`Não foi possível encontrar o arquivo: ${nomeArquivo}`);
    
    const politicoData = await response.json();
    const discursos = politicoData.discursos; // Acessa a lista de discursos dentro do objeto principal

    const contentDiv = modal.querySelector("#discursos-content") as HTMLElement;

    if (Array.isArray(discursos) && discursos.length > 0) {
      // Limpa o "Carregando..."
      contentDiv.innerHTML = "";
      // Itera sobre a lista de discursos encontrada
      discursos.forEach((discurso: any) => {
        const discursoEl = document.createElement("div");
        discursoEl.style.borderBottom = "1px solid #eee";
        discursoEl.style.padding = "10px 0";
        discursoEl.style.marginBottom = "10px";
        
        // Formata a data para melhor visualização
        const dataFormatada = new Date(discurso.dataHoraInicio).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });

        // Monta o HTML com os dados corretos do JSON
        discursoEl.innerHTML = `
          <p><strong>Data:</strong> ${dataFormatada}</p>
          <p><strong>Tipo do Discurso:</strong> ${discurso.tipoDiscurso || 'Não informado'}</p>
          <p><strong>Sumário:</strong> ${discurso.sumario || 'Não informado'}</p>
          ${discurso.urlTexto ? `<a href="${discurso.urlTexto}" target="_blank" rel="noopener noreferrer">Ler íntegra no Diário da Câmara</a>` : ''}
        `;
        contentDiv.appendChild(discursoEl);
      });
    } else {
      contentDiv.innerHTML = "<p>Nenhum discurso encontrado.</p>";
    }

  } catch (error) {
    console.error("Erro ao carregar discursos:", error);
    const contentDiv = modal.querySelector("#discursos-content") as HTMLElement;
    contentDiv.innerHTML = `<p style="color: red;">Ocorreu um erro ao carregar os discursos.</p>`;
  }
}

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

  const partidoColors: Record<string, string> = {};
  // A paleta de cores foi removida daqui
  let colorIndex = 0;

  jsonData.nodes.forEach((node: NodeData) => {
    if (!partidoColors[node.partido]) {
      // Agora usa a constante importada
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

  // ... (todo o resto do código para criar UI, slider, etc., permanece o mesmo por enquanto)
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
let indiceAnoAtual = 0; // Moved this line up to be available for the event listener
const anos = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];
resetButton.addEventListener("click", () => {
  const anoAtual = anos[indiceAnoAtual];
  carregarGrafo(anoAtual);
});
document.body.appendChild(resetButton);

const sliderContainer = document.createElement("div");
sliderContainer.style.position = "absolute";
sliderContainer.style.bottom = "10px";
sliderContainer.style.left = "10px";
sliderContainer.style.zIndex = "10";
sliderContainer.style.display = "flex";
sliderContainer.style.flexDirection = "column";
sliderContainer.style.background = "white";
sliderContainer.style.padding = "6px 10px";
sliderContainer.style.border = "1px solid #ccc";
sliderContainer.style.borderRadius = "8px";
sliderContainer.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
sliderContainer.style.minWidth = "150px";

const linhaAno = document.createElement("div");
linhaAno.style.display = "flex";
linhaAno.style.alignItems = "center";
linhaAno.style.gap = "8px";
linhaAno.style.marginBottom = "8px";
linhaAno.style.width = "130px";

const labelAno = document.createElement("span");
labelAno.textContent = "Ano:";
labelAno.style.fontWeight = "bold";

const inputAno = document.createElement("input");
inputAno.type = "number";
inputAno.min = "2017";
inputAno.max = "2024";
inputAno.value = anos[indiceAnoAtual];
inputAno.style.width = "100px";
inputAno.style.padding = "3px 5px";
inputAno.style.border = "1px solid #ccc";
inputAno.style.borderRadius = "4px";
(inputAno.style as any).mozAppearance = "textfield";
(inputAno.style as any).webkitAppearance = "none";

linhaAno.appendChild(labelAno);
linhaAno.appendChild(inputAno);
sliderContainer.appendChild(linhaAno);

const slider = document.createElement("input");
slider.type = "range";
slider.min = "0";
slider.max = (anos.length - 1).toString();
slider.value = indiceAnoAtual.toString();
slider.step = "1";
slider.style.width = "130px";
slider.style.pointerEvents = "none"; 
slider.style.opacity = "0.5";
slider.style.marginBottom = "8px";
sliderContainer.appendChild(slider);

const botoesContainer = document.createElement("div");
botoesContainer.style.display = "flex";
botoesContainer.style.gap = "8px";
botoesContainer.style.justifyContent = "center";
botoesContainer.style.width = "130px";

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

function atualizarAno(novoIndice: number) {
  if (novoIndice < 0 || novoIndice >= anos.length) return;
  indiceAnoAtual = novoIndice;
  const anoSelecionado = anos[indiceAnoAtual];
  inputAno.value = anoSelecionado;
  slider.value = novoIndice.toString();
  carregarGrafo(anoSelecionado);
}

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

async function iniciarAplicacao() {
  await carregarMapeamento();
  carregarGrafo("2017");
}

iniciarAplicacao();