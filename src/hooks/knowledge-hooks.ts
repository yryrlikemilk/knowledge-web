import { ResponsePostType } from '@/interfaces/database/base';
import {
  IKnowledge,
  IKnowledgeGraph,
  IRenameTag,
  ITestingResult,
} from '@/interfaces/database/knowledge';
import i18n from '@/locales/config';
import kbService, {
  batch_retrieval_test,
  checkFirstGenerate,
  checkForFileUpdates,
  deleteKnowledgeGraph,
  deleteQuestions,
  exportQuestionCategory,
  generateAiQuestion,
  getAiQuestionCount,
  getAiQuestionCountByDocIds,
  getAllQuestions,
  getCount,
  getGenerateProgress,
  getKnowledgeGraph,
  getKnowledgeRunStatus,
  getRetrievalQuestionCategory,
  getRetrievalTaskInfo,
  getRetrievalTaskQuestionList,
  getRetrievalTaskReport,
  listDataset,
  listTag,
  otherDocGenerateAiQuestion,
  removeTag,
  renameTag,
  saveAiQuestions,
  saveRetrievalTask,
  updateQuestion,
} from '@/services/knowledge-service';
import {
  useInfiniteQuery,
  useIsMutating,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useDebounce } from 'ahooks';
import { message } from 'antd';
import { useState } from 'react';
import { useSearchParams } from 'umi';
import { useHandleSearchChange } from './logic-hooks';
import { useSetPaginationParams } from './route-hook';
export const useKnowledgeBaseId = (): string => {
  const [searchParams] = useSearchParams();
  const knowledgeBaseId = searchParams.get('id');

  return knowledgeBaseId || '';
};

export const useFetchKnowledgeBaseConfiguration = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const { data, isFetching: loading } = useQuery<IKnowledge>({
    queryKey: ['fetchKnowledgeDetail'],
    initialData: {} as IKnowledge,
    gcTime: 0,
    queryFn: async () => {
      const { data } = await kbService.get_kb_detail({
        datasetId: knowledgeBaseId,
      });
      return data?.data ?? {};
    },
  });

  return { data, loading };
};

export const useFetchKnowledgeList = (
  page: number = 1,
  pageSize: number = 10,
  keywords: string = '',
  model: string = '',
  dateRange: [string, string] | null = null,
  refreshFlag: number = 0,
): { list: IKnowledge[]; total: number; loading: boolean } => {
  const { data, isFetching: loading } = useQuery({
    queryKey: [
      'fetchKnowledgeList',
      page,
      pageSize,
      keywords,
      model,
      dateRange,
      refreshFlag,
    ],
    initialData: { kbs: [], total: 0 },
    gcTime: 0,
    queryFn: async () => {
      const body: any = { page, page_size: pageSize, dataset_name: keywords };
      if (model) body.model = model;
      if (dateRange && dateRange[0] && dateRange[1]) {
        body.start_date = dateRange[0];
        body.end_date = dateRange[1];
      }
      console.log(`body`, body);
      const { data } = await listDataset(body);
      // const { data } = await request.post('/api/dataset/list', body);
      return {
        kbs: data?.data?.records ?? [],
        total: data?.data?.total ?? 0,
      };
    },
  });
  return { list: data.kbs, total: data.total, loading };
};

export const useSelectKnowledgeOptions = () => {
  const { list } = useFetchKnowledgeList();

  const options = list?.map((item) => ({
    label: item.name,
    value: item.id,
  }));

  return options;
};

export const useInfiniteFetchKnowledgeList = () => {
  const { searchString, handleInputChange } = useHandleSearchChange();
  const debouncedSearchString = useDebounce(searchString, { wait: 500 });

  const PageSize = 30;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['infiniteFetchKnowledgeList', debouncedSearchString],
    queryFn: async ({ pageParam }) => {
      console.log(``, {
        page: pageParam,
        page_size: PageSize,
        keywords: debouncedSearchString,
      });
      const { data } = await listDataset({
        page: pageParam,
        page_size: PageSize,
        keywords: debouncedSearchString,
      });
      const list = data?.data ?? [];
      return list;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages, lastPageParam) => {
      if (lastPageParam * PageSize <= lastPage.total) {
        return lastPageParam + 1;
      }
      return undefined;
    },
  });
  return {
    data,
    loading: isFetching,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    handleInputChange,
    searchString,
  };
};

export const useCreateKnowledge = () => {
  const queryClient = useQueryClient();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['infiniteFetchKnowledgeList'],
    mutationFn: async (params: { id?: string; name: string }) => {
      const { data = {} } = await kbService.createKb(params);
      if (data.code === 0) {
        message.success(
          i18n.t(`message.${params?.id ? 'modified' : 'created'}`),
        );
        queryClient.invalidateQueries({ queryKey: ['fetchKnowledgeList'] });
      }
      return data;
    },
  });

  return { data, loading, createKnowledge: mutateAsync };
};

