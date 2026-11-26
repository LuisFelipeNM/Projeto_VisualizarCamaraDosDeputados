from math import ceil

class VotacaoSemVotos(Exception):
    def __init__(self):
        super().__init__('Votação sem dados dos votos')

class ProposicaoNaoExiste(Exception):
    def __init__(self):
        super().__init__('Proposição não existe')

class DiscursoMuitoGrande(Exception):
    def __init__(self, tokens: int, model_max_input_tokens: int):
        super().__init__(f'Discurso muito grande, o prompt excede o limite de tokens do modelo {tokens} > {model_max_input_tokens}')
        self.parts = ceil(tokens / model_max_input_tokens)

        