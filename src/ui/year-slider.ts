const ANOS = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"];

/**
 * Cria e anexa o componente de slider de ano ao corpo do documento.
 * @param onYearChange - Uma função de callback que é chamada sempre que um novo ano é selecionado.
 */
export function createYearSlider(onYearChange: (ano: string) => void) {
  let indiceAnoAtual = 0;

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
  inputAno.value = ANOS[indiceAnoAtual];
  inputAno.style.width = "100px";
  inputAno.style.padding = "3px 5px";
  inputAno.style.border = "1px solid #ccc";
  inputAno.style.borderRadius = "4px";
  (inputAno.style as any).mozAppearance = "textfield";

  linhaAno.appendChild(labelAno);
  linhaAno.appendChild(inputAno);
  sliderContainer.appendChild(linhaAno);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = (ANOS.length - 1).toString();
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

  // Função interna para gerenciar a atualização do estado
  function atualizarAno(novoIndice: number) {
    if (novoIndice < 0 || novoIndice >= ANOS.length) return;
    indiceAnoAtual = novoIndice;
    const anoSelecionado = ANOS[indiceAnoAtual];
    inputAno.value = anoSelecionado;
    slider.value = novoIndice.toString();
    // Chama o callback para notificar a aplicação principal sobre a mudança
    onYearChange(anoSelecionado);
  }

  inputAno.addEventListener("change", () => {
    const valor = inputAno.value;
    const indice = ANOS.indexOf(valor);
    if (indice !== -1) {
      atualizarAno(indice);
    } else {
      alert("Ano inválido. Digite um ano entre 2017 e 2024.");
      inputAno.value = ANOS[indiceAnoAtual];
    }
  });

  document.body.appendChild(sliderContainer);
}