export const useDeleteKnowledge = () => {
  const queryClient = useQueryClient();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['deleteKnowledge'],
    mutationFn: async (id: string) => {
      const { data } = await kbService.rmKb({ ids: [id] });
      if (data.code === 0) {
        message.success(i18n.t(`message.deleted`));
        queryClient.invalidateQueries({
          queryKey: ['infiniteFetchKnowledgeList'],
        });
      }
      return data?.data ?? [];
    },
  });

  return { data, loading, deleteKnowledge: mutateAsync };
};

//#region knowledge configuration

export const useUpdateKnowledge = (shouldFetchList = false) => {
  const knowledgeBaseId = useKnowledgeBaseId();
  const queryClient = useQueryClient();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['saveKnowledge'],
    mutationFn: async (params: Record<string, any>) => {
      const { data = {} } = await kbService.updateKb({
        id: params?.kb_id ? params?.kb_id : knowledgeBaseId,
        ...params,
      });
      if (data.code === 0) {
        message.success(i18n.t(`message.updated`));
        if (shouldFetchList) {
          queryClient.invalidateQueries({
            queryKey: ['fetchKnowledgeListByPage'],
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ['fetchKnowledgeDetail'] });
        }
      }
      return data;
    },
  });

  return { data, loading, saveKnowledgeConfiguration: mutateAsync };
};

//#endregion

//#region Retrieval testing

export const useTestChunkRetrieval = (): ResponsePostType<ITestingResult> & {
  testChunk: (...params: any[]) => void;
} => {
  const knowledgeBaseId = useKnowledgeBaseId();
  const { page, size: pageSize } = useSetPaginationParams();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['testChunk'],
    gcTime: 0,
    mutationFn: async (values: any) => {
      const questions = Array.isArray(values.question)
        ? values.question
        : [values.question];
      const { data } = await batch_retrieval_test({
        knowledge_ids: values.kb_id ? values.kb_id : [knowledgeBaseId],
        query: questions,
        keyword: false,
        document_ids: values.doc_ids,
        highlight: false,
        rerank_id: values.rerank_id,
        similarity_threshold: values.similarity_threshold,
        chunk_deduplication_coefficient: 0,
        ...(values.top_k
          ? {
              retrieval_setting: {
                top_k: parseInt(values.top_k, 10),
              },
            }
          : {}),
        ...(values.vector_similarity_weight !== null &&
        values.vector_similarity_weight !== undefined
          ? { vector_similarity_weight: 1 - values.vector_similarity_weight }
          : {}),
        metadata_condition: {
          conditions: (
            values.metaList as Array<{ key: string; value: string }>
          )?.map((item) => ({
            name: item.key,
            value: item.value,
            comparison_operator: 'eq',
          })),
        },
        page,
        page_size: pageSize,
        idOfQuery: values.idOfQuery !== undefined ? values.idOfQuery : 0,
      });
      console.log('data312312', data);
      if (data.code === 0) {
        const res = data.data;
        // 处理所有问题的结果
        console.log('resres', res);
        const allResults = res.map((item: any, index: number) => ({
          query: item.query || `问题${index + 1}`,
          chunks: item.difyResultDto.records.map((record: any) => ({
            chunk_id: record.id,
            content_ltks: record.content,
            doc_id: record.metadata.document_id,
            docnm_kwd: record.metadata.document_name,
            doc_type_kwd: record.doc_type_kwd,
            image_id: record.metadata.image_id,
            important_kwd: record.metadata.important_keywords,
            kb_id: record.metadata.dataset_id,
            positions: record.metadata.positions,
            similarity: record.score,
            // 保持向后兼容，为search页面提供所需字段
            highlight: record.highlight || record.content,
            content_with_weight: record.content_with_weight || record.content,
            img_id: record.metadata.image_id,
            ...record,
          })),
          documents: item.difyResultDto.doc_aggs,
          total: item.difyResultDto.records.length,
        }));
        console.log('allResultsallResults', allResults);
        console.log(`allResults11111111111111`, allResults, res);
        return {
          ...res,
          allResults,
          chunks: allResults[0]?.chunks || [],
          documents: allResults[0]?.documents || [],
          total: allResults[0]?.total || 0,
        };
      }
      return (
        data?.data ?? {
          allResults: [],
          chunks: [],
          documents: [],
          total: 0,
        }
      );
    },
  });

  return {
    data: data ?? { allResults: [], chunks: [], documents: [], total: 0 },
    loading,
    testChunk: mutateAsync,
  };
};

