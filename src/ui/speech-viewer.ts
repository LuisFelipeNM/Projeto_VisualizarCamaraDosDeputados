function parseMarkdown(text: string): string {
	return text
		.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Converte **texto** para <b>texto</b>
		.replace(/\n/g, '<br>'); // Converte quebras de linha para <br>
}

/**
 * @param nomePolitico - O nome do político para exibir no título.
 * @param idPolitico - O ID do político (ex: 66179) para encontrar o arquivo.
 * @param ano - O ano selecionado (ex: "2019") para buscar na pasta correta.
 */
export async function exibirModalDiscursos(nomePolitico: string, idPolitico: string, ano: string) {
	// --- CONFIGURAÇÃO DO MODAL ---
	const overlay = document.createElement("div");
	overlay.id = "modal-overlay";
	Object.assign(overlay.style, {
		position: "fixed", top: "0", left: "0",
		width: "100%", height: "100%",
		backgroundColor: "rgba(0, 0, 0, 0.7)",
		zIndex: "1000",
		display: "flex", alignItems: "center", justifyContent: "center",
	});

	const modal = document.createElement("div");
	Object.assign(modal.style, {
		background: "white", padding: "20px",
		borderRadius: "8px", width: "80%",
		maxWidth: "700px", maxHeight: "90vh",
		overflowY: "auto", position: "relative",
	});

	modal.innerHTML = `
		<h2 style="margin-top: 0;">Resumo: ${nomePolitico} (${ano})</h2>
		<button id="modal-close" style="position: absolute; top: 10px; right: 10px; font-size: 20px; border: none; background: transparent; cursor: pointer;">&times;</button>
		<div id="discursos-content"><p>Carregando...</p></div>
	`;

	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	const fecharModal = () => {
		if (document.body.contains(overlay)) {
			document.body.removeChild(overlay);
		}
	};
	
	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) fecharModal();
	});
	(modal.querySelector("#modal-close") as HTMLElement).onclick = fecharModal;

	// --- LÓGICA DE LEITURA (JSON ou TEXTO) ---
	try {
		const nomeArquivo = `${ano}-01-01_${ano}-12-31_${idPolitico}.txt`;
		const url = `/discursos/${ano}/${nomeArquivo}`;
		
		console.log(`Tentando carregar: ${url}`);
		
		const response = await fetch(url);
		
		if (!response.ok) {
			if (response.status === 404) {
				throw new Error("Arquivo não encontrado (404). Verifique se o arquivo existe na pasta 'public/discursos/" + ano + "'.");
			}
			throw new Error(`Erro HTTP: ${response.status}`);
		}

		// Lê o conteúdo como texto primeiro
		const textData = await response.text();
		const contentDiv = modal.querySelector("#discursos-content") as HTMLElement;

		try {
			// Tenta converter para JSON caso seja estruturado
			const jsonData = JSON.parse(textData);
			const discursos = Array.isArray(jsonData) ? jsonData : (jsonData.discursos || []);

			if (Array.isArray(discursos) && discursos.length > 0) {
				contentDiv.innerHTML = "";
				discursos.forEach((d: any) => {
					const div = document.createElement("div");
					div.style.marginBottom = "15px";
					div.style.borderBottom = "1px solid #ddd";
					div.innerHTML = `
						<p><strong>Data:</strong> ${d.dataHoraInicio || '?'}</p>
						<p>${d.sumario || d.transcricao || 'Sem conteúdo.'}</p>
					`;
					contentDiv.appendChild(div);
				});
			} else {
				contentDiv.innerHTML = "<p>Formato JSON reconhecido, mas sem discursos.</p>";
			}

		} catch (e) {
			// SE FALHAR O JSON: Assume que é Texto Puro / Markdown (Seu caso atual!)
			console.log("Arquivo não é JSON, exibindo como texto/markdown.");
			
			contentDiv.innerHTML = `
				<div style="white-space: pre-wrap; line-height: 1.5; color: #333;">
					${parseMarkdown(textData)}
				</div>
			`;
		}

	} catch (error: any) {
		console.error(error);
		const contentDiv = modal.querySelector("#discursos-content") as HTMLElement;
		contentDiv.innerHTML = `<p style="color: red;"><strong>Erro:</strong> ${error.message}</p>`;
	}
}