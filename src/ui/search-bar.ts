import Graph from "graphology";

export function createSearchBar(onSearch: (query: string) => void): void {
  const searchInput = document.createElement("input");
  searchInput.id = "buscaInput";
  searchInput.type = "text";
  searchInput.placeholder = "Buscar por nome...";
  
  searchInput.style.position = "absolute";
  searchInput.style.top = "10px";
  searchInput.style.left = "10px";
  searchInput.style.zIndex = "10";
  searchInput.style.padding = "8px";
  searchInput.style.borderRadius = "4px";
  searchInput.style.border = "1px solid #ccc";
  searchInput.style.width = "200px";

  document.body.appendChild(searchInput);

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    onSearch(query);
  });
}