export const useTestChunkAllRetrieval = (): ResponsePostType<ITestingResult> & {
  testChunkAll: (...params: any[]) => void;
} => {
  const knowledgeBaseId = useKnowledgeBaseId();
  const { page, size: pageSize } = useSetPaginationParams();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['testChunkAll'],
    gcTime: 0,
    mutationFn: async (values: any) => {
      console.log(`values222`, values, knowledgeBaseId);
      const questions = Array.isArray(values.question)
        ? values.question
        : [values.question];
      const { data } = await batch_retrieval_test({
        knowledge_ids: values.kb_id ? values.kb_id : [knowledgeBaseId],
        query: questions,
        keyword: false,
        document_ids: values.doc_ids,
        highlight: false,
        //joinRule:'or',
        rerank_id: values.rerank_id,
        similarity_threshold: values.similarity_threshold,
        chunk_deduplication_coefficient: 0,
        ...(values.top_k
          ? {
              retrieval_setting: {
                top_k: parseInt(values.top_k, 10),
              },
            }
          : {}),
        ...(values.vector_similarity_weight !== null &&
        values.vector_similarity_weight !== undefined
          ? { vector_similarity_weight: 1 - values.vector_similarity_weight }
          : {}),
        metadata_condition: {
          conditions: (
            values.metaList as Array<{ key: string; value: string }>
          )?.map((item) => ({
            name: item.key,
            value: item.value,
            comparison_operator: 'eq',
          })),
        },
        page,
        page_size: pageSize,
        idOfQuery: values.idOfQuery !== undefined ? values.idOfQuery : 0, // 添加 idOfQuery 参数
      });
      if (data.code === 0) {
        const res = data.data;
        // 处理所有问题的结果
        const allResults = res.map((item: any, index: number) => ({
          query: item.query || `问题${index + 1}`,
          chunks: item.difyResultDto.records.map((record: any) => ({
            chunk_id: record.id,
            content_ltks: record.content,
            doc_id: record.metadata.document_id,
            docnm_kwd: record.metadata.document_name,
            doc_type_kwd: record.doc_type_kwd,
            image_id: record.metadata.image_id,
            important_kwd: record.metadata.important_keywords,
            kb_id: record.metadata.dataset_id,
            positions: record.metadata.positions,
            similarity: record.score,
            // 保持向后兼容，为search页面提供所需字段
            highlight: record.highlight || record.content,
            content_with_weight: record.content_with_weight || record.content,
            img_id: record.metadata.image_id,
            ...record,
          })),
          documents: item.difyResultDto.doc_aggs,
          total: item.difyResultDto.records.length,
        }));

        console.log(`allResults2222`, allResults, res);
        return {
          ...res,
          allResults,
          chunks: allResults[0]?.chunks || [],
          documents: allResults[0]?.documents || [],
          total: allResults[0]?.total || 0,
        };
      }
      return (
        data?.data ?? {
          allResults: [],
          chunks: [],
          documents: [],
          total: 0,
        }
      );
    },
  });

  return {
    data: data ?? { allResults: [], chunks: [], documents: [], total: 0 },
    loading,
    testChunkAll: mutateAsync,
  };
};

export const useChunkIsTesting = () => {
  return useIsMutating({ mutationKey: ['testChunk'] }) > 0;
};

export const useSelectTestingResult = (): ITestingResult => {
  const data = useMutationState({
    filters: { mutationKey: ['testChunk'] },
    select: (mutation) => {
      console.log(` mutation.state.data;testChunk`, mutation.state.data);

      return mutation.state.data;
    },
  });
  console.log(data);
  return (data.at(-1) ?? {
    chunks: [],
    documents: [],
    total: 0,
  }) as ITestingResult;
};

export const useSelectIsTestingSuccess = () => {
  const status = useMutationState({
    filters: { mutationKey: ['testChunk'] },
    select: (mutation) => {
      console.log(` mutation.state.status;testChunk`, mutation.state.status);

      return mutation.state.status;
    },
  });
  return status.at(-1) === 'success';
};

export const useAllTestingSuccess = () => {
  const status = useMutationState({
    filters: { mutationKey: ['testChunkAll'] },
    select: (mutation) => {
      console.log(` mutation.state.status;`, mutation.state.status);

      return mutation.state.status;
    },
  });
  return status.at(-1) === 'success';
};

export const useAllTestingResult = (): ITestingResult => {
  const data = useMutationState({
    filters: { mutationKey: ['testChunkAll'] },
    select: (mutation) => {
      console.log(` mutation.state.data;`, mutation.state.data);
      return mutation.state.data;
    },
  });
  return (data.at(-1) ?? {
    chunks: [],
    documents: [],
    total: 0,
  }) as ITestingResult;
};

// Expose richer loading/status helpers for testChunkAll to drive spinners in UI
export const useAllTestingStatus = () => {
  const statusList = useMutationState({
    filters: { mutationKey: ['testChunkAll'] },
    select: (mutation) =>
      mutation.state.status as 'idle' | 'pending' | 'error' | 'success',
  });
  const latest = statusList.at(-1);
  return latest ?? 'idle';
};

