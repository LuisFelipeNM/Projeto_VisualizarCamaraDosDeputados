import requests
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter
from requests.exceptions import RetryError, HTTPError
from datetime import datetime
from collections.abc import Iterable, Generator
import os

import pandas as pd

from .classes import VotacaoSemVotos, ProposicaoNaoExiste
from .utils import *

BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2'

def _get(url: str) -> dict | list[dict]:
    '''
    faz uma requisição get e retorna um dicionario ou lista de dicionários resultante.
    '''
    session = requests.Session()
    retries = Retry(total=20, backoff_factor=1, status_forcelist=[504, 502, 500, 503])
    session.mount('https://', HTTPAdapter(max_retries=retries))
    
    response = session.get(url, timeout=30)
    response.raise_for_status()

    return response.json()['dados']

def _get_with_many_pages(url_base: str, parametros: Iterable[str]) -> list[dict]:
    '''
    Faz uma requisição get com paginação(adaptada apenas para api da camara)
    '''
    pagina = 1
    continue_buscando = True
    total_dados = []

    while continue_buscando:
        print_log(f"{'SCRAPPER':<10}: Requisitando página {pagina}") 
        url = url_base + '&'.join(parametros + [f'pagina={pagina}'])
        
        try: 
            dados = _get(url)
        except RetryError:
            pass
        else:
            if not len(dados):
                return total_dados
            
            total_dados.extend(dados)

            pagina += 1
        #

def _get_pdf(url: str, file_name: str):
    '''
    Faz o download do pdf de uma proposição
    '''
    if url != None:
        try:
            response = requests.get(url)

            response.raise_for_status()
        except HTTPError:
            raise ProposicaoNaoExiste
        else:
            save_pdf(file_name, response.content)

def _get_proposicoes_afetadas(proposicoes: Iterable[dict]) -> list[dict]:
    '''
    Coleta as proposições afetadas em uma votação
    '''
    proposicoes_afetadas = []

    for prop in proposicoes:
        resultado = _get(f'https://dadosabertos.camara.leg.br/api/v2/proposicoes/{prop["id"]}')

        run_assync(func= _get_pdf, args= [resultado['urlInteiroTeor'], f"./data/proposicoes/afetadas/{prop['id']}"])

        proposicoes_afetadas.append(resultado)

    return proposicoes_afetadas

def _get_proposicao_citada(url: str) -> dict:
    '''
    Coleta a proposição citada em uma votação
    '''
    prop_id = url.rsplit(sep= '/', maxsplit= 1)[-1]
    
    try:
        resultado = _get(url)
    except HTTPError:
        return None
    else:
        run_assync(func= _get_pdf, args= [resultado['urlInteiroTeor'], f"./data/proposicoes/citadas/{prop_id}"])

        return resultado
    #


def _processar_votos(votos: Iterable[dict], 
                     id_votacao: str) -> dict:
    '''
        Transforma o resultado da request de votos em um dicionario com a estrutura {'id_deputado': {'id_votacao': 'voto'}}
        Entrada: resultado da resquest de votos
        Saída: dicionário de votos
    '''
    votos = pd.DataFrame(votos)

    # transforma o id do deputado no index
    votos['deputado_'] = votos['deputado_'].apply(lambda dep: dep['id'])
    votos.set_index('deputado_', inplace= True)

    # transforma o valor do voto em {'id_votacao': 'voto'}
    votos = votos['tipoVoto'].apply(lambda voto: {id_votacao: voto})

    return votos.to_dict()


def _get_votacao(id: str) -> dict:
    '''
    Coleta as informações de uma votação
    '''

    try:
        votos = _get(f'{BASE_URL}/votacoes/{id}/votos')
    except requests.exceptions.HTTPError:
        raise VotacaoSemVotos()

    if not len(votos):
        raise VotacaoSemVotos()
    
    votos = _processar_votos(votos, id)

    votacao = _get(f'{BASE_URL}/votacoes/{id}')
    votacao['votos'] = votos

    prop_afetadadas = votacao['proposicoesAfetadas']
    if prop_afetadadas != None:
        votacao['proposicoesAfetadas'] = _get_proposicoes_afetadas(votacao['proposicoesAfetadas'])

    prop_citada = votacao['ultimaApresentacaoProposicao']['uriProposicaoCitada']
    if prop_citada != None:
        votacao['ultimaApresentacaoProposicao']['uriProposicaoCitada'] = _get_proposicao_citada(prop_citada)

    return votacao

