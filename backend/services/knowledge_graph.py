import networkx as nx
from typing import List

class KnowledgeGraphService:
    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_static_graph()
        
    def _build_static_graph(self):
        """
        Builds the static syllabus dependency graph for CSE topics.
        A directed edge A -> B means A is a prerequisite for B.
        """
        # --- Data Structures & Algorithms ---
        self.graph.add_edge("Variables & Data Types", "Arrays")
        self.graph.add_edge("Arrays", "Linked Lists")
        self.graph.add_edge("Variables & Data Types", "Functions")
        self.graph.add_edge("Functions", "Recursion")
        self.graph.add_edge("Arrays", "Sorting Algorithms")
        self.graph.add_edge("Arrays", "Searching Algorithms")
        self.graph.add_edge("Recursion", "Trees")
        self.graph.add_edge("Trees", "Binary Search Trees")
        self.graph.add_edge("Trees", "Graphs")
        self.graph.add_edge("Recursion", "Dynamic Programming")
        
        # --- Database Management Systems ---
        self.graph.add_edge("SQL Basics", "SQL Joins")
        self.graph.add_edge("SQL Basics", "Normalization")
        
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

# Singleton instance
knowledge_graph = KnowledgeGraphService()
