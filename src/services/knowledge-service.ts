import { IRenameTag } from '@/interfaces/database/knowledge';
import {
  IFetchDocumentListRequestBody,
  IFetchKnowledgeListRequestParams,
} from '@/interfaces/request/knowledge';
import api from '@/utils/api';
import registerServer from '@/utils/register-server';
import request, { post } from '@/utils/request';

const {
  create_kb,
  update_kb,
  rm_kb,
  get_kb_detail,
  kb_list,

  get_document_list,
  document_change_status,
  document_update_status,
  document_rm,
  document_delete,
  document_create,
  document_change_parser,
  document_thumbnails,
  chunk_list,
  create_chunk,
  set_chunk,
  get_chunk,
  switch_chunk,
  document_rename,
  document_run,
  document_upload,
  web_crawl,
  knowledge_graph,
  document_infos,
  upload_and_parse,
  listTagByKnowledgeIds,
  setMeta,
  //retrieval_test,
  getVideoChunks,

  minioGetDownloadUrl,
  get_ai_question_count,
  get_ai_question_count_by_doc_ids,
  other_doc_generate_ai_question,
  page_list,
  save_retrieval_task,
  retrieval_question_page_list,
  add_questions,
  update_question,
  delete_questions,
  check_first_generate,
  get_generate_progress,
  save_ai_questions,
  retrieval_task_report,
  retrieval_task_question_list,
} = api;

const methods = {
  // 知识库管理
  createKb: {
    url: create_kb,
    method: 'post',
  },
  updateKb: {
    url: update_kb,
    method: 'post',
  },
  rmKb: {
    url: rm_kb,
    method: 'post',
  },
  get_kb_detail: {
    url: get_kb_detail,
    method: 'get',
  },
  getList: {
    url: kb_list,
    method: 'post',
  },

  // document manager
  get_document_list: {
    url: get_document_list,
    method: 'get',
  },
  document_change_status: {
    url: document_change_status,
    method: 'post',
  },
  document_update_status: {
    url: document_update_status,
    method: 'post',
  },
  document_rename: {
    url: document_rename,
    method: 'post',
  },
  document_create: {
    url: document_create,
    method: 'post',
  },
  document_run: {
    url: document_run,
    method: 'post',
  },
  document_rm: {
    url: document_rm,
    method: 'post',
  },
  document_change_parser: {
    url: document_change_parser,
    method: 'post',
  },
  document_thumbnails: {
    url: document_thumbnails,
    method: 'get',
  },
  document_upload: {
    url: document_upload,
    method: 'post',
  },
  web_crawl: {
    url: web_crawl,
    method: 'post',
  },
  document_infos: {
    url: document_infos,
    method: 'post',
  },
  setMeta: {
    url: setMeta,
    method: 'post',
  },
  // chunk管理
  chunk_list: {
    url: chunk_list,
    method: 'post',
  },
  create_chunk: {
    url: create_chunk,
    method: 'post',
  },
  set_chunk: {
    url: set_chunk,
    method: 'post',
  },
  get_chunk: {
    url: get_chunk,
    method: 'get',
  },
  switch_chunk: {
    url: switch_chunk,
    method: 'post',
  },

  knowledge_graph: {
    url: knowledge_graph,
    method: 'get',
  },
  document_delete: {
    url: document_delete,
    method: 'delete',
  },
  upload_and_parse: {
    url: upload_and_parse,
    method: 'post',
  },
  listTagByKnowledgeIds: {
    url: listTagByKnowledgeIds,
    method: 'get',
  },
  //   retrieval_test: {
  //   url: retrieval_test,
  //   method: 'post',
  // },
  getVideoChunks: {
    url: getVideoChunks,
    method: 'post',
  },
  minioGetDownloadUrl: {
    url: minioGetDownloadUrl,
    method: 'get',
  },
  getAiQuestionCount: {
    url: get_ai_question_count,
    method: 'post',
  },
  getAiQuestionCountByDocIds: {
    url: get_ai_question_count_by_doc_ids,
    method: 'post',
  },
  otherDocGenerateAiQuestion: {
    url: other_doc_generate_ai_question,
    method: 'post',
  },
  pageList: {
    url: page_list,
    method: 'post',
  },
  retrievalQuestionPageList: {
    url: retrieval_question_page_list,
    method: 'post',
  },
  addQuestions: {
    url: add_questions,
    method: 'post',
  },
  updateQuestion: {
    url: update_question,
    method: 'post',
  },
  deleteQuestions: {
    url: delete_questions,
    method: 'post',
  },
  saveRetrievalTask: {
    url: save_retrieval_task,
    method: 'post',
  },
  checkFirstGenerate: {
    url: check_first_generate,
    method: 'get',
  },
  getGenerateProgress: {
    url: get_generate_progress,
    method: 'get',
  },
  saveAiQuestions: {
    url: save_ai_questions,
    method: 'post',
  },
  retrievalTaskReport: {
    url: retrieval_task_report,
    method: 'post',
  },
  retrievalTaskQuestionList: {
    url: retrieval_task_question_list,
    method: 'post',
  },
};

