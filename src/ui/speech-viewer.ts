function parseMarkdown(text: string): string {
    if (!text || text === "null") return 'Informação não disponível.';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

export async function exibirModalDiscursos(nomePolitico: string, idPolitico: string, ano: string) {
    const overlay = document.createElement("div");
    overlay.id = "modal-overlay";
    Object.assign(overlay.style, {
        position: "fixed", top: "0", left: "0",
        width: "100%", height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        zIndex: "1000",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)"
    });

    const modal = document.createElement("div");
    Object.assign(modal.style, {
        background: "white", padding: "30px",
        borderRadius: "12px", width: "90%",
        maxWidth: "800px", maxHeight: "85vh",
        overflowY: "auto", position: "relative",
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        fontFamily: "sans-serif"
    });

    modal.innerHTML = `
        <h2 style="margin-top: 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            Discursos: ${nomePolitico} (${ano})
        </h2>
        <button id="modal-close" style="position: absolute; top: 15px; right: 15px; font-size: 28px; border: none; background: transparent; cursor: pointer; color: #95a5a6;">&times;</button>
        <div id="discursos-content"><p>Carregando discursos...</p></div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const fecharModal = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };
    overlay.addEventListener("click", (e) => { if (e.target === overlay) fecharModal(); });
    (modal.querySelector("#modal-close") as HTMLElement).onclick = fecharModal;

    try {
        const urlAPI = `http://localhost:3000/api/discursos/${idPolitico}/${ano}`;
        const response = await fetch(urlAPI);
        const jsonData = await response.json();
        
        // O JSON que você mandou tem a chave "discursos"
        const discursosDoBanco = jsonData.discursos || [];
        const contentDiv = modal.querySelector("#discursos-content") as HTMLElement;
        contentDiv.innerHTML = "";

        if (discursosDoBanco.length > 0) {
            discursosDoBanco.forEach((d: any) => {
                let listaDeEventos = [];
                
                try {
                    // BASEADO NO SEU JSON: O dado bruto está na chave 'sumario'
                    // Precisamos dar parse nela para virar uma lista de verdade
                    listaDeEventos = typeof d.sumario === 'string' ? JSON.parse(d.sumario) : d.sumario;
                } catch (e) {
                    console.error("Erro ao dar parse no sumario:", e);
                }

                if (Array.isArray(listaDeEventos)) {
                    listaDeEventos.forEach((evento: any) => {
                        const itemDiv = document.createElement("div");
                        itemDiv.style.cssText = "margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; border-left: 5px solid #3498db;";

                        const dataFormatada = evento.dataHoraInicio ? new Date(evento.dataHoraInicio).toLocaleDateString('pt-BR') : 'Data N/A';

                        itemDiv.innerHTML = `
                            <small style="color: #666;">${dataFormatada} | Tipo: ${evento.tipoDiscurso || 'Pronunciamento'}</small>
                            <p style="margin: 10px 0;"><strong>Sumário:</strong> ${evento.sumario || "Não disponível"}</p>
                            <details style="margin-top: 10px;">
                                <summary style="color: #3498db; cursor: pointer; font-weight: bold;">Ver transcrição completa</summary>
                                <div style="margin-top: 10px; font-size: 0.95em; color: #333; line-height: 1.6; border-top: 1px solid #eee; padding-top: 10px; white-space: pre-wrap;">
                                    ${parseMarkdown(evento.transcricao || "Transcrição não disponível.")}
                                </div>
                            </details>
                        `;
                        contentDiv.appendChild(itemDiv);
                    });
                }
            });
        } else {
            contentDiv.innerHTML = "<p>Nenhum discurso encontrado.</p>";
        }
    } catch (error) {
        console.error("Erro no modal:", error);
        (modal.querySelector("#discursos-content") as HTMLElement).innerHTML = "<p style='color:red'>Erro ao carregar dados do servidor.</p>";
    }
}