export const useAllTestingPending = () => {
  const status = useAllTestingStatus();
  return status === 'pending';
};

export const useAllTestingError = () => {
  const errorList = useMutationState({
    filters: { mutationKey: ['testChunkAll'] },
    select: (mutation) => (mutation.state as any)?.error as unknown,
  });
  return errorList.at(-1) ?? null;
};

export const useAllTestingResultWithStatus = () => {
  const result = useAllTestingResult();
  const status = useAllTestingStatus();
  const isLoading = status === 'pending';
  const isSuccess = status === 'success';
  const isError = status === 'error';
  const error = useAllTestingError();
  return { result, status, isLoading, isSuccess, isError, error };
};
// 导出问题分类
export const useExportQuestionCategory = () => {
  const { mutateAsync, isPending: loading } = useMutation({
    mutationFn: async (taskId: string) => {
      if (!taskId) throw new Error('任务ID不能为空');
      // 返回 { data: Blob, filename: string }
      return await exportQuestionCategory(taskId);
    },
  });

  return { exportQuestionCategory: mutateAsync, loading };
};

//#endregion

//#region tags

export const useFetchTagList = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const { data, isFetching: loading } = useQuery<Array<[string, number]>>({
    queryKey: ['fetchTagList'],
    initialData: [],
    gcTime: 0, // https://tanstack.com/query/latest/docs/framework/react/guides/caching?from=reactQueryV3
    queryFn: async () => {
      const { data } = await listTag(knowledgeBaseId);
      const list = data?.data || [];
      return list;
    },
  });

  return { list: data, loading };
};

export const useDeleteTag = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const queryClient = useQueryClient();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['deleteTag'],
    mutationFn: async (tags: string[]) => {
      const { data } = await removeTag(knowledgeBaseId, tags);
      if (data.code === 0) {
        message.success(i18n.t(`message.deleted`));
        queryClient.invalidateQueries({
          queryKey: ['fetchTagList'],
        });
      }
      return data?.data ?? [];
    },
  });

  return { data, loading, deleteTag: mutateAsync };
};

export const useRenameTag = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const queryClient = useQueryClient();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['renameTag'],
    mutationFn: async (params: IRenameTag) => {
      const { data } = await renameTag(knowledgeBaseId, params);
      if (data.code === 0) {
        message.success(i18n.t(`message.modified`));
        queryClient.invalidateQueries({
          queryKey: ['fetchTagList'],
        });
      }
      return data?.data ?? [];
    },
  });

  return { data, loading, renameTag: mutateAsync };
};

export const useTagIsRenaming = () => {
  return useIsMutating({ mutationKey: ['renameTag'] }) > 0;
};

export const useFetchTagListByKnowledgeIds = () => {
  const [knowledgeIds, setKnowledgeIds] = useState<string[]>([]);

  const { data, isFetching: loading } = useQuery<Array<[string, number]>>({
    queryKey: ['fetchTagListByKnowledgeIds'],
    enabled: knowledgeIds.length > 0,
    initialData: [],
    gcTime: 0, // https://tanstack.com/query/latest/docs/framework/react/guides/caching?from=reactQueryV3
    queryFn: async () => {
      const { data } = await kbService.listTagByKnowledgeIds({
        kb_ids: knowledgeIds.join(','),
      });
      const list = data?.data || [];
      return list;
    },
  });

  return { list: data, loading, setKnowledgeIds };
};

//#endregion

export function useFetchKnowledgeGraph() {
  const knowledgeBaseId = useKnowledgeBaseId();

  const { data, isFetching: loading } = useQuery<IKnowledgeGraph>({
    queryKey: ['fetchKnowledgeGraph', knowledgeBaseId],
    initialData: { graph: {}, mind_map: {} } as IKnowledgeGraph,
    enabled: !!knowledgeBaseId,
    gcTime: 0,
    queryFn: async () => {
      const { data } = await getKnowledgeGraph(knowledgeBaseId);
      return data?.data;
    },
  });

  return { data, loading };
}

export const useRemoveKnowledgeGraph = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const queryClient = useQueryClient();
  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['removeKnowledgeGraph'],
    mutationFn: async () => {
      const { data } = await deleteKnowledgeGraph(knowledgeBaseId);
      if (data.code === 0) {
        message.success(i18n.t(`message.deleted`));
        queryClient.invalidateQueries({
          queryKey: ['fetchKnowledgeGraph'],
        });
      }
      return data?.code;
    },
  });

  return { data, loading, removeKnowledgeGraph: mutateAsync };
};

