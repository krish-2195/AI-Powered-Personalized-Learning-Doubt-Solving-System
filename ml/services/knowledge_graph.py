import networkx as nx
import csv
import os
from typing import List

class KnowledgeGraphService:
    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_graph_from_csv()
        
    def _build_graph_from_csv(self):
        """
        Builds the syllabus dependency graph by dynamically loading
        from topic_relationships.csv.
        A directed edge parent -> child means parent is a prerequisite for child.
        """
        csv_path = os.path.join(os.path.dirname(__file__), '../datasets/topic_relationships.csv')
        
        if not os.path.exists(csv_path):
            print(f"Warning: Knowledge Graph CSV not found at {csv_path}")
            return
            
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                parent = row.get('parent_topic')
                child = row.get('child_topic')
                if parent and child:
                    self.graph.add_edge(parent.strip(), child.strip())
                    
    def get_prerequisites(self, topic: str) -> List[str]:
        """Returns all prerequisite topics in topological order."""
        if topic not in self.graph:
            return []
        prereqs = list(nx.ancestors(self.graph, topic))
        subgraph = self.graph.subgraph(prereqs)
        try:
            return list(nx.topological_sort(subgraph))
        except nx.NetworkXUnfeasible:
            return prereqs

    def get_next_topics(self, topic: str) -> List[str]:
        """Returns immediate next topics that unlock after this topic."""
        if topic not in self.graph:
            return []
        return list(self.graph.successors(topic))

    def identify_foundational_gaps(self, weak_topics: List[str]) -> List[str]:
        """
        Given a list of weak topics, identifies the root foundational topics that 
        are causing the weakness across multiple areas by finding overlapping prerequisites.
        """
        if not weak_topics:
            return []
            
        gap_counts = {}
        for wt in weak_topics:
            prereqs = self.get_prerequisites(wt)
            for p in prereqs:
                gap_counts[p] = gap_counts.get(p, 0) + 1
                
        # Sort gaps by frequency (how many weak topics rely on it) descending
        sorted_gaps = sorted(gap_counts.items(), key=lambda x: x[1], reverse=True)
        return [gap[0] for gap in sorted_gaps]

# Singleton instance initialized on startup
knowledge_graph = KnowledgeGraphService()
