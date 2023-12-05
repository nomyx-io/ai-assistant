# Mempry System Design

sequenceDiagram
    participant U as User
    participant API as ChatGPT API
    participant TF1 as Tool Function 1 (generateEmbeddings)
    participant TF2 as Tool Function 2 (retrieveContext)
    participant TF3 as Tool Function 3 (storeResponse)
    participant MEM as Memory System

    U->>API: Sends query
    API->>TF1: Trigger Embedding Generation
    TF1->>MEM: Store/Retrieve Embeddings
    MEM-->>TF1: Embeddings Data
    TF1->>TF2: Pass Embeddings for Context Retrieval
    TF2->>MEM: Query for Relevant Context
    MEM-->>TF2: Retrieved Context
    TF2->>API: Provide Enriched Context with User Query
    API->>U: Sends Response
    U-->>API: Acknowledges/Responds
    API->>TF3: Trigger Response Storing
    TF3->>MEM: Store Interaction as Embeddings
    MEM-->>TF3: Confirm Storage
