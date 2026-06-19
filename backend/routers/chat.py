from datetime import datetime
import re
from typing import Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

SESSION_STORE: Dict[str, List[dict]] = {}

TOPIC_KEYWORDS = {
    "Dynamic Programming": ["dp", "dynamic programming", "memoization", "tabulation"],
    "Graph Algorithms": ["graph", "bfs", "dfs", "shortest path", "dijkstra"],
    "Recursion": ["recursion", "recursive", "base case", "stack overflow"],
    "Binary Trees": ["tree", "binary tree", "traversal", "bst"],
    "Arrays": ["array", "prefix", "sliding window", "two pointer"],
}

DEFAULT_WEAK_TOPICS = ["Dynamic Programming", "Graph Algorithms"]

TOPIC_GUIDES = {
    "Dynamic Programming": {
        "core": "Use previously solved subproblems to avoid recomputation.",
        "steps": [
            "Define state clearly (what does dp[i] or dp[i][j] represent?).",
            "Write transition from smaller states.",
            "Set base cases, then compute in valid order.",
        ],
        "pitfall": "Wrong state definition causes most DP bugs.",
    },
    "Recursion": {
        "core": "Solve a problem by solving a smaller version of itself.",
        "steps": [
            "Define base case that stops recursion.",
            "Define recursive relation for smaller input.",
            "Ensure each call moves toward base case.",
        ],
        "pitfall": "Missing base case leads to infinite recursion.",
    },
    "Graph Algorithms": {
        "core": "Model entities as nodes and relationships as edges.",
        "steps": [
            "Pick representation (adjacency list in most cases).",
            "Choose traversal: BFS for layers/shortest unweighted path, DFS for exploration.",
            "Track visited nodes to avoid cycles.",
        ],
        "pitfall": "Forgetting visited checks causes repeated work or loops.",
    },
}

class ChatMessage(BaseModel):
    user_id: str
    message: str
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    topic_detected: Optional[str]
    confidence: float
    follow_up_questions: List[str]


class QuizGenerateRequest(BaseModel):
    user_id: str
    topic: str
    difficulty: str = "medium"
    count: int = 5


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer_index: int
    explanation: str


class QuizGenerateResponse(BaseModel):
    topic: str
    difficulty: str
    questions: List[QuizQuestion]


class SessionSummary(BaseModel):
    user_id: str
    total_messages: int
    topics_covered: List[str]
    key_takeaways: List[str]
    unresolved_doubts: List[str]
    recommended_next_steps: List[str]


def detect_topic(text: str) -> Optional[str]:
    lower_text = text.lower()
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(word in lower_text for word in keywords):
            return topic
    return None


def get_history(user_id: str) -> List[dict]:
    return SESSION_STORE.get(user_id, [])


def get_recent_topic(history: List[dict]) -> Optional[str]:
    for item in reversed(history):
        if item.get("topic"):
            return item["topic"]
    return None


def detect_intent(message: str) -> str:
    lower = message.lower().strip()
    if lower in {"hi", "hey", "hello", "yo", "hii"}:
        return "greeting"
    if "practice question" in lower or "practice problems" in lower or "give me" in lower and "question" in lower:
        return "practice"
    if "with a story" in lower or "story" in lower:
        return "story"
    if "worked example" in lower or "example" in lower:
        return "example"
    if "revision" in lower or "2-minute" in lower or "summary" in lower:
        return "revision"
    return "explain"


def parse_question_count(message: str) -> int:
    match = re.search(r"\b(\d{1,2})\b", message)
    if match:
        return max(1, min(int(match.group(1)), 10))
    return 3


def build_greeting_response() -> str:
    return (
        "Hey! I can help with quick revision, worked examples, or practice questions.\n"
        "Try: 'Give me 3 DP practice questions' or 'Explain recursion with a story'."
    )


def build_explain_response(topic: str) -> str:
    guide = TOPIC_GUIDES.get(topic)
    if not guide:
        return (
            f"Let's break down {topic}.\n"
            "1) Define the goal clearly.\n"
            "2) Identify constraints and edge cases.\n"
            "3) Choose a strategy and validate with a small example."
        )
    steps = "\n".join([f"{index + 1}) {step}" for index, step in enumerate(guide["steps"])])
    return (
        f"{topic} in simple terms: {guide['core']}\n"
        f"How to solve problems in {topic}:\n{steps}\n"
        f"Common pitfall: {guide['pitfall']}"
    )


