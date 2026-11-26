from .utils import *

import itertools

import pandas as pd
import networkx as nx
import numpy as np

MAP_VOTOS = {
    "Sim": 1,
    "Não": -1,
    "Abstenção": 0,
    "Obstrução": -1
}

def create_network(deputados: dict, total_votacoes: int) -> nx.Graph:
    
    

    graph = nx.Graph()

    for id_dep1, id_dep2 in itertools.combinations(deputados.keys(), 2):
        votos_dep1 = pd.Series(deputados[id_dep1]['votos']).dropna().map(MAP_VOTOS)
        votos_dep2 = pd.Series(deputados[id_dep2]['votos']).dropna().map(MAP_VOTOS)

        intersec = votos_dep1.index.intersection(votos_dep2.index)

        if len(intersec) > 0:
            concordancia = np.float64((votos_dep1[intersec] * votos_dep2[intersec]).sum()) / total_votacoes

            if concordancia > 0:
                if not id_dep1 in graph:
                    graph.add_node(
                        id_dep1, 
                        nome= deputados[id_dep1]['nome'],
                        partido=  deputados[id_dep1]['siglaPartido'],
                        uf=  deputados[id_dep1]['siglaUf'],
                        
                    )

                if not id_dep2 in graph:
                    graph.add_node(
                        id_dep2, 
                        nome= deputados[id_dep2]['nome'],
                        partido=  deputados[id_dep2]['siglaPartido'],
                        uf=  deputados[id_dep2]['siglaUf'],
                    )
                
                graph.add_edge(id_dep1, id_dep2, concordancia= concordancia)
            #
        #

    return graph


def network(file_name: str):
    print_log(f"{'NETWORK':<10}:ESTRUTURAÇÃO DA REDE-------------------")
    
    deputados = load_json(file_name + "_deputados")
    votacoes = load_json(file_name + "_votacoes")
    total_votacoes = len(votacoes.keys())
    del votacoes
    graph = create_network(deputados, total_votacoes)

    save_graph(file_name + "_raw_net", graph)

    




