from .utils import *
from .plot import plot_nework

from statistics import mode
from concurrent.futures import ProcessPoolExecutor, as_completed
import os

import networkx as nx
from scipy.spatial.distance import jaccard

from networkx.algorithms.community import greedy_modularity_communities, asyn_lpa_communities

EXECUTIONS = 1000

def compute_communities(graph, weight):
    print(f"Process ID: {os.getpid()}")
    return list(asyn_lpa_communities(graph, weight))

def communities(file_name: str):
    graph = load_graph(f'{file_name}_net')

    communities = []

    with ProcessPoolExecutor(max_workers= os.cpu_count()//2) as executor: 
        futures = [executor.submit(compute_communities, graph, 'concordancia') for _ in range(EXECUTIONS)]
    
        for future in as_completed(futures):
            communities.append(future.result())

    moda = mode([len(c) for c in communities])
    
    i = 0
    while i < len(communities):
        if len(communities[i]) != moda:
            communities.pop(i)
        else:
            i += 1
    #

    nodes = list(graph.nodes)
    nodes.sort()

    global_communities = []
    for i in range(len(communities)):
        global_communities.append({})
        for community_id, community in enumerate(communities[i]):
            jaccard_values = []
            for reference_community in communities[0]:
                jaccard_values.append(len(community & reference_community) / len(community | reference_community))
            
            equivalent_community_id = jaccard_values.index(max(jaccard_values))
            global_communities[i] |= {community_id: equivalent_community_id}
        #
    #

    nodes_communities = {node: [] for node in nodes}
    for i in range(len(communities)):
        for community_id, community in enumerate(communities[i]):
            for node in nodes:
                if node in community:
                    nodes_communities[node].append(global_communities[i][community_id])
            #
        #
    #
    
    nodes_community = {node: {'comunidade': mode(nodes_communities[node])} for node in nodes}
    nx.set_node_attributes(graph, nodes_community)

    save_graph(f'{file_name}_net', graph)