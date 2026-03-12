function parseMarkdown(text: string): string {
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


	try {

		const urlAPI = `http://localhost:3000/api/discursos/${idPolitico}/${ano}`;
		console.log(`Buscando discursos no banco de dados: ${urlAPI}`);
		
		const response = await fetch(urlAPI);
		
		if (!response.ok) {
			throw new Error(`Erro na API: ${response.status}`);
		}

		const jsonData = await response.json();
		const discursos = jsonData.discursos || [];

		const contentDiv = modal.querySelector("#discursos-content") as HTMLElement;

		if (discursos.length > 0) {
			contentDiv.innerHTML = "";
			
			discursos.forEach((d: any) => {
				const div = document.createElement("div");
				div.style.marginBottom = "15px";
				div.style.borderBottom = "1px solid #ddd";
				div.style.paddingBottom = "10px";

				let dataFormatada = 'Data desconhecida';
				if (d.data_hora) {
					dataFormatada = new Date(d.data_hora).toLocaleDateString('pt-BR');
				}

				div.innerHTML = `
					<p style="font-size: 0.9em; color: #666; margin-bottom: 5px;">
						<strong>Data:</strong> ${dataFormatada} | <strong>Tipo:</strong> ${d.tipo || 'Não informado'}
					</p>
					<div style="line-height: 1.5; color: #333; margin-top: 10px;">
						${parseMarkdown(d.sumario || 'Sem conteúdo disponível.')}
					</div>
					${d.url_texto ? `<div style="margin-top: 8px;"><a href="${d.url_texto}" target="_blank" style="font-size: 0.8em; color: #0066cc;">Ler na íntegra no Diário da Câmara</a></div>` : ''}
				`;
				contentDiv.appendChild(div);
			});
		} else {
			contentDiv.innerHTML = `<p>Nenhum discurso encontrado para este deputado no ano de ${ano}.</p>`;
		}

	} catch (error: any) {
		console.error("Erro ao buscar discursos:", error);
		const contentDiv = modal.querySelector("#discursos-content") as HTMLElement;
		contentDiv.innerHTML = `<p style="color: red;"><strong>Erro de Conexão:</strong> Não foi possível acessar o banco de dados. Verifique se o server.ts está rodando no terminal.</p>`;
	}
}