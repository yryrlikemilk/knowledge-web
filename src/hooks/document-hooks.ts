import { IReferenceChunk } from '@/interfaces/database/chat';
import { IDocumentInfo } from '@/interfaces/database/document';
import { IChunk } from '@/interfaces/database/knowledge';
import {
  IChangeParserConfigRequestBody,
  IDocumentMetaRequestBody,
} from '@/interfaces/request/document';
import i18n from '@/locales/config';
import chatService from '@/services/chat-service';
import kbService, {
  documentRm,
  listDocument,
  getTaskList,
} from '@/services/knowledge-service';
import api, { api_host,api_rag_host } from '@/utils/api';
import { buildChunkHighlights } from '@/utils/document-util';
import { post } from '@/utils/request';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UploadFile, message } from 'antd';
import { get } from 'lodash';
import { useCallback, useMemo, useState } from 'react';
import React from 'react';
import { IHighlight } from 'react-pdf-highlighter';
import { useParams } from 'umi';
import { useGetPaginationWithRouter } from './logic-hooks';
import {
  useGetKnowledgeSearchParams,
  useSetPaginationParams,
} from './route-hook';

export const useGetDocumentUrl = (documentId?: string) => {
  const getDocumentUrl = useCallback(
    (id?: string) => {
      return `${api_rag_host}/file/download/${documentId || id}`;
    },
    [documentId],
  );

  return getDocumentUrl;
};

export const useGetChunkHighlights = (
  selectedChunk: IChunk | IReferenceChunk,
) => {
  const [size, setSize] = useState({ width: 849, height: 1200 });

  const highlights: IHighlight[] = useMemo(() => {
    return buildChunkHighlights(selectedChunk, size);
  }, [selectedChunk, size]);

  const setWidthAndHeight = (width: number, height: number) => {
    setSize((pre) => {
      if (pre.height !== height || pre.width !== width) {
        return { height, width };
      }
      return pre;
    });
  };

  return { highlights, setWidthAndHeight };
};

export const useFetchNextDocumentList = () => {
  const { knowledgeId } = useGetKnowledgeSearchParams();
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    chunkMethod: '',
    status: '',
    run: '',
    key: '',
    value: '',
    startDate: '',
    endDate: '',
  });
  const { pagination, setPagination } = useGetPaginationWithRouter();
  const [isShowProgress, setIsShowProgress] = useState<boolean>(false); 
  const [docNames, setDocNames] = useState<{
    docName: string;
    status: string;
    percent: number;
  }[]>([]);
  const { id } = useParams();

  const queryResult = useQuery({
    queryKey: ['fetchDocumentAndTaskList', knowledgeId || id, searchFilters, pagination],
    enabled: !!knowledgeId || !!id,
    refetchInterval: 60000,
    queryFn: async () => {
      const kbId = knowledgeId || id;
      if (!kbId) return { docs: [], total: 0, taskList: [] };
      // 1. 获取文档列表
      const ret = await listDocument({
        kbId,
        name: searchFilters.name,
        chunkMethod: searchFilters.chunkMethod,
        status: searchFilters.status,
        run: searchFilters.run || [],
        metadataCondition: {
          conditions: [
            {
              name: searchFilters.key,
              value: searchFilters.value,
              comparison_operator: 'eq',
            },
          ],
          logical_operator: '',
        },
        startDate: searchFilters.startDate,
        endDate: searchFilters.endDate,
        pageSize: pagination.pageSize,
        page: pagination.current,
      } as any);
      let docs: any[] = [];
      let total = 0;
      if (ret.data.code === 0) {
        docs = ret.data.data.records;
        total = ret.data.data.total;
      }
      // 2. 获取任务列表
      const res = await getTaskList(kbId);
      let taskList: any[] = [];
      if (res?.data?.code === 0 && Array.isArray(res.data.data)) {
        taskList = res.data.data.filter((t: any) => t.status !== 'SUCCESS');
      }
      return { docs, total, taskList };
    },
  });

  // 任务提示逻辑移到 useEffect，避免 useQuery options 报错
  // 3. 比对并提示
  React.useEffect(() => {
    const data = queryResult.data;
    if (!data) return;
    const docIds = new Set((data.docs || []).map((d: any) => d.id));
    const needTipTasks = (data.taskList || []).filter((t: any) => !docIds.has(t.dto?.documentId));
    if (needTipTasks.length > 0) {
      setIsShowProgress(true);
      const msg = needTipTasks
      .filter((t: any) => t.status !== 'SUCCESS')
      .map((t: any) => {
        const docName = t.dto?.documentName || '';
        const status = t.status || '';
        const percent = t.progress * 100 || 0;
        return {
          docName,
          status,
          percent,
        };
      });
      setDocNames(msg);
      // const msg = needTipTasks.map((t: any) => {
      //   const docName = t.dto?.documentName || '';
      //   const status = t.status || '';
      //   const msg = t.message || '';
      //   return `文件 ${docName}：${status}${msg ? ' - ' + msg : ''}`;
      // }).join('\n');
      // message.info(msg, 5);
    } else {
      setIsShowProgress(false);
    }
  }, [queryResult.data]);

  const handleSearch = useCallback(
    (filters: typeof searchFilters) => {
      setSearchFilters(filters);
      setPagination({ page: 1 });
    },
    [setPagination],
  );

  const handleReset = useCallback(() => {
    setSearchFilters({
      name: '',
      chunkMethod: '',
      status: '',
      run: '',
      key: '',
      value: '',
      startDate: '',
      endDate: '',
    });
    setPagination({ page: 1 });
  }, [setPagination]);

  return {
    loading: queryResult.isFetching,
    searchFilters,
    documents: queryResult.data?.docs || [],
    pagination: { ...pagination, total: queryResult.data?.total || 0 },
    handleSearch,
    handleReset,
    isShowProgress,
    docNames,
    setPagination,
    taskList: queryResult.data?.taskList || [],
  };
};

