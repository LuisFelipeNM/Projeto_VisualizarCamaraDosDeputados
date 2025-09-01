import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { NodeData, LinkData } from "./types";
import { getColorByComunidade, PARTIDO_COLOR_PALETTE } from "../utils/colors";
import { exibirModalDiscursos } from "../ui/speech-viewer";
import { createYearSlider } from "../ui/year-slider";
import { createSearchBar } from "../ui/search-bar";
import { createCommunityFilter } from "../ui/community-filter";
import { createPartyControls } from "../ui/party-controls";
import { createResetButton } from "../ui/reset-button";

// Estado da aplicação
let mapaDiscursos: Record<string, string> = {};
let sigmaRenderer: Sigma | null = null;
let grafo: Graph | null = null;
const container = document.getElementById("container");
const anos = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];
let indiceAnoAtual = 0;

function construirGrafo(jsonData: { nodes: NodeData[]; links: LinkData[] }) {
  if (!container) return;
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

  createSearchBar(graph);
  createCommunityFilter(graph, jsonData.nodes);
  createPartyControls(graph, partidoColors);
}

async function carregarGrafo(ano: string) {
  indiceAnoAtual = anos.indexOf(ano);
  try {
    const response = await fetch(`/${ano}.json`);
    const texto = await response.text();
    if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
    const jsonData = JSON.parse(texto);
    construirGrafo(jsonData);
  } catch (err) {
    console.error("Erro ao carregar grafo:", err);
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

/**
 * Função principal que inicia a aplicação.
 * É a única função exportada por este módulo.
 */
export async function iniciarAplicacao() {
  if (!container) {
    console.error("Elemento #container não foi encontrado no DOM.");
    return;
  }
  
  await carregarMapeamento();

  createYearSlider(carregarGrafo); 
  createResetButton(() => {
    const anoAtual = anos[indiceAnoAtual];
    carregarGrafo(anoAtual);
  });

  carregarGrafo("2017");
}