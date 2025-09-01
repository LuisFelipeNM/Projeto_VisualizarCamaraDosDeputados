/**
 * @param nomePolitico - O nome do político para exibir no título do modal.
 * @param nomeArquivo - O nome do arquivo JSON contendo os discursos.
 */
export async function exibirModalDiscursos(nomePolitico: string, nomeArquivo: string) {
  // Cria o overlay de fundo
  const overlay = document.createElement("div");
  overlay.id = "modal-overlay";
  Object.assign(overlay.style, {
    position: "fixed", top: "0", left: "0",
    width: "100%", height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: "1000",
    display: "flex", alignItems: "center", justifyContent: "center",
  });

  // Cria o container do modal
  const modal = document.createElement("div");
  Object.assign(modal.style, {
    background: "white", padding: "20px",
    borderRadius: "8px", width: "80%",
    maxWidth: "700px", maxHeight: "90vh",
    overflowY: "auto", position: "relative",
  });

  // Adiciona título e botão de fechar
  modal.innerHTML = `
    <h2 style="margin-top: 0;">Discursos de ${nomePolitico}</h2>
    <button id="modal-close" style="position: absolute; top: 10px; right: 10px; font-size: 20px; border: none; background: transparent; cursor: pointer;">&times;</button>
    <div id="discursos-content"><p>Carregando...</p></div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Função para fechar o modal
  const fecharModal = () => document.body.removeChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fecharModal();
  });
  (modal.querySelector("#modal-close") as HTMLElement).onclick = fecharModal;

  // Busca e exibe os discursos
  try {
    // Assumindo que os arquivos de discursos estão na pasta /public/discursos/
    const response = await fetch(`/discursos/${nomeArquivo}`);
    if (!response.ok) throw new Error(`Não foi possível encontrar o arquivo: ${nomeArquivo}`);
    
    const politicoData = await response.json();
    const discursos = politicoData.discursos; // Acessa a lista de discursos dentro do objeto principal

    const contentDiv = modal.querySelector("#discursos-content") as HTMLElement;

    if (Array.isArray(discursos) && discursos.length > 0) {
      // Limpa o "Carregando..."
      contentDiv.innerHTML = "";
      // Itera sobre a lista de discursos encontrada
      discursos.forEach((discurso: any) => {
        const discursoEl = document.createElement("div");
        discursoEl.style.borderBottom = "1px solid #eee";
        discursoEl.style.padding = "10px 0";
        discursoEl.style.marginBottom = "10px";
        
        // Formata a data para melhor visualização
        const dataFormatada = new Date(discurso.dataHoraInicio).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });

        // Monta o HTML com os dados corretos do JSON
        discursoEl.innerHTML = `
          <p><strong>Data:</strong> ${dataFormatada}</p>
          <p><strong>Tipo do Discurso:</strong> ${discurso.tipoDiscurso || 'Não informado'}</p>
          <p><strong>Sumário:</strong> ${discurso.sumario || 'Não informado'}</p>
          ${discurso.urlTexto ? `<a href="${discurso.urlTexto}" target="_blank" rel="noopener noreferrer">Ler íntegra no Diário da Câmara</a>` : ''}
        `;
        contentDiv.appendChild(discursoEl);
      });
    } else {
      contentDiv.innerHTML = "<p>Nenhum discurso encontrado.</p>";
    }

  } catch (error) {
    console.error("Erro ao carregar discursos:", error);
    const contentDiv = modal.querySelector("#discursos-content") as HTMLElement;
    contentDiv.innerHTML = `<p style="color: red;">Ocorreu um erro ao carregar os discursos.</p>`;
  }
}