export const useSetNextDocumentStatus = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['updateDocumentStatus'],
    mutationFn: async (params: { kb_id?: string; status: boolean; documentId: string }) => {
      const { kb_id, status, documentId } = params;
      const { data } = await kbService.document_change_status({
        datasetId: kb_id,
        ids: [documentId],
        status: Number(status),
      });
      if (data.code === 0) {
        message.success(i18n.t('message.modified'));
        queryClient.invalidateQueries({ queryKey: ['fetchDocumentAndTaskList'] });
      }
      return data;
    },
  });

  return { setDocumentStatus: mutateAsync, data, loading };
};

export const useSaveNextDocumentName = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['saveDocumentName'],
    mutationFn: async ({
      name,
      documentId,
    }: {
      name: string;
      documentId: string;
    }) => {
      const { data } = await kbService.document_rename({
        doc_id: documentId,
        name: name,
      });
      if (data.code === 0) {
        message.success(i18n.t('message.renamed'));
        queryClient.invalidateQueries({ queryKey: ['fetchDocumentAndTaskList'] });
      }
      return data.code;
    },
  });

  return { loading, saveName: mutateAsync, data };
};

export const useCreateNextDocument = () => {
  const { knowledgeId } = useGetKnowledgeSearchParams();
  const { setPaginationParams, page } = useSetPaginationParams();
  const queryClient = useQueryClient();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['createDocument'],
    mutationFn: async (name: string) => {
      const { data } = await kbService.document_create({
        name,
        kb_id: knowledgeId,
      });
      if (data.code === 0) {
        if (page === 1) {
          queryClient.invalidateQueries({ queryKey: ['fetchDocumentAndTaskList'] });
        } else {
          setPaginationParams(); // fetch document list
        }

        message.success(i18n.t('message.created'));
      }
      return data.code;
    },
  });

  return { createDocument: mutateAsync, loading, data };
};

export const useSetNextDocumentParser = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['setDocumentParser'],
    mutationFn: async ({
      parserId,
      documentId,
      parserConfig,
    }: {
      parserId: string;
      documentId: string;
      parserConfig: IChangeParserConfigRequestBody;
    }) => {
      const { data } = await kbService.document_change_parser({
        parser_id: parserId,
        doc_id: documentId,
        parser_config: parserConfig,
      });
      if (data.code === 0) {
        queryClient.invalidateQueries({ queryKey: ['fetchDocumentAndTaskList'] });

        message.success(i18n.t('message.modified'));
      }
      return data.code;
    },
  });

  return { setDocumentParser: mutateAsync, data, loading };
};

export const useUploadNextDocument = () => {
  const queryClient = useQueryClient();
  const { knowledgeId } = useGetKnowledgeSearchParams();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['uploadDocument'],
    mutationFn: async (fileList: UploadFile[]) => {
      const formData = new FormData();
      formData.append('datasetId', knowledgeId);
      fileList.forEach((file: any) => {
        formData.append('files', file);
      });

      try {
        const ret = await kbService.document_upload(formData);
        const code = get(ret, 'data.code');

        if (code === 0 || code === 500) {
          queryClient.invalidateQueries({ queryKey: ['fetchDocumentAndTaskList'], exact: false });
        }
        return ret?.data;
      } catch (error) {
        console.warn(error);
        return {
          code: 500,
          message: error + '',
        };
      }
    },
  });

  return { uploadDocument: mutateAsync, loading, data };
};

export const useNextWebCrawl = () => {
  const { knowledgeId } = useGetKnowledgeSearchParams();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['webCrawl'],
    mutationFn: async ({ name, url }: { name: string; url: string }) => {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('url', url);
      formData.append('kb_id', knowledgeId);

      const ret = await kbService.web_crawl(formData);
      const code = get(ret, 'data.code');
      if (code === 0) {
        message.success(i18n.t('message.uploaded'));
      }

      return code;
    },
  });

  return {
    data,
    loading,
    webCrawl: mutateAsync,
  };
};

