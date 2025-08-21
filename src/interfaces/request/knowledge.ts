export interface ITestRetrievalRequestBody {
  question: string;
  similarity_threshold: number;
  keywords_similarity_weight: number;
  rerank_id?: string;
  top_k?: number;
  use_kg?: boolean;
  highlight?: boolean;
  kb_id?: string[];
}

export interface IFetchKnowledgeListRequestBody {
  owner_ids?: string[];
}

export interface IFetchKnowledgeListRequestParams {
  kb_id?: string;
  keywords?: string;
  page?: number;
  page_size?: number;
  knowledge_ids?: string[];
  query?: string;
  keyword?: boolean;
  document_ids?: string[];
  joinRule?: string;
  similarity_threshold?: number;
  vector_similarity_weight?: number;
  rerank_id?: string;
  top_k?: number;
  use_kg?: boolean;
  highlight?: boolean;
  chunk_deduplication_coefficient?: number;
  retrieval_setting?: {
    score_threshold?: string|number;
    top_k?: number;
  };
  metadata_condition?: any


}

export interface IFetchDocumentListRequestBody {
  types?: string[];
  run_status?: string[];
}