def build_story_response(topic: str) -> str:
    if topic == "Recursion":
        return (
            "Imagine standing in front of nested boxes.\n"
            "To find a key, you open one box and if it's not there, you repeat the same action on the smaller box inside.\n"
            "Base case: when a box is empty, stop searching.\n"
            "That's recursion: same rule, smaller input, clear stop condition."
        )
    if topic == "Dynamic Programming":
        return (
            "Think of climbing stairs with sticky notes.\n"
            "Each step, you write the number of ways to reach that step, so you never recount from scratch.\n"
            "Those sticky notes are memoization/tabulation—saving solved subproblems."
        )
    return (
        f"Story for {topic}: solve a tiny version first, save what you learned, then build up to the full problem."
    )


def build_example_response(topic: str) -> str:
    if topic == "Recursion":
        return (
            "Worked example (factorial 4):\n"
            "fact(4) = 4 * fact(3)\n"
            "fact(3) = 3 * fact(2)\n"
            "fact(2) = 2 * fact(1)\n"
            "fact(1) = 1 (base case)\n"
            "Backtrack: 2*1=2, 3*2=6, 4*6=24"
        )
    if topic == "Dynamic Programming":
        return (
            "Worked example (Fibonacci with DP):\n"
            "dp[0]=0, dp[1]=1\n"
            "dp[2]=1, dp[3]=2, dp[4]=3, dp[5]=5\n"
            "Answer fib(5)=5, computed once per state (O(n))."
        )
    return f"Worked example for {topic}: start from smallest case, solve step-by-step, and verify output on sample input."


def build_revision_response(topic: str) -> str:
    return (
        f"2-minute revision: {topic}\n"
        "- Goal: identify pattern quickly\n"
        "- Method: write state/steps before coding\n"
        "- Check: test one edge case and one normal case\n"
        "- Exam tip: explain your approach in 3 lines before implementation"
    )


def build_practice_response(topic: str, count: int) -> str:
    prompts = [
        f"{topic} Practice Q{index + 1}: Explain your approach and time complexity."
        for index in range(count)
    ]
    return "Here are focused practice questions:\n" + "\n".join([f"{index + 1}. {item}" for index, item in enumerate(prompts)])


