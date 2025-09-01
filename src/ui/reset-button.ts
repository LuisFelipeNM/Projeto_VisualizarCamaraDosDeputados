/**
 * Cria o botão para recarregar/recriar o grafo.
 * @param onClick A função a ser executada quando o botão é clicado.
 */
export function createResetButton(onClick: () => void): void {
  const resetButton = document.createElement("button");
  resetButton.textContent = "Recriar";
  resetButton.style.position = "absolute";
  resetButton.style.top = "10px";
  resetButton.style.right = "10px";
  resetButton.style.padding = "5px 10px";
  resetButton.style.zIndex = "10";
  resetButton.addEventListener("click", onClick);
  document.body.appendChild(resetButton);
}