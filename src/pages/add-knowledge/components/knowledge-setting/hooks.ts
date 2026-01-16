import { LlmModelType } from '@/constants/knowledge';
import { useSetModalState } from '@/hooks/common-hooks';
import {
  useFetchKnowledgeBaseConfiguration,
  useUpdateKnowledge,
} from '@/hooks/knowledge-hooks';
import { useSelectLlmOptionsByModelType } from '@/hooks/llm-hooks';
import { useNavigateToDataset } from '@/hooks/route-hook';
import { useSelectParserList } from '@/hooks/user-setting-hooks';
import {
  getBase64FromUploadFileList,
  getUploadFileListFromBase64,
} from '@/utils/file-util';
import { useIsFetching } from '@tanstack/react-query';
import { Form, UploadFile } from 'antd';
import { FormInstance } from 'antd/lib';
import pick from 'lodash/pick';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'umi';

export const useSubmitKnowledgeConfiguration = (form: FormInstance) => {
  const { saveKnowledgeConfiguration, loading } = useUpdateKnowledge();
  const navigateToDataset = useNavigateToDataset();

  const submitKnowledgeConfiguration = useCallback(async () => {
    const values = await form.validateFields();
    const avatar = await getBase64FromUploadFileList(values.avatar);
    const obj = {
      ...values,
      parser_config: {
        children_delimiter: '',
        enable_children: false,
        enable_metadata: false,
        image_context_size: 0,
        image_table_context_window: 0,
        metadata: [],
        mineru_formula_enable: true,
        mineru_lang: 'Chinese',
        mineru_parse_method: 'auto',
        mineru_table_enable: true,
        overlapped_percent: 0,
        table_context_size: 0,
        toc_extraction: false,
        topn_tags: 3,
        ...values.parser_config,
      },
    };
    saveKnowledgeConfiguration({
      connectors: [],
      language: 'chinese',
      pipeline_id: '',
      ...obj,

      avatar,
    });
    navigateToDataset();
  }, [saveKnowledgeConfiguration, form, navigateToDataset]);

  return {
    submitKnowledgeConfiguration,
    submitLoading: loading,
    navigateToDataset,
  };
};

// The value that does not need to be displayed in the analysis method Select
const HiddenFields = ['email', 'picture', 'audio'];

export function useSelectChunkMethodList() {
  const parserList = useSelectParserList();

  return parserList.filter((x) => !HiddenFields.some((y) => y === x.value));
}

export function useSelectEmbeddingModelOptions() {
  const allOptions = useSelectLlmOptionsByModelType();
  console.log('useSelectEmbeddingModelOptions - allOptions:', allOptions);
  return allOptions[LlmModelType.Embedding];
}

export function useHasParsedDocument() {
  const { data: knowledgeDetails } = useFetchKnowledgeBaseConfiguration();
  const { id } = useParams();
  console.log(`id-----`, id);
  // 如果是创建新知识库（没有 id），则不禁用选择
  if (!id) {
    return false;
  }

  return knowledgeDetails.chunk_num > 0;
}

export const useFetchKnowledgeConfigurationOnMount = (form: FormInstance) => {
  const { data: knowledgeDetails } = useFetchKnowledgeBaseConfiguration();

  useEffect(() => {
    const fileList: UploadFile[] = getUploadFileListFromBase64(
      knowledgeDetails.avatar,
    );
    form.setFieldsValue({
      ...pick(knowledgeDetails, [
        'description',
        'name',
        'permission',
        'embd_id',
        'parser_id',
        'language',
        'parser_config',
        'pagerank',
      ]),
      avatar: fileList,
    });
  }, [form, knowledgeDetails]);

  return knowledgeDetails;
};

export const useSelectKnowledgeDetailsLoading = () =>
  useIsFetching({ queryKey: ['fetchKnowledgeDetail'] }) > 0;

export const useHandleChunkMethodChange = () => {
  const [form] = Form.useForm();
  const chunkMethod = Form.useWatch('parser_id', form);

  useEffect(() => {
    console.log('🚀 ~ useHandleChunkMethodChange ~ chunkMethod:', chunkMethod);
  }, [chunkMethod]);

  return { form, chunkMethod };
};

export const useRenameKnowledgeTag = () => {
  const [tag, setTag] = useState<string>('');
  const {
    visible: tagRenameVisible,
    hideModal: hideTagRenameModal,
    showModal: showFileRenameModal,
  } = useSetModalState();

  const handleShowTagRenameModal = useCallback(
    (record: string) => {
      setTag(record);
      showFileRenameModal();
    },
    [showFileRenameModal],
  );

  return {
    initialName: tag,
    tagRenameVisible,
    hideTagRenameModal,
    showTagRenameModal: handleShowTagRenameModal,
  };
};