export const useFetchKnowledgeCount = () => {
  const {
    data,
    isFetching: loading,
    refetch,
  } = useQuery({
    queryKey: ['fetchKnowledgeCount'],
    queryFn: async () => {
      const { data } = await getCount();
      return data?.data || { kbCount: 0, docCount: 0, embdCount: 0 };
    },
    gcTime: 0,
    initialData: { kbCount: 0, docCount: 0, embdCount: 0 },
  });
  return { ...data, loading, refetch };
};

export const useAllTestingLoading = () => {
  return useIsMutating({ mutationKey: ['testChunkAll'] }) > 0;
};

export const useFetchKnowledgeRunStatus = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const { data, isFetching: loading } = useQuery({
    queryKey: ['fetchKnowledgeRunStatus', knowledgeBaseId],
    enabled: !!knowledgeBaseId,
    refetchInterval: 60000, // 30秒轮询一次
    queryFn: async () => {
      if (!knowledgeBaseId) return { doc_ids: [], run: 0 };
      const response = await getKnowledgeRunStatus(knowledgeBaseId);
      if (response?.data?.code === 0) {
        return response.data.data;
      }
      return { doc_ids: [], run: 0 };
    },
  });

  return {
    runStatus: data || { doc_ids: [], run: 0 },
    loading,
  };
};

export const useFetchFileUpdates = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const {
    data,
    isFetching: loading,
    refetch,
  } = useQuery({
    queryKey: ['fetchFileUpdates', knowledgeBaseId],
    enabled: !!knowledgeBaseId,
    queryFn: async () => {
      console.log(`knowledgeBaseId11111111`, knowledgeBaseId);
      if (!knowledgeBaseId)
        return { hasUpdates: false, modifiedDocuments: [], newDocuments: [] };
      const response = await checkForFileUpdates(knowledgeBaseId);
      if (response?.data?.code === 0) {
        return response.data.data;
      }
      return { hasUpdates: false, modifiedDocuments: [], newDocuments: [] };
    },
  });

  return {
    fileUpdates: data || {
      hasUpdates: false,
      modifiedDocuments: [],
      newDocuments: [],
    },
    loading,
    refetch,
  };
};

export const useFetchPageList = (
  page: number = 1,
  pageSize: number = 10,
  filters: {
    name?: string;
    auto_generate?: string;
    status?: string;
  } = {},
) => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const { data, isFetching: loading } = useQuery({
    queryKey: ['fetchPageList', knowledgeBaseId, page, pageSize, filters],
    enabled: !!knowledgeBaseId,
    refetchInterval: 60000,
    queryFn: async () => {
      if (!knowledgeBaseId)
        return { current: 0, pages: 0, records: [], size: 0, total: 0 };
      const response = await kbService.pageList({
        kb_id: knowledgeBaseId,
        page,
        page_size: pageSize,
        name: filters.name || '',
        auto_generate: filters.auto_generate || '',
        status: filters.status || '',
      });
      if (response?.data?.code === 0) {
        return response.data.data;
      }
      return {
        has_task: 'false',
        record: { current: 0, pages: 0, records: [], size: 0, total: 0 },
      };
    },
  });

  return {
    pageList: data || { current: 0, pages: 0, records: [], size: 0, total: 0 },
    loading,
  };
};

export const useFetchRetrievalQuestionPageList = (
  page: number = 1,
  pageSize: number = 10,
  filters: {
    question_text?: string;
    auto_generate?: string;
    status?: string;
    category_sub?: string;
  } = {},
) => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const { data, isFetching: loading } = useQuery({
    queryKey: [
      'fetchRetrievalQuestionPageList',
      knowledgeBaseId,
      page,
      pageSize,
      filters,
    ],
    enabled: !!knowledgeBaseId,
    queryFn: async () => {
      if (!knowledgeBaseId)
        return { current: 0, pages: 0, records: [], size: 0, total: 0 };
      const response = await kbService.retrievalQuestionPageList({
        kb_id: knowledgeBaseId,
        page,
        page_size: pageSize,
        question_text: filters.question_text || '',
        auto_generate: filters.auto_generate || '',
        status: filters.status || '',
        category_sub: filters.category_sub || '',
      });
      if (response?.data?.code === 0) {
        return response.data.data;
      }
      return { current: 0, pages: 0, records: [], size: 0, total: 0 };
    },
  });

  return {
    questionPageList: data || {
      current: 0,
      pages: 0,
      records: [],
      size: 0,
      total: 0,
    },
    loading,
  };
};

// 获取问题分类（用于筛选）
export const useFetchQuestionCategory = () => {
  const knowledgeBaseId = useKnowledgeBaseId();
  const { data, isFetching: loading } = useQuery({
    queryKey: ['fetchRetrievalQuestionCategory', knowledgeBaseId],
    enabled: !!knowledgeBaseId,
    queryFn: async () => {
      if (!knowledgeBaseId) return [] as string[];
      const resp = await getRetrievalQuestionCategory(knowledgeBaseId);
      if (resp?.data?.code === 0) {
        return resp.data.data?.category || [];
      }
      return [] as string[];
    },
  });
  return { categories: data || [], loading };
};