export const useRunNextDocument = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['runDocumentByIds'],
    mutationFn: async ({
      documentIds,
      run,
      shouldDelete,
    }: {
      documentIds: string[];
      run: number;
      shouldDelete: boolean;
    }) => {
      queryClient.invalidateQueries({
        queryKey: ['fetchDocumentAndTaskList'],
      });

      const ret = await kbService.document_run({
        document_ids: documentIds,
        run,
        delete: shouldDelete,
      });
      const code = get(ret, 'data.code');
      if (code === 0) {
        queryClient.invalidateQueries({ queryKey: ['fetchDocumentAndTaskList'] });
        message.success(i18n.t('message.operated'));
      }

      return code;
    },
  });

  return { runDocumentByIds: mutateAsync, loading, data };
};

export const useFetchDocumentInfosByIds = () => {
  const [ids, setDocumentIds] = useState<string[]>([]);

  const idList = useMemo(() => {
    return ids.filter((x) => typeof x === 'string' && x !== '');
  }, [ids]);

  const { data } = useQuery<IDocumentInfo[]>({
    queryKey: ['fetchDocumentInfos', idList],
    enabled: idList.length > 0,
    initialData: [],
    queryFn: async () => {
      const { data } = await kbService.document_infos({ doc_ids: idList });
      if (data.code === 0) {
        return data.data;
      }

      return [];
    },
  });

  return { data, setDocumentIds };
};

export const useFetchDocumentThumbnailsByIds = () => {
  const [ids, setDocumentIds] = useState<string[]>([]);
  const { data } = useQuery<Record<string, string>>({
    queryKey: ['fetchDocumentThumbnails', ids],
    enabled: ids.length > 0,
    initialData: {},
    queryFn: async () => {
      const { data } = await kbService.document_thumbnails({ docIds: ids });
      if (data.code === 0) {
        return data.data;
      }
      return {};
    },
  });

  return { data, setDocumentIds };
};

export const useRemoveNextDocument = () => {
  const queryClient = useQueryClient();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['removeDocument'],
    mutationFn: async (documentIds: string | string[]) => {
      const { data } = await kbService.document_rm({ doc_id: documentIds });
      if (data.code === 0) {
        message.success(i18n.t('message.deleted'));
        queryClient.invalidateQueries({ queryKey: ['fetchDocumentAndTaskList'] });
      }
      return data.code;
    },
  });

  return { data, loading, removeDocument: mutateAsync };
};
export const useRemoveNextDocumentKb = () => {
  const queryClient = useQueryClient();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['removeDocumentKb'],
    mutationFn: async ({
      documentIds,
      knowledgeId,
    }: {
      documentIds: string[];
      knowledgeId: string;
    }) => {
      console.log(`knowledgeId,  documentIds`, knowledgeId, documentIds);
      const { data } = await documentRm(knowledgeId, {
        ids: documentIds,
      } as any);
      if (data.code === 0) {
        message.success(i18n.t('message.deleted'));
        queryClient.invalidateQueries({ queryKey: ['fetchDocumentAndTaskList'] });
      }else{
        message.error(data.message);
      }
      return data.code;
    },
  });

  return { data, loading, removeDocument: mutateAsync };
};
export const useDeleteDocument = () => {
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['deleteDocument'],
    mutationFn: async (documentIds: string[]) => {
      const data = await kbService.document_delete({ doc_ids: documentIds });

      return data;
    },
  });

  return { data, loading, deleteDocument: mutateAsync };
};

export const useUploadAndParseDocument = (uploadMethod: string) => {
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['uploadAndParseDocument'],
    mutationFn: async ({
      conversationId,
      fileList,
    }: {
      conversationId: string;
      fileList: UploadFile[];
    }) => {
      try {
        const formData = new FormData();
        formData.append('conversation_id', conversationId);
        fileList.forEach((file: UploadFile) => {
          formData.append('file', file as any);
        });
        if (uploadMethod === 'upload_and_parse') {
          const data = await kbService.upload_and_parse(formData);
          return data?.data;
        }
        const data = await chatService.uploadAndParseExternal(formData);
        return data?.data;
      } catch (error) {}
    },
  });

  return { data, loading, uploadAndParseDocument: mutateAsync };
};

export const useParseDocument = () => {
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['parseDocument'],
    mutationFn: async (url: string) => {
      try {
        const data = await post(api.parse, { url });
        if (data?.data?.code === 0) {
          message.success(i18n.t('message.uploaded'));
        }
        return data;
      } catch (error) {
        message.error('error');
      }
    },
  });

  return { parseDocument: mutateAsync, data, loading };
};

export const useSetDocumentMeta = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['setDocumentMeta'],
    mutationFn: async (params: IDocumentMetaRequestBody) => {
      try {
        const { data } = await kbService.setMeta({
          meta: params.meta,
          doc_id: params.documentId,
        });

        if (data?.code === 0) {
          queryClient.invalidateQueries({ queryKey: ['fetchDocumentAndTaskList'] });

          message.success(i18n.t('message.modified'));
        }
        return data?.code;
      } catch (error) {
        message.error('error');
      }
    },
  });

  return { setDocumentMeta: mutateAsync, data, loading };
};
