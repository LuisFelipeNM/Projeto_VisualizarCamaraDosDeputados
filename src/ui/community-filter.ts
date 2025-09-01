// src/ui/community-filter.ts
import Graph from "graphology";
import { NodeData } from "../graph/types";

/**
 * Cria e anexa o filtro de comunidades ao corpo do documento.
 * @param graph - A instância do grafo do Graphology.
 * @param nodes - A lista de nós para extrair as comunidades existentes.
 */
export function createCommunityFilter(graph: Graph, nodes: NodeData[]): void {
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
  communityButton.style.minWidth = "145px";
  communityContainer.appendChild(communityButton);

  const communityOptions = document.createElement("div");
  communityOptions.style.display = "none";
  communityOptions.style.position = "absolute";
  communityOptions.style.background = "white";
  communityOptions.style.border = "1px solid black";
  communityOptions.style.padding = "5px";
  communityContainer.appendChild(communityOptions);

  communityButton.addEventListener("click", () => {
    communityOptions.style.display = communityOptions.style.display === "none" ? "block" : "none";
  });

  const communities = Array.from(new Set(nodes.map(n => n.comunidade)));
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
}