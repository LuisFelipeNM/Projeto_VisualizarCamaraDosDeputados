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

let mapaDiscursos: Record<string, string> = {};
let sigmaRenderer: Sigma | null = null;
let grafo: Graph | null = null;
const container = document.getElementById("container");
const anos = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"];
let indiceAnoAtual = 0;

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
			weight: link.concordancia,
			color: "rgba(0, 0, 0, 0.08)",
		});
	});

	const fa2Settings = forceAtlas2.inferSettings(graph);
	fa2Settings.scalingRatio = 30;
	fa2Settings.barnesHutOptimize = true;
	fa2Settings.linLogMode = false;
	fa2Settings.outboundAttractionDistribution = true;
	fa2Settings.gravity = 0;
	fa2Settings.edgeWeightInfluence = 1;
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
				res.label = "";
				res.zIndex = 0;
			}
		}
		return res;
	});

	sigmaRenderer.on("clickNode", ({ node }) => {
		const attrs = graph.getNodeAttributes(node);
		
		const idPolitico = node; 
        
		const anoAtual = anos[indiceAnoAtual]; 

		if (idPolitico && anoAtual) {
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

		const response = await fetch(`http://localhost:3000/api/grafo/${ano}`);
		
		if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);

		const jsonData = await response.json();
		
		construirGrafo(jsonData);
	} catch (err) {
		console.error("Erro ao carregar grafo da API:", err);
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