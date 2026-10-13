import Graph from "graphology";

let betweennessCache: Record<string, number> | null = null;
let lastGraphRef: Graph | null = null;

function calcularClusteringNativo(graph: Graph, nodeId: string): number {
    const neighbors = graph.neighbors(nodeId);
    const k = neighbors.length;
    if (k < 2) return 0;

    let linksEntreVizinhos = 0;
    for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
            if (graph.hasEdge(neighbors[i], neighbors[j]) || graph.hasEdge(neighbors[j], neighbors[i])) {
                linksEntreVizinhos++;
            }
        }
    }
    const maxLinks = (k * (k - 1)) / 2;
    return maxLinks === 0 ? 0 : linksEntreVizinhos / maxLinks;
}

function calcularBetweennessNativo(graph: Graph): Record<string, number> {
    const nodes = graph.nodes();
    const centrality: Record<string, number> = {};
    nodes.forEach(n => centrality[n] = 0);

    nodes.forEach(s => {
        const stack: string[] = [];
        const predecessors: Record<string, string[]> = {};
        const sigma: Record<string, number> = {};
        const dist: Record<string, number> = {};
        
        nodes.forEach(w => {
            predecessors[w] = [];
            sigma[w] = 0;
            dist[w] = -1;
        });

        sigma[s] = 1;
        dist[s] = 0;
        const queue: string[] = [s];

        while (queue.length > 0) {
            const v = queue.shift()!;
            stack.push(v);

            graph.forEachNeighbor(v, w => {
                // Descobrimento de w po r v
                if (dist[w] < 0) {
                    queue.push(w);
                    dist[w] = dist[v] + 1;
                }
                // Caminho mais curto via v?
                if (dist[w] === dist[v] + 1) {
                    sigma[w] += sigma[v];
                    predecessors[w].push(v);
                }
            });
        }

        const delta: Record<string, number> = {};
        nodes.forEach(node => delta[node] = 0);

        while (stack.length > 0) {
            const w = stack.pop()!;
            predecessors[w].forEach(v => {
                delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
            });
            if (w !== s) {
                centrality[w] += delta[w];
            }
        }
    });

    const n = nodes.length;
    const scale = n > 2 ? 1 / ((n - 1) * (n - 2)) : 1;
    nodes.forEach(node => {
        centrality[node] = centrality[node] * scale;
    });

    return centrality;
}

export function calcularEPreencherMedidasLocal(graph: Graph, deputadoId: string, ano: string, containerDiv: HTMLElement) {
    try {
        if (!graph.hasNode(deputadoId)) {
            throw new Error("Deputado não encontrado no grafo.");
        }

        containerDiv.innerHTML = `<p style="padding: 20px;">Calculando topologia da rede...</p>`;

        const grau = graph.degree(deputadoId);

        const clustering = calcularClusteringNativo(graph, deputadoId);

        if (lastGraphRef !== graph || !betweennessCache) {
            containerDiv.innerHTML = `<p style="padding: 20px; color: #e67e22;">Processando centralidade da rede de ${ano}...</p>`;
            
            setTimeout(() => {
                try {
                    betweennessCache = calcularBetweennessNativo(graph);
                    lastGraphRef = graph;
                    
                    const betweenness = betweennessCache[deputadoId] || 0;
                    renderizarHTML(containerDiv, grau, clustering, betweenness, ano);
                } catch (err) {
                    console.error(err);
                    mostrarErro(containerDiv);
                }
            }, 50);
            return;
        }
        
        const betweenness = betweennessCache[deputadoId] || 0;
        renderizarHTML(containerDiv, grau, clustering, betweenness, ano);

    } catch (erro) {
        console.error("Erro ao calcular medidas topológicas:", erro);
        mostrarErro(containerDiv);
    }
}

function renderizarHTML(containerDiv: HTMLElement, grau: number, clustering: number, betweenness: number, ano: string) {
    containerDiv.innerHTML = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
            <h3 style="margin-top: 0; color: #2c3e50; font-size: 18px; border-bottom: 2px solid #3498db; padding-bottom: 8px; display: inline-block;">
                Métricas Topológicas na Rede
            </h3>
            
            <div style="margin-top: 15px; font-size: 16px;">
                <p style="margin-bottom: 12px; display: flex; align-items: center;">
                    <strong style="width: 250px; color: #34495e;">Grau (Conexões Diretas):</strong> 
                    <span style="background: #e1f0fa; color: #2980b9; padding: 4px 10px; border-radius: 12px; font-weight: bold;">
                        ${grau}
                    </span>
                </p>
                
                <p style="margin-bottom: 12px; display: flex; align-items: center;">
                    <strong style="width: 250px; color: #34495e;">Coeficiente de Clustering:</strong> 
                    <span style="background: #e1f0fa; color: #2980b9; padding: 4px 10px; border-radius: 12px; font-weight: bold;">
                        ${clustering.toFixed(4)}
                    </span>
                </p>
                
                <p style="margin-bottom: 12px; display: flex; align-items: center;">
                    <strong style="width: 250px; color: #34495e;">Centralidade (Betweenness):</strong> 
                    <span style="background: #e1f0fa; color: #2980b9; padding: 4px 10px; border-radius: 12px; font-weight: bold;">
                        ${betweenness.toFixed(4)}
                    </span>
                </p>
            </div>
            
            <p style="margin-top: 20px; font-size: 13px; color: #7f8c8d; font-style: italic;">
                * Métricas topológicas calculadas localmente sobre a estrutura do grafo de ${ano}.
            </p>
        </div>
    `;
}

function mostrarErro(containerDiv: HTMLElement) {
    containerDiv.innerHTML = `
        <div style="padding: 20px; background: #fff3f3; border-left: 4px solid #e74c3c; border-radius: 4px;">
            <p style="color: #c0392b; font-weight: bold; margin: 0;">Erro ao calcular medidas.</p>
            <p style="color: #7f8c8d; font-size: 14px; margin-top: 5px;">Não foi possível processar a topologia deste nó.</p>
        </div>
    `;
}

export interface MedidasNo {
    grau: number;
    clustering: number;
    betweenness: number;
}

export function calcularMedidasTodos(graph: Graph): Record<string, MedidasNo> {
    if (lastGraphRef !== graph || !betweennessCache) {
        betweennessCache = calcularBetweennessNativo(graph);
        lastGraphRef = graph;
    }
    const cache = betweennessCache;

    const resultado: Record<string, MedidasNo> = {};
    graph.forEachNode((id) => {
        resultado[id] = {
            grau: graph.degree(id),
            clustering: calcularClusteringNativo(graph, id),
            betweenness: cache[id] || 0,
        };
    });
    return resultado;
}