def push_message(user_id: str, role: str, content: str, topic: Optional[str] = None):
    SESSION_STORE.setdefault(user_id, []).append(
        {
            "role": role,
            "content": content,
            "topic": topic,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )


def build_tutor_response(topic: Optional[str], message: str, history: List[dict]) -> str:
    inferred_topic = topic or get_recent_topic(history) or "Problem Solving"
    intent = detect_intent(message)

    if intent == "greeting":
        return build_greeting_response()
    if intent == "practice":
        return build_practice_response(inferred_topic, parse_question_count(message))
    if intent == "story":
        return build_story_response(inferred_topic)
    if intent == "example":
        return build_example_response(inferred_topic)
    if intent == "revision":
        return build_revision_response(inferred_topic)
    return build_explain_response(inferred_topic)


QUIZ_BANK: dict = {
    "Dynamic Programming": [
        {
            "q": "What does memoization mean in Dynamic Programming?",
            "opts": ["Caching results of subproblems to avoid recomputation", "Sorting the input array first", "Using recursion without base cases", "Ignoring overlapping subproblems"],
            "ans": 0,
            "exp": "Memoization stores results of expensive function calls so they can be reused, reducing time from exponential to polynomial.",
        },
        {
            "q": "Which of the following is a classic DP problem?",
            "opts": ["Fibonacci sequence", "Binary search", "Bubble sort", "Breadth-first search"],
            "ans": 0,
            "exp": "Fibonacci is the canonical DP example — each value depends on the two before it, making it perfect for memoization or tabulation.",
        },
        {
            "q": "What is the key property required for DP to apply?",
            "opts": ["Optimal substructure and overlapping subproblems", "A sorted input", "O(1) space complexity", "A greedy choice property"],
            "ans": 0,
            "exp": "DP needs optimal substructure (optimal solution built from optimal sub-solutions) and overlapping subproblems (same sub-problems solved repeatedly).",
        },
        {
            "q": "Bottom-up DP differs from top-down DP in that:",
            "opts": ["It fills a table iteratively starting from base cases", "It always uses recursion", "It's slower than top-down", "It doesn't use any extra memory"],
            "ans": 0,
            "exp": "Bottom-up (tabulation) iteratively fills a table from the smallest subproblems up, avoiding recursion call-stack overhead.",
        },
        {
            "q": "What is the time complexity of the classic 0/1 Knapsack DP solution?",
            "opts": ["O(n * W) where n is items and W is capacity", "O(n log n)", "O(2^n)", "O(n^3)"],
            "ans": 0,
            "exp": "The knapsack DP table has n rows and W columns, so filling it takes O(n * W) time.",
        },
    ],
    "Graph Algorithms": [
        {
            "q": "Which traversal finds the shortest path in an unweighted graph?",
            "opts": ["BFS (Breadth-First Search)", "DFS (Depth-First Search)", "Dijkstra's algorithm", "Prim's algorithm"],
            "ans": 0,
            "exp": "BFS explores level by level, so the first time it reaches a node it has found the shortest path in terms of edge count.",
        },
        {
            "q": "What data structure does BFS use internally?",
            "opts": ["Queue", "Stack", "Heap", "Linked list"],
            "ans": 0,
            "exp": "BFS uses a queue (FIFO) to process nodes level by level.",
        },
        {
            "q": "Dijkstra's algorithm fails on graphs with:",
            "opts": ["Negative edge weights", "Cycles", "Disconnected components", "More than 1000 nodes"],
            "ans": 0,
            "exp": "Dijkstra's greedy relaxation assumes edge weights are non-negative. Negative weights require Bellman-Ford instead.",
        },
        {
            "q": "What is the time complexity of BFS on a graph with V vertices and E edges?",
            "opts": ["O(V + E)", "O(V * E)", "O(V^2)", "O(E log V)"],
            "ans": 0,
            "exp": "BFS visits each vertex once and each edge once, giving O(V + E) time complexity.",
        },
        {
            "q": "Which algorithm detects a cycle in a directed graph?",
            "opts": ["DFS with visited and recursion-stack tracking", "BFS alone", "Dijkstra's algorithm", "Prim's algorithm"],
            "ans": 0,
            "exp": "DFS can detect back edges (edges to an ancestor in DFS tree) which indicate cycles in directed graphs.",
        },
    ],
    "Recursion": [
        {
            "q": "What is the base case in recursion?",
            "opts": ["The condition that stops the recursion", "The first function call", "The largest input value", "The return type of the function"],
            "ans": 0,
            "exp": "The base case is the simplest scenario where the function returns a value without calling itself again, preventing infinite recursion.",
        },
        {
            "q": "What causes a stack overflow in recursive functions?",
            "opts": ["Missing or unreachable base case", "Using too many variables", "Declaring the function globally", "Returning a value"],
            "ans": 0,
            "exp": "Without a reachable base case, the function keeps calling itself, filling the call stack until it overflows.",
        },
        {
            "q": "What is tail recursion?",
            "opts": ["Recursion where the recursive call is the last operation", "Recursion starting from the largest input", "A loop converted to recursion", "Recursion with multiple base cases"],
            "ans": 0,
            "exp": "Tail recursion has the recursive call as the final step, allowing compilers/interpreters to optimize it into a loop (tail call optimization).",
        },
        {
            "q": "Which of the following best describes mutual recursion?",
            "opts": ["Function A calls Function B which calls Function A", "A function calling itself twice", "Two functions with the same base case", "A function with two return statements"],
            "ans": 0,
            "exp": "Mutual recursion is when two or more functions call each other in a cycle, each depending on the other for its result.",
        },
        {
            "q": "The time complexity of naive recursive Fibonacci is:",
            "opts": ["O(2^n)", "O(n)", "O(n log n)", "O(1)"],
            "ans": 0,
            "exp": "Without memoization, each call branches into two more calls, creating an exponential call tree of depth n.",
        },
    ],
}

GENERIC_QUESTIONS = [
    {
        "q": "What is the best first step when approaching a new problem?",
        "opts": ["Understand constraints and expected output", "Start coding immediately", "Memorize a template", "Ignore edge cases"],
        "ans": 0,
        "exp": "Strong solutions start by understanding what's asked, constraintss, and edge cases before writing any code.",
    },
    {
        "q": "Which time complexity is generally considered optimal for most competitive problems?",
        "opts": ["O(n log n)", "O(n^3)", "O(2^n)", "O(n!)"],
        "ans": 0,
        "exp": "O(n log n) is the typical sweet spot — it handles n up to ~10^7 within time limits.",
    },
    {
        "q": "What does 'divide and conquer' mean?",
        "opts": ["Split problem into smaller subproblems, solve each, then combine", "Loop through all elements and pick the best", "Use a hash map to count frequencies", "Sort first, then binary search"],
        "ans": 0,
        "exp": "Divide and conquer recursively splits a problem, solves subproblems independently, then merges results (e.g. merge sort, quicksort).",
    },
    {
        "q": "What is the purpose of a visited set in graph traversal?",
        "opts": ["Prevent revisiting nodes and avoid infinite loops", "Store the shortest distance", "Count the number of edges", "Track the graph's adjacency list"],
        "ans": 0,
        "exp": "A visited set marks nodes already explored so we don't process them again, avoiding infinite loops in cyclic graphs.",
    },
    {
        "q": "Two Sum problem: what data structure gives an O(n) solution?",
        "opts": ["Hash map", "Sorted array", "Stack", "Priority queue"],
        "ans": 0,
        "exp": "A hash map stores each number's index as you scan, letting you look up the complement in O(1) per element.",
    },
]


def build_quiz(topic: str, difficulty: str, count: int) -> List[QuizQuestion]:
    safe_count = max(1, min(count, 10))
    bank = QUIZ_BANK.get(topic, GENERIC_QUESTIONS)
    # cycle through the bank if count > bank size
    questions: List[QuizQuestion] = []
    for i in range(safe_count):
        item = bank[i % len(bank)]
        questions.append(
            QuizQuestion(
                question=f"[{difficulty.title()}] {item['q']}",
                options=list(item["opts"]),
                answer_index=int(item["ans"]),
                explanation=item["exp"],
            )
        )
    return questions

@router.post("/ask", response_model=ChatResponse)
async def ask_ai_tutor(message: ChatMessage):
    """
    Context-aware AI tutor response with weak-topic aware guidance.
    """
    history = get_history(message.user_id)
    topic = detect_topic(message.message)

    push_message(message.user_id, "user", message.message, topic)
    tutor_response = build_tutor_response(topic, message.message, history)
    push_message(message.user_id, "ai", tutor_response, topic)

    topic_for_followup = topic or "this topic"
    return {
        "response": tutor_response,
        "topic_detected": topic,
        "confidence": 0.9 if topic else 0.72,
        "follow_up_questions": [
            f"Do you want a worked example for {topic_for_followup}?",
            "Should I generate a 5-question quiz now?",
            "Do you want a 2-minute revision summary?"
        ]
    }


@router.post("/quiz/generate", response_model=QuizGenerateResponse)
async def generate_quiz(payload: QuizGenerateRequest):
    """Generate a quick practice quiz for the requested topic."""
    topic = payload.topic.strip() or "General Problem Solving"
    questions = build_quiz(topic, payload.difficulty.lower(), payload.count)
    push_message(payload.user_id, "ai", f"Generated a {len(questions)}-question quiz on {topic}.", topic)
    return QuizGenerateResponse(topic=topic, difficulty=payload.difficulty.lower(), questions=questions)

@router.get("/history/{user_id}")
async def get_chat_history(user_id: str, limit: int = 20):
    """
    Get user's chat history with AI tutor
    """
    history = get_history(user_id)
    sliced = history[-max(1, limit):]
    return {
        "user_id": user_id,
        "conversations": sliced,
        "total_count": len(history)
    }

@router.post("/feedback")
async def provide_feedback(user_id: str, chat_id: str, rating: int, helpful: bool):
    """
    Collect feedback on AI responses
    """
    # TODO: Save feedback for model improvement
    
    return {
        "message": "Feedback recorded",
        "chat_id": chat_id,
        "thank_you": "Your feedback helps improve our AI tutor!"
    }

@router.get("/suggested-questions/{user_id}")
async def get_suggested_questions(user_id: str):
    """
    Suggest questions based on weak topics
    """
    weak_topics = DEFAULT_WEAK_TOPICS
    return {
        "user_id": user_id,
        "suggested_questions": [
            "How do I identify if a problem can be solved using Dynamic Programming?",
            "What are the prerequisites for learning Graph Algorithms?",
            "Can you explain recursion with examples?"
        ],
        "based_on": f"Your weak topics: {', '.join(weak_topics)}"
    }


@router.get("/session-summary/{user_id}", response_model=SessionSummary)
async def get_session_summary(user_id: str):
    """Return a compact summary of the current tutor session."""
    history = get_history(user_id)
    topics = [item.get("topic") for item in history if item.get("topic")]
    unique_topics = sorted(set(topics))
    last_user_messages = [item["content"] for item in history if item["role"] == "user"][-3:]

    takeaways = [
        "Break large problems into smaller, testable steps.",
        "Validate approach on small examples before coding.",
    ]
    unresolved = last_user_messages[-2:] if last_user_messages else ["No unresolved doubts recorded yet."]
    next_steps = [
        "Attempt a 5-question quiz on your weakest topic.",
        "Revise one concept using a worked example.",
        "Come back with one error you faced while solving problems.",
    ]

    return SessionSummary(
        user_id=user_id,
        total_messages=len(history),
        topics_covered=unique_topics,
        key_takeaways=takeaways,
        unresolved_doubts=unresolved,
        recommended_next_steps=next_steps,
    )