const kbService = registerServer<keyof typeof methods>(methods, request);
export const retrieval_test = (body?: IFetchKnowledgeListRequestParams) => {
  return request.post(api.retrieval_test, { data: body });
};
export const batch_retrieval_test = (
  body?: IFetchKnowledgeListRequestParams,
) => {
  return request.post(api.batch_retrieval_test, { data: body });
};

// retrieval_test: {
//   url: retrieval_test,
//   method: 'post',
// },
export const listTag = (knowledgeId: string) =>
  request.get(api.listTag(knowledgeId));

export const removeTag = (knowledgeId: string, tags: string[]) =>
  post(api.removeTag(knowledgeId), { tags });

export const renameTag = (
  knowledgeId: string,
  { fromTag, toTag }: IRenameTag,
) => post(api.renameTag(knowledgeId), { fromTag, toTag });

export const documentRm = (
  knowledgeId: string,
  body?: IFetchKnowledgeListRequestParams,
) => post(api.documentRm(knowledgeId), { data: body });
export const rm_chunk = (
  knowledgeId: string,
  document_id: string,
  body?: IFetchKnowledgeListRequestParams,
) => post(api.rm_chunk(knowledgeId, document_id), { data: body });
export function getKnowledgeGraph(knowledgeId: string) {
  return request.get(api.getKnowledgeGraph(knowledgeId));
}
export function getKnowledgeRunStatus(knowledgeId: string) {
  return request.get(api.get_run_status(knowledgeId));
}

export function deleteKnowledgeGraph(knowledgeId: string) {
  return request.delete(api.getKnowledgeGraph(knowledgeId));
}

export const listDataset = (body?: IFetchKnowledgeListRequestParams) => {
  return request.post(api.kb_list, { data: body });
};

export const listDocument = (
  //params?: IFetchKnowledgeListRequestParams,
  body?: IFetchDocumentListRequestBody,
) => request.post(api.get_document_list, { data: body || {} });

export function checkForFileUpdates(knowledgeId: string) {
  return request.get(api.check_for_file_updates(knowledgeId));
}
export const getAllQuestions = (kbId: string) => {
  return request.get(api.all_questions, { params: { kbId } });
};
export const getCount = () => {
  return request.get('/api/dataset/getCount');
};

export const getTaskList = (dataset_id: string) => {
  return request.get(api.taskList(dataset_id));
};

export const fetchVideoChunks = (chunk_ids: string[]) =>
  kbService['getVideoChunks']({ chunk_ids });

export const getMinioDownloadUrl = (docId: string[]) =>
  kbService['minioGetDownloadUrl']({ docId });

export const generateAiQuestion = (body?: {
  kb_id: string;
  question_count: number;
}) => {
  return request.post(api.generate_ai_question, { data: body });
};

export const getAiQuestionCount = (body?: {
  kb_id: string;
  doc_ids: string[];
}) => {
  return request.post(api.get_ai_question_count, { data: body });
};

export const getAiQuestionCountByDocIds = (body?: {
  kb_id: string;
  doc_ids: string[];
}) => {
  return request.post(api.get_ai_question_count_by_doc_ids, { data: body });
};

export const otherDocGenerateAiQuestion = (body?: {
  kb_id: string;
  doc_ids: string[];
  question_count: number;
}) => {
  return request.post(api.other_doc_generate_ai_question, { data: body });
};

export const saveRetrievalTask = (body?: {
  kb_id: string;
  task_name: string;
  questions: Array<{ question_id: string; question_text: string }>;
  similarity_threshold: number;
  top_k: number;
  rerank_id: string;
  vector_similarity_weight: number;
}) => {
  return request.post(api.save_retrieval_task, { data: body });
};

export const updateQuestion = (body?: {
  id: string;
  question_text: string;
}) => {
  return request.post(api.update_question, { data: body });
};

export const deleteQuestions = (body?: { question_ids: string[] }) => {
  return request.post(api.delete_questions, { data: body });
};

export const checkFirstGenerate = (kbId: string) => {
  return request.get(api.check_first_generate, { params: { kbId } });
};

export const getRetrievalTaskReport = (body?: {
  ai_generate?: boolean;
  category?: string;
  page?: number;
  page_size?: number;
  result?: number;
  task_id?: string;
}) => {
  return request.post(api.retrieval_task_report, { data: body });
};

export const getRetrievalTaskQuestionList = (body?: {
  ai_generate?: boolean;
  category?: string;
  page?: number;
  page_size?: number;
  result?: number;
  task_id?: string;
}) => {
  return request.post(api.retrieval_task_question_list, { data: body });
};

export const getGenerateProgress = (historyId: string) => {
  return request.get(api.get_generate_progress, { params: { historyId } });
};

export const saveAiQuestions = (body?: {
  ai_generate_questions: Array<{
    category: string;
    doc_count: number;
    question_count: number;
    question_ratio: number;
    questions: Array<{
      chunk_id: string;
      doc_id: string;
      doc_name: string;
      question_text: string;
    }>;
  }>;
  kb_id: string;
}) => {
  return request.post(api.save_ai_questions, { data: body });
};

export default kbService;
