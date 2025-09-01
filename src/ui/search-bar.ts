import Graph from "graphology";

/**
 * Cria e anexa a barra de busca de nós ao corpo do documento.
 * @param graph - A instância do grafo do Graphology a ser filtrada.
 */
export function createSearchBar(graph: Graph): void {
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
      // Considera se o nó está visível (não escondido por outro filtro)
      const isVisible = !attrs.hidden;

      if (!query || attrs.label.toLowerCase().includes(query)) {
        // Aumenta o tamanho se corresponder à busca e estiver visível
        if (isVisible) {
          graph.setNodeAttribute(node, "size", query ? 10 : 5);
        }
      } else {
        // Retorna ao tamanho normal se não corresponder e estiver visível
        if (isVisible) {
          graph.setNodeAttribute(node, "size", 5);
        }
      }
    });
  });
}