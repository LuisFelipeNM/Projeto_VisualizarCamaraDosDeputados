from .utils import *

import logging

import networkx as nx
import numpy as np


def calculate_strength(graph: nx.Graph):
    
    nodes = graph.nodes(data=True)
    
    for node, edges in graph.adjacency():
        strength = np.float64(sum(edge['concordancia'] for edge in edges.values()))

        node_info = nodes[node]
        node_info |= {'strength': strength}
        graph.add_node(node, **node_info)

def calculate_probability(weight: np.float64, degree: int) -> np.float64:
    return (degree - 1) * (1 - ((1 - weight)**(degree + 1))) / (degree + 1)

# def probability_cut(graph: nx.Graph, probability: float):
#     less_probably_edges = iter(sorted(graph.edges(data=True), key= lambda x: x[2]['probability']))

def get_largest_component(graph: nx.Graph) -> nx.Graph:
    components = nx.connected_components(graph)
    return max(components, key=len)

# def get_best_cut(graph: nx.Graph, 
#                  preserve_percent: float, 
#                  prob_min:float, 
#                  prob_max:float):
    
#     prob_min = prob_min
#     prob_max = prob_max

#     error = 0.015
#     min_erro = 1000
#     prob_min_erro= 0.0

#     prob_min_perc = 

def get_best_cut(graph: nx.Graph) -> tuple[int, int]:
    init_order = graph.order()
    init_size = graph.size()
    less_probably_edges = iter(sorted(graph.edges(data=True), key= lambda x: x[2]['probability']))

    continue_backbone = True
    while continue_backbone:
        edge = next(less_probably_edges)
        graph.remove_edge(*edge[:2])

        largest_component = get_largest_component(graph)
        
        if len(largest_component) <= init_order * 0.8:
            continue_backbone = False

    nodes_to_remove = set(graph.nodes) - get_largest_component(graph)
    graph.remove_nodes_from(nodes_to_remove)

    return init_order - graph.order(), init_size - graph.size()

def backbone_extraction(graph: nx.Graph) -> tuple[int, int]:
    
    calculate_strength(graph)

    nodes = graph.nodes(data=True)

    for edge in graph.edges():
        edge_data = graph.get_edge_data(*edge)
        
        weight0 = edge_data['concordancia'] / nodes[edge[1]]['strength']
        weight1 = edge_data['concordancia'] / nodes[edge[0]]['strength']
        
        probability = min(calculate_probability(weight0, graph.degree[edge[0]]), calculate_probability(weight1, graph.degree[edge[1]]))
        
        edge_data |= {'probability':probability}
        graph.add_edge(*edge, **edge_data)


    return get_best_cut(graph)

def backbone(file_name: str):
    print_log(F"{'BACKBONE':<10}: ESPARSIFICAÇÃO DE ARESTAS COM BACKBONE-")
    
    graph = load_graph(f"{file_name}_raw_net")
        
    nodes_rem, edges_rem = backbone_extraction(graph)

    print_log(f"{'BACKBONE':<10}: {nodes_rem} vértices removidos e {edges_rem} arestas removidas")
    
    save_graph(f"{file_name}_net", graph)
    