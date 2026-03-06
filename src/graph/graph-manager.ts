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

//Application state
let mapaDiscursos: Record<string, string> = {};
let sigmaRenderer: Sigma | null = null;
let grafo: Graph | null = null;
const container = document.getElementById("container");
const anos = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];
let indiceAnoAtual = 0;

//Search state
let searchQuery = "";
let hoveredNode: string | null = null;

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

	sigmaRenderer.setSetting("nodeReducer", (node, data) => {
		const res = { ...data };

		if (searchQuery) {
			if (node === hoveredNode) {
				res.highlighted = true;
				res.size = 10;
				res.zIndex = 10;

			} else {
				//res.color = "#E0E0E0";
				res.label = "";
				res.zIndex = 0;
				//res.size = 4;
			}
		}
		return res;
	});

	sigmaRenderer.on("clickNode", ({ node }) => {
		const attrs = graph.getNodeAttributes(node);
		
		// Pega o ID do político (o 'node' geralmente é o ID no Graphology, 
        // mas se o ID estiver em attrs.id, use attrs.id)
		const idPolitico = node; 
        
        // Pega o ano atual do array global usando o índice
		const anoAtual = anos[indiceAnoAtual]; 

		if (idPolitico && anoAtual) {
            // Nova chamada passando Nome, ID e Ano
			exibirModalDiscursos(attrs.label, idPolitico, anoAtual);
		} else {
			console.error("Dados insuficientes para carregar discursos.");
		}
	});

	createSearchBar((query) => {
		searchQuery = query;
		hoveredNode = null;

		if (query) {
			const matches = graph.filterNodes((node, attrs) =>
				!attrs.hidden && attrs.label.toLowerCase().includes(query)
			);

			if (matches.length > 0) {
				matches.sort((a, b) => {
					const labelA = graph.getNodeAttribute(a, "label").toLowerCase();
					const labelB = graph.getNodeAttribute(b, "label").toLowerCase();

					const startsA = labelA.startsWith(query);
					const startsB = labelB.startsWith(query);

					if (startsA && !startsB) return -1;
					if (!startsA && startsB) return 1;

					return labelA.localeCompare(labelB);
				});

				const bestMatch = matches[0];
				hoveredNode = bestMatch;
			}
		}

		if (sigmaRenderer) sigmaRenderer.refresh();

	});

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

export async function iniciarAplicacao() {
	if (!container) {
		console.error("Elemento #container não foi encontrado no DOM.");
		return;
	}


	createYearSlider(carregarGrafo);
	createResetButton(() => {
		const anoAtual = anos[indiceAnoAtual];
		carregarGrafo(anoAtual);
	});

	carregarGrafo("2017");
}