// 获取全部问题列表（AI与手工）
export const useFetchAllQuestions = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const {
    data,
    isFetching: loading,
    refetch,
  } = useQuery({
    queryKey: ['fetchAllQuestions', knowledgeBaseId],
    enabled: !!knowledgeBaseId,
    queryFn: async () => {
      if (!knowledgeBaseId) return { autoQuestion: [], manualQuestion: [] };
      const resp = await getAllQuestions(knowledgeBaseId);
      if (resp?.data?.code === 0) {
        return resp.data.data;
      }
      return { autoQuestion: [], manualQuestion: [] };
    },
  });

  return {
    allQuestions: data || { autoQuestion: [], manualQuestion: [] },
    loading,
    refetch,
  };
};

export const useAddQuestions = () => {
  const knowledgeBaseId = useKnowledgeBaseId();
  const queryClient = useQueryClient();

  const {
    data,
    isPending: loading,
    mutateAsync,
  } = useMutation({
    mutationKey: ['addQuestions'],
    mutationFn: async (questions: string[]) => {
      if (!knowledgeBaseId) throw new Error('知识库ID不能为空');
      const response = await kbService.addQuestions({
        questions,
        kb_id: knowledgeBaseId,
      });
      if (response?.data?.code === 0) {
        message.success('问题创建成功');
        // 刷新问题列表
        queryClient.invalidateQueries({
          queryKey: ['fetchRetrievalQuestionPageList'],
        });
        return response.data.data;
      }
      throw new Error(response?.data?.message || '创建问题失败');
    },
  });

  return {
    data,
    loading,
    addQuestions: mutateAsync,
  };
};

// AI生成问题
export const useGenerateAiQuestion = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const { mutateAsync, isPending: loading } = useMutation({
    mutationFn: async (questionCount: number) => {
      if (!knowledgeBaseId) throw new Error('知识库ID不能为空');
      const response = await generateAiQuestion({
        kb_id: knowledgeBaseId,
        question_count: questionCount,
      });

      if (response?.data?.code === 0) {
        return response.data.data;
      }
      throw new Error(response?.data?.message || 'AI生成问题失败');
    },
  });

  return {
    loading,
    generateAiQuestion: mutateAsync,
  };
};

// 轮询获取AI问题生成进度
export const useGenerateProgress = (historyId: string | null) => {
  const {
    data,
    isFetching: loading,
    refetch,
  } = useQuery({
    queryKey: ['fetchGenerateProgress', historyId],
    enabled: !!historyId,
    refetchInterval: (query) => {
      // 如果进度为1（100%）或 -1（异常/网络错误），停止轮询
      const p = query.state.data?.progress;
      if (p === 1 || p === -1) {
        return false;
      }
      // 否则每2秒轮询一次
      return 2000;
    },
    queryFn: async () => {
      if (!historyId) return { progress: 0, aiQuestions: [], id: '' };
      const response = await getGenerateProgress(historyId);
      if (response?.data?.code === 0) {
        return response.data.data;
      }
      return { progress: 0, aiQuestions: [], id: '' };
    },
  });

  return {
    progressData: data || { progress: 0, aiQuestions: [], id: '' },
    loading,
    refetch,
  };
};

// 轮询获取检索任务进度
export const useRetrievalTaskProgress = (taskId: string | null) => {
  const {
    data,
    isFetching: loading,
    refetch,
  } = useQuery({
    queryKey: ['fetchRetrievalTaskProgress', taskId],
    enabled: !!taskId,
    refetchInterval: (query) => {
      // 如果进度为1（100%）或状态为完成，停止轮询
      const progress = query.state.data?.progress;
      // const status = query.state.data?.status;
      if (progress === 1) {
        return false;
      }
      // 否则每2秒轮询一次
      return 2000;
    },
    queryFn: async () => {
      if (!taskId) return { progress: 0, status: 0, id: '' };
      const response = await getRetrievalTaskInfo(taskId);
      if (response?.data?.code === 0) {
        return response.data.data;
      }
      return { progress: 0, status: 0, id: '' };
    },
  });

  return {
    taskData: data || { progress: 0, status: 0, id: '' },
    loading,
    refetch,
  };
};

