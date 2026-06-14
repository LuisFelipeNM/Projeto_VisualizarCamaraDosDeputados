function parseMarkdown(text: string | null | undefined): string {
    if (!text || text === "null") return 'Informação não disponível ou ainda não processada pela IA.';
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
        maxWidth: "850px", maxHeight: "85vh",
        overflowY: "auto", position: "relative",
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        fontFamily: "sans-serif"
    });

    // Estrutura HTML do modal com as abas
    modal.innerHTML = `
        <h2 style="margin-top: 0; color: #2c3e50; padding-bottom: 10px;">
            Análise Parlamentar: ${nomePolitico} (${ano})
        </h2>
        <button id="modal-close" style="position: absolute; top: 15px; right: 15px; font-size: 28px; border: none; background: transparent; cursor: pointer; color: #95a5a6;">&times;</button>
        
        <!-- Navegação das Abas -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #ecf0f1; padding-bottom: 5px;">
            <button class="tab-btn" data-target="tab-resumo-deputado" style="padding: 8px 15px; border: none; background: #3498db; color: white; border-radius: 5px; cursor: pointer; font-weight: bold;">Deputado (IA)</button>
            <button class="tab-btn" data-target="tab-resumo-partido" style="padding: 8px 15px; border: none; background: #ecf0f1; color: #333; border-radius: 5px; cursor: pointer;">Partido (IA)</button>
            <button class="tab-btn" data-target="tab-resumo-comunidade" style="padding: 8px 15px; border: none; background: #ecf0f1; color: #333; border-radius: 5px; cursor: pointer;">Comunidade (IA)</button>
            <button class="tab-btn" data-target="tab-discursos-brutos" style="padding: 8px 15px; border: none; background: #ecf0f1; color: #333; border-radius: 5px; cursor: pointer;">Discursos Completos</button>
        </div>

        <!-- Conteúdo das Abas -->
        <div id="tab-resumo-deputado" class="tab-content" style="display: block; line-height: 1.6; color: #333;"><p>Carregando...</p></div>
        <div id="tab-resumo-partido" class="tab-content" style="display: none; line-height: 1.6; color: #333;"><p>Carregando...</p></div>
        <div id="tab-resumo-comunidade" class="tab-content" style="display: none; line-height: 1.6; color: #333;"><p>Carregando...</p></div>
        <div id="tab-discursos-brutos" class="tab-content" style="display: none;"><p>Carregando...</p></div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const fecharModal = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); };
    overlay.addEventListener("click", (e) => { if (e.target === overlay) fecharModal(); });
    (modal.querySelector("#modal-close") as HTMLElement).onclick = fecharModal;

    // Lógica de alternância das abas
    const tabBtns = modal.querySelectorAll('.tab-btn');
    const tabContents = modal.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        (btn as HTMLElement).onclick = (e) => {
            const targetId = (e.currentTarget as HTMLElement).getAttribute('data-target');
            
            tabBtns.forEach(b => {
                (b as HTMLElement).style.background = '#ecf0f1';
                (b as HTMLElement).style.color = '#333';
                (b as HTMLElement).style.fontWeight = 'normal';
            });
            tabContents.forEach(c => (c as HTMLElement).style.display = 'none');

            (e.currentTarget as HTMLElement).style.background = '#3498db';
            (e.currentTarget as HTMLElement).style.color = 'white';
            (e.currentTarget as HTMLElement).style.fontWeight = 'bold';
            
            if (targetId) {
                const targetEl = modal.querySelector(`#${targetId}`) as HTMLElement;
                if (targetEl) targetEl.style.display = 'block';
            }
        };
    });

    try {
        const urlAPI = `http://localhost:3000/api/discursos/${idPolitico}/${ano}`;
        const response = await fetch(urlAPI);
        const jsonData = await response.json();
        
        const discursosDoBanco = jsonData.discursos || [];
        
        const divResumoDeputado = modal.querySelector("#tab-resumo-deputado") as HTMLElement;
        const divResumoPartido = modal.querySelector("#tab-resumo-partido") as HTMLElement;
        const divResumoComunidade = modal.querySelector("#tab-resumo-comunidade") as HTMLElement;
        const divDiscursosBrutos = modal.querySelector("#tab-discursos-brutos") as HTMLElement;

        if (discursosDoBanco.length > 0) {
            const dados = discursosDoBanco[0];

            divResumoDeputado.innerHTML = parseMarkdown(dados.resumo_deputado);
            divResumoPartido.innerHTML = parseMarkdown(dados.resumo_partido);
            divResumoComunidade.innerHTML = parseMarkdown(dados.resumo_comunidade);

            divDiscursosBrutos.innerHTML = "";
            let listaDeEventos = [];
            
            try {
                listaDeEventos = typeof dados.discurso_completo === 'string' ? JSON.parse(dados.discurso_completo) : dados.discurso_completo;
            } catch (e) {
                console.error("Erro ao dar parse nos discursos completos:", e);
            }

            if (Array.isArray(listaDeEventos) && listaDeEventos.length > 0) {
                listaDeEventos.forEach((evento: any) => {
                    const itemDiv = document.createElement("div");
                    itemDiv.style.cssText = "margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; border-left: 5px solid #3498db;";

                    const dataFormatada = evento.dataHoraInicio ? new Date(evento.dataHoraInicio).toLocaleDateString('pt-BR') : 'Data N/A';

                    itemDiv.innerHTML = `
                        <small style="color: #666;">${dataFormatada} | Tipo: ${evento.tipoDiscurso || 'Pronunciamento'}</small>
                        <p style="margin: 10px 0;"><strong>Sumário Original:</strong> ${evento.sumario || "Não disponível"}</p>
                        <details style="margin-top: 10px;">
                            <summary style="color: #3498db; cursor: pointer; font-weight: bold;">Ver transcrição completa</summary>
                            <div style="margin-top: 10px; font-size: 0.95em; color: #333; line-height: 1.6; border-top: 1px solid #eee; padding-top: 10px; white-space: pre-wrap;">
                                ${parseMarkdown(evento.transcricao || "Transcrição não disponível.")}
                            </div>
                        </details>
                    `;
                    divDiscursosBrutos.appendChild(itemDiv);
                });
            } else {
                divDiscursosBrutos.innerHTML = "<p>Nenhum discurso bruto encontrado.</p>";
            }

        } else {
            divResumoDeputado.innerHTML = "<p>Nenhum dado encontrado para este parlamentar.</p>";
            divResumoPartido.innerHTML = "<p>Nenhum dado encontrado.</p>";
            divResumoComunidade.innerHTML = "<p>Nenhum dado encontrado.</p>";
            divDiscursosBrutos.innerHTML = "<p>Nenhum discurso encontrado.</p>";
        }
    } catch (error) {
        console.error("Erro no modal:", error);
        (modal.querySelector("#tab-resumo-deputado") as HTMLElement).innerHTML = "<p style='color:red'>Erro ao carregar dados do servidor.</p>";
    }
}