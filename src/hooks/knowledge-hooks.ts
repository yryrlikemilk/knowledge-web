import { ResponsePostType } from '@/interfaces/database/base';
import {
  IKnowledge,
  IKnowledgeGraph,
  IRenameTag,
  ITestingResult,
} from '@/interfaces/database/knowledge';
import i18n from '@/locales/config';
import kbService, {
  deleteKnowledgeGraph,
  getCount,
  getKnowledgeGraph,
  listDataset,
  listTag,
  removeTag,
  renameTag,
    batch_retrieval_test,
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
      const { data }  = await batch_retrieval_test({
        knowledge_ids: values.kb_id ? values.kb_id : [knowledgeBaseId],
        query: values.question,
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
        vector_similarity_weight:1- values.vector_similarity_weight,
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
      console.log('data312312',data)
      if (data.code === 0) {
        const res = data.data;
        // 处理所有问题的结果
        console.log('resres',res)
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
            ...record,
          })),
          documents: item.difyResultDto.doc_aggs,
          total: item.difyResultDto.records.length,
        }));
        console.log('allResultsallResults',allResults)
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
      const { data } = await batch_retrieval_test({
        knowledge_ids: values.kb_id ? values.kb_id : [knowledgeBaseId],
        query: values.question,
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
        vector_similarity_weight: 1- values.vector_similarity_weight,
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
    select: (mutation) => mutation.state.status as
      | 'idle'
      | 'pending'
      | 'error'
      | 'success',
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
