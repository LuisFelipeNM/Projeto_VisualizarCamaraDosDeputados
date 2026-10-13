import Graph from "graphology";
import { calcularMedidasTodos, MedidasNo } from "./measures-panel";

interface NodeData { id: string | number; }
interface LinkData { source: string | number; target: string | number; concordancia: number; }

export async function buscarMetricasDoAno(ano: number | string): Promise<Record<string, MedidasNo>> {
    const response = await fetch(`http://localhost:3000/api/grafo/${ano}`);
    if (!response.ok) throw new Error(`Erro HTTP ${response.status} ao buscar o grafo de ${ano}`);

    const jsonData: { nodes: NodeData[]; links: LinkData[] } = await response.json();

    const graph = new Graph();

    jsonData.nodes.forEach((node) => {
        graph.addNode(String(node.id));
    });

    jsonData.links.forEach((link) => {
        graph.addEdge(String(link.source), String(link.target), {
            weight: link.concordancia,
        });
    });

    return calcularMedidasTodos(graph);
}