// 保存AI生成的问题
export const useSaveAiQuestions = () => {
  const knowledgeBaseId = useKnowledgeBaseId();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending: loading } = useMutation({
    mutationFn: async (params: { aiQuestions: any[]; historyId: string }) => {
      if (!knowledgeBaseId) throw new Error('知识库ID不能为空');

      const response = await saveAiQuestions({
        ai_generate_questions: params.aiQuestions,
        kb_id: knowledgeBaseId,
        history_id: params.historyId,
      });

      if (response?.data?.code === 0) {
        message.success('问题添加成功');
        // 刷新问题列表
        queryClient.invalidateQueries({
          queryKey: ['fetchRetrievalQuestionPageList'],
        });
        queryClient.invalidateQueries({
          queryKey: ['fetchAllQuestions'],
        });
        return response.data.data;
      }
      throw new Error(response?.data?.message || '保存问题失败');
    },
  });

  return {
    loading,
    saveAiQuestions: mutateAsync,
  };
};

// 保存检索任务
export const useSaveRetrievalTask = () => {
  const knowledgeBaseId = useKnowledgeBaseId();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending: loading } = useMutation({
    mutationFn: async (params: {
      task_name: string;
      test_ques_ids: string[];
      selectedQuestionsData?: Array<{ id: string; question_text: string }>;
      similarity_threshold: number;
      top_k: number;
      rerank_id: string;
      vector_similarity_weight: number;
    }) => {
      if (!knowledgeBaseId) throw new Error('知识库ID不能为空');

      // 提取并转换questions数据
      const questions =
        params.selectedQuestionsData ||
        params.test_ques_ids.map((id) => ({
          question_id: id,
          question_text: '',
        }));
      const response = await saveRetrievalTask({
        kb_id: knowledgeBaseId,
        task_name: params.task_name,
        similarity_threshold: params.similarity_threshold,
        vector_similarity_weight: params.vector_similarity_weight,
        rerank_id: params.rerank_id,
        top_k: params.top_k,
        questions: questions.map((q: any) => ({
          question_id: q.question_id || q.id,
          question_text: q.question_text,
        })),
      });

      if (response?.data?.code === 0) {
        // 刷新任务列表
        queryClient.invalidateQueries({ queryKey: ['fetchPageList'] });
        return response.data.data;
      }
      throw new Error(response?.data?.message || '创建评估任务失败');
    },
  });

  return {
    loading,
    saveRetrievalTask: mutateAsync,
  };
};

// 更新问题
export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending: loading } = useMutation({
    mutationFn: async (params: { id: string; question_text: string }) => {
      const response = await updateQuestion({
        id: params.id,
        question_text: params.question_text,
      });

      if (response?.data?.code === 0) {
        message.success('问题更新成功');
        // 刷新问题列表
        queryClient.invalidateQueries({
          queryKey: ['fetchRetrievalQuestionPageList'],
        });
        return response.data.data;
      }
      throw new Error(response?.data?.message || '更新问题失败');
    },
  });

  return {
    loading,
    updateQuestion: mutateAsync,
  };
};

// 删除问题
export const useDeleteQuestions = () => {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending: loading } = useMutation({
    mutationFn: async (questionIds: string[]) => {
      const response = await deleteQuestions({
        question_ids: questionIds,
      });

      if (response?.data?.code === 0) {
        message.success('删除成功');
        // 刷新问题列表
        queryClient.invalidateQueries({
          queryKey: ['fetchRetrievalQuestionPageList'],
        });
        return response.data.data;
      }
      throw new Error(response?.data?.message || '删除失败');
    },
  });

  return {
    loading,
    deleteQuestions: mutateAsync,
  };
};

// 获取AI问题生成限制
export const useFetchAiQuestionCount = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const {
    data,
    isFetching: loading,
    refetch,
  } = useQuery({
    queryKey: ['fetchAiQuestionCount', knowledgeBaseId],
    enabled: !!knowledgeBaseId,
    queryFn: async () => {
      if (!knowledgeBaseId) return { limitCount: 0, recommendCount: 0 };
      const response = await getAiQuestionCount({
        kb_id: knowledgeBaseId,
        doc_ids: [],
      });
      if (response?.data?.code === 0) {
        return response.data.data;
      }
      return { limitCount: 0, recommendCount: 0 };
    },
  });

  return {
    questionCount: data || { limitCount: 0, recommendCount: 0 },
    loading,
    refetch,
  };
};

// 基于选中文档ID获取AI题目数量限制
export const useFetchAiQuestionCountByDocIds = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const {
    data,
    isFetching: loading,
    refetch,
  } = useQuery({
    queryKey: ['fetchAiQuestionCountByDocIds', knowledgeBaseId],
    enabled: false,
    queryFn: async () => ({ limitCount: 0, recommendCount: 0 }),
  });

  const fetchCount = async (docIds: string[]) => {
    if (!knowledgeBaseId) return { limitCount: 0, recommendCount: 0 };
    const response = await getAiQuestionCountByDocIds({
      kb_id: knowledgeBaseId,
      doc_ids: docIds,
    });
    if (response?.data?.code === 0) {
      return response.data.data as {
        limitCount: number;
        recommendCount: number;
      };
    }
    return { limitCount: 0, recommendCount: 0 };
  };

  return {
    data: data || { limitCount: 0, recommendCount: 0 },
    loading,
    refetch,
    fetchCount,
  };
};

