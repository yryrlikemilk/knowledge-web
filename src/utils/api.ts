let api_rag_host = `/api`;
let api_host = `/v1`;
export { api_host, api_rag_host };
export default {
  // user
  login: `${api_rag_host}/user/login`,
  logout: `${api_host}/user/logout`,
  register: `${api_rag_host}/user/register`,
  setting: `${api_host}/user/setting`,
  user_info: `${api_rag_host}/user/info`,
  tenant_info: `${api_rag_host}/user/tenantInfo`,
  set_tenant_info: `${api_host}/user/set_tenant_info`,
  login_channels: `${api_rag_host}/user/login/channels`,
  login_channel: (channel: string) => `${api_host}/user/login/${channel}`,

  // team
  addTenantUser: (tenantId: string) => `${api_host}/tenant/${tenantId}/user`,
  listTenantUser: (tenantId: string) =>
    `${api_host}/tenant/${tenantId}/user/list`,
  deleteTenantUser: (tenantId: string, userId: string) =>
    `${api_host}/tenant/${tenantId}/user/${userId}`,
  listTenant: `${api_rag_host}/user/tenant/list`,
  agreeTenant: (tenantId: string) => `${api_host}/tenant/agree/${tenantId}`,

  // llm model
  factories_list: `${api_rag_host}/llm/factories`,
  llm_list: `${api_rag_host}/llm/list`,
  my_llm: `${api_rag_host}/llm/myLlms`,
  set_api_key: `${api_host}/llm/set_api_key`,
  add_llm: `${api_host}/llm/add_llm`,
  delete_llm: `${api_host}/llm/delete_llm`,
  deleteFactory: `${api_host}/llm/delete_factory`,

  // plugin
  llm_tools: `${api_host}/plugin/llm_tools`,

  // knowledge base
  kb_list: `${api_rag_host}/dataset/list`,
  create_kb: `${api_rag_host}/dataset/create`,
  update_kb: `${api_rag_host}/dataset/update`,
  rm_kb: `${api_rag_host}/dataset/delete`,
  get_kb_detail: `${api_rag_host}/dataset/detail`,
  getKnowledgeGraph: (knowledgeId: string) =>
    `${api_host}/kb/${knowledgeId}/knowledge_graph`,

  // tags
  listTag: (knowledgeId: string) => `${api_host}/kb/${knowledgeId}/tags`,
  listTagByKnowledgeIds: `${api_host}/kb/tags`,
  removeTag: (knowledgeId: string) => `${api_host}/kb/${knowledgeId}/rm_tags`,
  renameTag: (knowledgeId: string) =>
    `${api_host}/kb/${knowledgeId}/rename_tag`,

  // chunk
  chunk_list: `${api_rag_host}/chunk/list`,
  create_chunk: `${api_host}/chunk/create`,
  set_chunk: `${api_host}/chunk/set`,
  get_chunk: `${api_host}/chunk/get`,
  switch_chunk: `${api_rag_host}/chunk/switch`,
  rm_chunk: `${api_host}/chunk/rm`,
  // retrieval_test: `${api_host}/chunk/retrieval_test`,
  retrieval_test: `${api_rag_host}/query/retrieval`,
  batch_retrieval_test:`${api_rag_host}/query/batchRetrieval`,
  knowledge_graph: `${api_host}/chunk/knowledge_graph`,
  getVideoChunks: `${api_rag_host}/chunk/getVideoChunks`,
  minioGetDownloadUrl: `${api_rag_host}/minio/getDownloadUrl`,
  // document
  get_document_list: `${api_rag_host}/file/docList`,
  document_change_status: `${api_rag_host}/file/updateDocStatus`,
  document_update_status: `${api_rag_host}/file/updateDocStatus`,
  document_rm: `${api_host}/document/rm`,
  documentRm: (dataset_id: string) =>
    `${api_rag_host}/file/deleteDoc/${dataset_id}`,
  document_delete: `${api_host}/api/document`,
  document_rename: `${api_host}/document/rename`,
  document_create: `${api_host}/document/create`,
  document_run: `${api_rag_host}/file/run`,
  document_change_parser: `${api_rag_host}/file/changeParser`,
  document_thumbnails: `${api_rag_host}/conversation/document/thumbnails`,
  get_document_file: `${api_rag_host}/file/download`,
  document_upload: `${api_rag_host}/file/uploadFile`,
  web_crawl: `${api_host}/document/web_crawl`,
  document_infos: `${api_host}/document/infos`,
  upload_and_parse: `${api_host}/document/upload_and_parse`,
  parse: `${api_host}/document/parse`,
  setMeta: `${api_rag_host}/file/setMeta`,

  // chat
  setDialog: `${api_host}/dialog/set`,
  getDialog: `${api_rag_host}/conversation/dialog/get`,
  removeDialog: `${api_host}/dialog/rm`,
  listDialog: `${api_rag_host}/conversation/dialog/list`,
  setConversation: `${api_host}/conversation/set`,
  getConversation: `${api_rag_host}/conversation/completion/get`,
  getConversationSSE: `${api_host}/conversation/getsse`,
  listConversation: `${api_rag_host}/conversation/completion/list`,
  removeConversation: `${api_host}/conversation/rm`,
  completeConversation: `${api_rag_host}/conversation/completion`,
  deleteMessage: `${api_host}/conversation/delete_msg`,
  thumbup: `${api_host}/conversation/thumbup`,
  tts: `${api_host}/conversation/tts`,
  ask: `${api_host}/conversation/ask`,
  mindmap: `${api_host}/conversation/mindmap`,
  getRelatedQuestions: `${api_host}/conversation/related_questions`,
  // chat for external
  createToken: `${api_host}/api/new_token`,
  listToken: `${api_host}/api/token_list`,
  removeToken: `${api_host}/api/rm`,
  getStats: `${api_host}/api/stats`,
  createExternalConversation: `${api_host}/api/new_conversation`,
  getExternalConversation: `${api_host}/api/conversation`,
  completeExternalConversation: `${api_host}/api/completion`,
  uploadAndParseExternal: `${api_host}/api/document/upload_and_parse`,

  // file manager
  listFile: `${api_rag_host}/fileManage/list`,
  uploadFile: `${api_host}/file/upload`,
  removeFile: `${api_rag_host}/fileManage/rm`,
  renameFile: `${api_rag_host}/fileManage/rename`,
  getAllParentFolder: `${api_rag_host}/fileManage/allParentFolder`,
  createFolder: `${api_host}/file/create`,
  connectFileToKnowledge: `${api_rag_host}/fileManage/file2document/convert`,
  getFile: `${api_host}/file/get`,
  moveFile: `${api_rag_host}/fileManage/mv`,

  // system
  getSystemVersion: `${api_host}/system/version`,
  getSystemStatus: `${api_host}/system/status`,
  getSystemTokenList: `${api_host}/system/token_list`,
  createSystemToken: `${api_host}/system/new_token`,
  listSystemToken: `${api_host}/system/token_list`,
  removeSystemToken: `${api_host}/system/token`,
  getSystemConfig: `${api_rag_host}/system/config`,
  setLangfuseConfig: `${api_host}/langfuse/api_key`,

  // flow
  listTemplates: `${api_host}/canvas/templates`,
  listCanvas: `${api_host}/canvas/list`,
  listCanvasTeam: `${api_host}/canvas/listteam`,
  getCanvas: `${api_host}/canvas/get`,
  getCanvasSSE: `${api_host}/canvas/getsse`,
  removeCanvas: `${api_host}/canvas/rm`,
  setCanvas: `${api_host}/canvas/set`,
  settingCanvas: `${api_host}/canvas/setting`,
  getListVersion: `${api_host}/canvas/getlistversion`,
  getVersion: `${api_host}/canvas/getversion`,
  resetCanvas: `${api_host}/canvas/reset`,
  runCanvas: `${api_host}/canvas/completion`,
  testDbConnect: `${api_host}/canvas/test_db_connect`,
  getInputElements: `${api_host}/canvas/input_elements`,
  debug: `${api_host}/canvas/debug`,

  // tools
  speechToText: `${api_rag_host}/tools/speechToText`,
  ocrRecognition: `${api_rag_host}/tools/ocrRecognition`,
  textSimilarity: `${api_rag_host}/tools/textSimilarity`,
  sensitiveWord: `${api_rag_host}/tools/sensitiveWord`,
  keywordExtraction: `${api_rag_host}/tools/keywordExtraction`,
  clusteringAnalysis: `${api_rag_host}/tools/clusteringAnalysis`,
  imgUnderstand: `${api_rag_host}/tools/imgUnderstand`,
  videoUnderstand: `${api_rag_host}/tools/videoUnderstand`,
  taskList: (dataset_id: string) => `${api_rag_host}/task/list/${dataset_id}`,
};
