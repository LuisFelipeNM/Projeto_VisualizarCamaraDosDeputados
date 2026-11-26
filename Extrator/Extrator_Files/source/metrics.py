from .utils import *
import networkx as nx

from itertools import combinations

def weight_function(node1, node2, data):
    return 1/data['concordancia']

class DeputiesNetwork():

    def __init__(self, file_name: str, initDistances: bool = False, raw_net: bool = False):
        self.graph = load_graph(file_name + "_net")
        self.is_raw_net = raw_net

        # Variaveis descritivas da rede
        self.nodes = self.graph.nodes(data= True)
        self.edges = self.graph.edges(data= True)
        self.parties, self.communities, self.parties_in_communities = self.__get_parties_and_communities()
        
        # Variaveis numéricas
        self.distances = None
        self.avarege_distance = None
        self.partiesDistances = None
        self.communitiesDistances = None
        self.partiesFragmentation = None
        self.communitiesFragmentation = None
        self.partiesIsolation = None
        self.communitiesIsolation = None

        if initDistances and not self.is_raw_net:
            self.__initDistances()

    def __initDistances(self):
        self.distances = dict(nx.algorithms.all_pairs_dijkstra_path_length(self.graph, weight='concordancia'))
        self.avarege_distance = self.__get_avarege_distance()
        self.partiesDistances = self.__get_parties_distances()
        self.communitiesDistances = self.__get_communities_distances()
        self.partiesFragmentation = {party: self.fragmentation(self.parties[party]) for party in self.parties}
        self.communitiesFragmentation = {community: self.fragmentation(self.communities[community]) for community in self.communities}
        self.partiesIsolation = self.__get_parties_isolation()
        self.communitiesIsolation = self.__get_communities_isolation()
        self.partiesInCommunitiesIsolation = self.__get_parties_in_communities_isolation()

    def __get_parties_and_communities(self) -> tuple[dict]:
        parties = {}
        communities = {}
        parties_in_communities = {}
        
        for node, data in self.nodes:

            try: 
                parties[data['partido']].append((node, data))
            except KeyError:
                parties[data['partido']] = [(node, data)]
            if not self.is_raw_net:
                try: 
                    communities[data['comunidade']].append((node, data))
                except KeyError:
                    communities[data['comunidade']] = [(node, data)]

                try:
                    parties_in_communities[data['comunidade']][data['partido']].append((node, data))
                except KeyError:
                    try:
                        parties_in_communities[data['comunidade']][data['partido']] = [(node, data)]
                    except KeyError:
                        parties_in_communities[data['comunidade']] = {data['partido']: [(node, data)]}

        return parties, communities, parties_in_communities
    
    def __get_parties_distances(self) -> dict:
        distances = {}
        
        for idx, (partyA, partyA_nodes) in enumerate(self.parties.items()):
            for partyB, partyB_nodes in list(self.parties.items())[idx+1:]: 
                distance = self.distance_between_groups(partyA_nodes, partyB_nodes)
                try:
                    distances[partyA] |= {partyB: distance}
                except KeyError:
                    distances |= {partyA: {partyB: distance}}
                try:
                    distances[partyB] |= {partyA: distance}
                except KeyError:
                    distances |= {partyB: {partyA: distance}}

        return distances
    
    def __get_communities_distances(self) -> dict:
        distances = {}
        
        for idx, (communityA, communityA_nodes) in enumerate(self.communities.items()):
            for communityB, communityB_nodes in list(self.communities.items())[idx+1:]: 
                distance = self.distance_between_groups(communityA_nodes, communityB_nodes)
                try:
                    distances[communityA] |= {communityB: distance}
                except KeyError:
                    distances |= {communityA: {communityB: distance}}
                try:
                    distances[communityB] |= {communityA: distance}
                except KeyError:
                    distances |= {communityB: {communityA: distance}}
                

        return distances
    
    def __get_parties_isolation(self) -> dict:
        isolation = {}
        for party in self.parties:
            isolation |= {party: 0}
            normalizer = 0
            for other_party in self.parties:
                if party != other_party:
                    length = len(self.parties[other_party])
                    isolation[party] += self.partiesDistances[party][other_party] * length
                    normalizer += length
            isolation[party] /= normalizer
            #
        #

        return isolation
    
    def __get_communities_isolation(self) -> dict:
        isolation = {}
        for community in self.communities:
            isolation |= {community: 0}
            normalizer = 0
            for other_community in self.communities:
                if community != other_community:
                    length = len(self.communities[other_community])
                    isolation[community] += self.communitiesDistances[community][other_community] * length
                    normalizer += length
            isolation[community] /= normalizer
            #
        #

        return isolation

    def __get_parties_in_communities_isolation(self) -> dict:
        isolation = {}
        for community in self.parties_in_communities:
            isolation |= {community: {}}
            for party in self.parties_in_communities[community]:
                isolation[community] |= {party: 0}
                normalizer = 0
                for other_party in self.parties_in_communities[community]:
                    if party != other_party:
                        length = len(self.parties_in_communities[community][other_party])
                        isolation[community][party] += self.distance_between_groups(self.parties_in_communities[community][party], self.parties_in_communities[community][other_party]) * length
                        normalizer += length
                    #
                #
                if normalizer != 0:
                    isolation[community][party] /= normalizer
            #
        #

        return isolation

    def __get_avarege_distance(self) -> float:
        avarege_distance = 0.0
        for (node_id_a, _), (node_id_b, _) in combinations(list(self.nodes), 2):
            avarege_distance += self.distances[node_id_a][node_id_b] 

        return 2 / ((len(self.nodes) * len(self.nodes) - 1)) * avarege_distance

    def getParties(self) -> dict:
        return self.parties.copy()

    def getParty(self, party: str) -> list[str]:
        return self.parties[party]

    def getCommunities(self) -> dict:
        return self.communities.copy()

    def getCommunity(self, community: int) -> list[str]:
        return self.communities[community]
    
    def getPartiesInCommunity(self, community: int) -> dict:
        return self.parties_in_communities[community]
    
    def getNode(self, id: str) -> dict:
        return self.nodes[id]
    
    def getEdge(self, node1: str, node2: str) -> dict:
        return self.edges[node1][node2]
    
    def getPartiesDistances(self) -> dict:
        return self.partiesDistances.copy()
    
    def getCommunitiesDistances(self) -> dict:
        return self.communitiesDistances.copy()
    
    def getPartiesFragmentation(self) -> dict:
        return self.partiesFragmentation.copy()

    def getCommunitiesFragmentation(self) -> dict:
        return self.communitiesFragmentation.copy()
    
    def getPartiesIsolation(self) -> dict:
        return self.partiesIsolation.copy()
    
    def getCommunitiesIsolation(self) -> dict:
        return self.communitiesIsolation.copy()
    
    def getPartiesInCommunitiesIsolation(self) -> dict:
        return self.partiesInCommunitiesIsolation.copy()

    def distance_between_groups(self, groupA: list[tuple[str, dict]], groupB: list[tuple[str, dict]]) -> float:
        seize_A = len(groupA)
        seize_B = len(groupB)
        total = 0

        for a, _ in groupA:
            for b, _ in groupB:
                total += self.distances[a][b]
        
        return total/(seize_A*seize_B)

    def fragmentation(self, group: list[tuple[str, dict]]) -> float:
        return self.distance_between_groups(group, group)