// 选中文档生成问题
export const useOtherDocGenerateAiQuestion = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const { mutateAsync, isPending: loading } = useMutation({
    mutationFn: async (params: {
      doc_ids: string[];
      question_count: number;
    }) => {
      if (!knowledgeBaseId) throw new Error('知识库ID不能为空');
      const response = await otherDocGenerateAiQuestion({
        kb_id: knowledgeBaseId,
        doc_ids: params.doc_ids,
        question_count: params.question_count,
      });
      if (response?.data?.code === 0) {
        return response.data.data;
      }
      throw new Error(response?.data?.message || '生成问题失败');
    },
  });

  return { loading, otherDocGenerateAiQuestion: mutateAsync };
};

// 检查首次生成状态
export const useFetchCheckFirstGenerate = () => {
  const knowledgeBaseId = useKnowledgeBaseId();

  const {
    data,
    isFetching: loading,
    refetch,
  } = useQuery({
    queryKey: ['fetchCheckFirstGenerate', knowledgeBaseId],
    enabled: false, // 默认不自动执行，只在需要时手动调用
    queryFn: async () => {
      if (!knowledgeBaseId) return 0;
      const response = await checkFirstGenerate(knowledgeBaseId);
      if (response?.data?.code === 0) {
        return response.data.data;
      }
      return 0;
    },
  });

  return {
    firstGenerateStatus: data || 0,
    loading,
    refetch,
  };
};

// 获取检索任务报告
export const useFetchRetrievalTaskReport = (
  taskId?: string,
  page: number = 0,
  pageSize: number = 0,
) => {
  const {
    data,
    isFetching: loading,
    refetch,
  } = useQuery({
    queryKey: ['fetchRetrievalTaskReport', taskId, page, pageSize],
    enabled: !!taskId,
    queryFn: async () => {
      if (!taskId)
        return {
          accuracy_rate: 0,
          answerable_rate: 0,
          create_time: '',
          question_count: 0,
          score: 0,
          task_id: '',
          update_time: '',
        };
      const response = await getRetrievalTaskReport({
        task_id: taskId,
        ai_generate: true,
        category: '',
        page,
        page_size: pageSize,
        result: 0,
      });
      if (response?.data?.code === 0) {
        return response.data.data;
      }
      return {
        accuracy_rate: 0,
        answerable_rate: 0,
        create_time: '',
        question_count: 0,
        score: 0,
        task_id: '',
        update_time: '',
      };
    },
  });

  return {
    reportData: data || {
      accuracy_rate: 0,
      answerable_rate: 0,
      create_time: '',
      question_count: 0,
      score: 0,
      task_id: '',
      update_time: '',
    },
    loading,
    refetch,
  };
};

// 获取检索任务问题列表
export const useFetchRetrievalTaskQuestionList = (
  taskId?: string,
  page: number = 1,
  pageSize: number = 10,
  aiGenerate?: boolean,
  category?: string,
  result?: number,
) => {
  const {
    data,
    isFetching: loading,
    refetch,
  } = useQuery({
    queryKey: [
      'fetchRetrievalTaskQuestionList',
      taskId,
      page,
      pageSize,
      aiGenerate,
      category,
      result,
    ],
    enabled: !!taskId,
    queryFn: async () => {
      if (!taskId)
        return {
          page_result: {
            current: 0,
            pages: 0,
            records: [],
            size: 0,
            total: 0,
          },
          statistics: {
            ai_generate_category: [],
            ai_generate_count: 0,
            manual_input_count: 0,
            total_question_count: 0,
          },
        };
      const response = await getRetrievalTaskQuestionList({
        task_id: taskId,
        ai_generate: aiGenerate,
        category: category || '',
        page,
        page_size: pageSize,
        result: result || 0,
      });
      if (response?.data?.code === 0) {
        return response.data.data;
      }
      return {
        page_result: {
          current: 0,
          pages: 0,
          records: [],
          size: 0,
          total: 0,
        },
        statistics: {
          ai_generate_category: [],
          ai_generate_count: 0,
          manual_input_count: 0,
          total_question_count: 0,
        },
      };
    },
  });

  return {
    questionListData: data || {
      page_result: {
        current: 0,
        pages: 0,
        records: [],
        size: 0,
        total: 0,
      },
      statistics: {
        ai_generate_category: [],
        ai_generate_count: 0,
        manual_input_count: 0,
        total_question_count: 0,
      },
    },
    loading,
    refetch,
  };
};