def _get_id_votacoes(data_inicio: datetime, 
                     data_fim: datetime) -> list[dict]:
    '''
    Coleta a lista de id de votações em um determinado período de tempo,
    respeitando o limite de 31 dias da API.
    '''
    
    total_ids = []
    data_atual = data_inicio
    
    while data_atual <= data_fim:
        # Define o fim do período para a requisição atual (fim do mês)
        proximo_mes = data_atual.replace(day=28) + pd.Timedelta(days=4)
        fim_periodo = proximo_mes - pd.Timedelta(days=proximo_mes.day)

        # Garante que não ultrapassemos a data final geral
        if fim_periodo > data_fim:
            fim_periodo = data_fim

        print_log(f"{'SCRAPPER':<10}: Buscando votações de {data_atual.strftime('%Y-%m-%d')} a {fim_periodo.strftime('%Y-%m-%d')}")
        
        parametros = [
            f"dataInicio={data_atual.strftime('%Y-%m-%d')}",
            f"dataFim={fim_periodo.strftime('%Y-%m-%d')}"
        ]
        
        resultado = _get_with_many_pages(f'{BASE_URL}/votacoes?', parametros)
        
        if resultado:
            # Extrai apenas a coluna 'id' do resultado e adiciona à lista total
            ids_periodo = pd.DataFrame(resultado)['id'].to_list()
            total_ids.extend(ids_periodo)
        
        # Avança para o dia seguinte ao fim do período (início do próximo mês)
        data_atual = fim_periodo + pd.Timedelta(days=1)
        
    return list(set(total_ids)) # Usa set para remover duplicatas e converte para lista

def _get_deputados(votacoes: list, 
                   data_inicio: datetime, 
                   data_fim: datetime) -> dict:
    
    deputados = {}
    for votacao in votacoes.values():
        votos = votacao['votos']
        
        for deputado_id, voto in votos.items():
            try: 
                deputados[deputado_id]['votos'] |= voto
            except KeyError:
                print_log(f"{'SCRAPPER':<10}: Deputado {deputado_id}")
                
                deputados |= {
                    deputado_id: {'votos': voto}
                }
                parametros = [f'id={deputado_id}',
                              f'dataInicio={data_inicio.strftime("%Y-%m-%d")}',
                              f'dataFim={data_fim.strftime("%Y-%m-%d")}']
                try:
                    deputados[deputado_id] |= _get(f'{BASE_URL}/deputados?' + '&'.join(parametros))[-1]
                # Trata Bug da API
                except IndexError:
                    deputado = _get(f'{BASE_URL}/deputados/{deputado_id}')

                    deputados[deputado_id] |= {
                        "id": deputado['ultimoStatus']['id'],
                        "uri": deputado['ultimoStatus']['uri'],
                        "nome": deputado['ultimoStatus']['nome'],
                        "siglaPartido": deputado['ultimoStatus']['siglaPartido'],
                        "uriPartido": deputado['ultimoStatus']['uriPartido'],
                        "siglaUf": deputado['ultimoStatus']['siglaUf'],
                        "idLegislatura": deputado['ultimoStatus']['idLegislatura'],
                        "urlFoto": deputado['ultimoStatus']['urlFoto'],
                        "email": deputado['ultimoStatus']['email'],
                    }
                #
                deputados[deputado_id]['votos'] |= voto
            #
        #
    #

    return deputados

def _get_discursos(deputados: dict, 
                   file_name: str) -> Generator[dict, str]:
    
    data_inicio, data_fim = file_name.split('_')
    for deputado in deputados.keys():
        parametros = [f'dataInicio={data_inicio}',
                      f'dataFim={data_fim}']
        
        if not os.path.exists(f'./data/jsons/discursos/{file_name}_{deputado}.json'):
            print_log(f"{'SCRAPPER':<10}: DEPUTADO: {deputado}", flush=True)
            discursos = _get_with_many_pages(f'{BASE_URL}/deputados/{deputado}/discursos?', parametros)
            
            yield deputado, discursos
    
    #

def _get_dicursos_from_deputados(file_name: str):
    
    deputados = load_json(f'{file_name}_deputados')
    print_log(f"{'SCRAPPER':<10}: COLETA DAS INFORMAÇOES DOS DISCURSOS----")

    for deputado, discursos in _get_discursos(deputados, file_name):
        run_assync(func= save_json, args= [f'discursos/{file_name}_{deputado}', discursos])
    #
        


def scrapper(data_inicio: datetime, 
             data_fim: datetime, 
             file_name: str):
    
    context = get_context(file_name)

    if not context['votacoes']:
        print_log(f"{'SCRAPPER':<10}: COLETA DOS ID COMEÇANDO-----------------")

        ids = _get_id_votacoes(data_inicio, data_fim)

        print_log(f"{'SCRAPPER':<10}: COLETADOS {len(ids):>10} IDS----------------")
        print_log(f"{'SCRAPPER':<10}: COLETA DAS INFORMAÇOES DAS VOTAÇÕES-----")

        votacoes = {} 
        for indice, id in enumerate(ids):
            try:
                votacoes |= {id: _get_votacao(id)}
                
                print_log(f"{'SCRAPPER':<10}: indice {indice:<10}:  COLETADO")
            except VotacaoSemVotos:
                print_log(f"{'SCRAPPER':<10}: indice {indice:<10}: SEM VOTOS", flush= False)

        save_json(file_name + "_votacoes", votacoes)
        att_context({'votacoes': True}, file_name)
        votacoes = load_json(file_name + "_votacoes")

    if not context['deputados']:
        print_log(f"{'SCRAPPER':<10}: COLETA DAS INFORMAÇOES DOS DEPUTADOS----")
        if context['votacoes']:
            votacoes = load_json(file_name + "_votacoes")

        deputados = _get_deputados(votacoes, data_inicio, data_fim)
        save_json(file_name + "_deputados", deputados)
        att_context({'deputados': True}, file_name)

    if not context['discursos']:
        process = run_assync(func= _get_dicursos_from_deputados, args= [file_name])

        return process

    
