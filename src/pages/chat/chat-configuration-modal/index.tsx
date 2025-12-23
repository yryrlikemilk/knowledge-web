import { IModalManagerChildrenProps } from '@/components/modal-manager';
import {
  ModelVariableType,
  settledModelVariableMap,
} from '@/constants/knowledge';
import { useTranslate } from '@/hooks/common-hooks';
import { useFetchModelId } from '@/hooks/logic-hooks';
import { IDialog } from '@/interfaces/database/chat';
import { getBase64FromUploadFileList } from '@/utils/file-util';
import { removeUselessFieldsFromValues } from '@/utils/form';
import { Form, Modal, Segmented, UploadFile } from 'antd';
import { SegmentedValue } from 'antd/es/segmented';
import camelCase from 'lodash/camelCase';
import { useEffect, useRef, useState } from 'react';
import { IPromptConfigParameters } from '../interface';
import AssistantSetting from './assistant-setting';
import ModelSetting from './model-setting';
import PromptEngine from './prompt-engine';

import styles from './index.less';

const layout = {
  labelCol: { span: 9 },
  wrapperCol: { span: 15 },
};

const validateMessages = {
  required: '${label} is required!',
  types: {
    email: '${label} is not a valid email!',
    number: '${label} is not a valid number!',
  },
  number: {
    range: '${label} must be between ${min} and ${max}',
  },
};

enum ConfigurationSegmented {
  AssistantSetting = 'Assistant Setting',
  PromptEngine = 'Prompt Engine',
  ModelSetting = 'Model Setting',
}

const segmentedMap = {
  [ConfigurationSegmented.AssistantSetting]: AssistantSetting,
  [ConfigurationSegmented.ModelSetting]: ModelSetting,
  [ConfigurationSegmented.PromptEngine]: PromptEngine,
};

interface IProps extends IModalManagerChildrenProps {
  initialDialog: IDialog;
  loading: boolean;
  onOk: (dialog: IDialog) => void;
  clearDialog: () => void;
}

const ChatConfigurationModal = ({
  visible,
  hideModal,
  initialDialog,
  loading,
  onOk,
  clearDialog,
}: IProps) => {
  const [form] = Form.useForm();
  const [hasError, setHasError] = useState(false);

  const [value, setValue] = useState<ConfigurationSegmented>(
    ConfigurationSegmented.AssistantSetting,
  );
  const promptEngineRef = useRef<Array<IPromptConfigParameters>>([]);
  const modelId = useFetchModelId();
  const { t } = useTranslate('chat');

  const handleOk = async () => {
    const values = await form.validateFields();
    if (hasError) {
      return;
    }
    const nextValues: any = removeUselessFieldsFromValues(
      values,
      'llm_setting.',
    );
    const emptyResponse = nextValues.prompt_config?.empty_response ?? '';

    const icon = await getBase64FromUploadFileList(values.icon);

    const finalValues = {
      dialog_id: initialDialog.id,
      ...nextValues,
      vector_similarity_weight: 1 - nextValues.vector_similarity_weight,
      prompt_config: {
        prologue: '你好！ 我是你的助理，有什么可以帮到你的吗？',
        quote: true,
        keyword: false,
        tts: false,
        toc_enhance: false,
        ...nextValues.prompt_config,
        parameters: promptEngineRef.current,
        empty_response: emptyResponse,
      },
      icon,
    };
    onOk(finalValues);
  };

  const handleSegmentedChange = (val: SegmentedValue) => {
    setValue(val as ConfigurationSegmented);
  };

  const handleModalAfterClose = () => {
    clearDialog();
    form.resetFields();
  };

  const title = (
    <div
      style={{
        width: '100%',
        background: '#F7F9FF',
        borderBottom: '1px solid #E5E6EB',
        paddingBottom: '12px',
        paddingTop: '20px',
        paddingLeft: '20px',
      }}
    >
      <i
        style={{
          height: '100%',
          borderLeft: '4px solid #0C7CFF',
          borderRadius: '4px',
        }}
      ></i>
      <span className="pl-2 text-[16px] font-bold">助理配置</span>
    </div>
  );

  useEffect(() => {
    if (visible) {
      const icon = initialDialog.icon;
      let fileList: UploadFile[] = [];

      if (icon) {
        fileList = [{ uid: '1', name: 'file', thumbUrl: icon, status: 'done' }];
      }
      console.log(
        `nitialDialog.vector_similarity_weight`,
        initialDialog.vector_similarity_weight,
      );
      console.log(initialDialog);
      form.setFieldsValue({
        ...initialDialog,
        llm_setting:
          initialDialog.llm_setting ??
          settledModelVariableMap[ModelVariableType.Precise],
        icon: fileList,
        llm_id: initialDialog.llm_id ?? modelId,
        vector_similarity_weight:
          typeof initialDialog.vector_similarity_weight === 'number' &&
          !isNaN(initialDialog.vector_similarity_weight)
            ? initialDialog.vector_similarity_weight
            : 0.3,
      });
    }
  }, [initialDialog, form, visible, modelId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Enter in textareas
    if (e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleOk();
    }
  };

  return (
    <Modal
      title={title}
      style={{ right: 0, top: 0, position: 'absolute' }}
      width={688}
      open={visible}
      onOk={handleOk}
      onCancel={hideModal}
      confirmLoading={loading}
      destroyOnHidden
      className={styles.dialogRight}
      afterClose={handleModalAfterClose}
    >
      <Segmented
        size={'large'}
        className={styles.dialogRightSegmented}
        value={value}
        onChange={handleSegmentedChange}
        options={Object.values(ConfigurationSegmented).map((x) => ({
          label: t(camelCase(x)),
          value: x,
        }))}
        block
      />
      <Form
        {...layout}
        name="nest-messages"
        form={form}
        style={{ maxWidth: 600, margin: '20px 0' }}
        validateMessages={validateMessages}
        colon={false}
        onKeyDown={handleKeyDown}
      >
        {Object.entries(segmentedMap).map(([key, Element]) => (
          <Element
            key={key}
            show={key === value}
            form={form}
            setHasError={setHasError}
            {...(key === ConfigurationSegmented.ModelSetting
              ? { initialLlmSetting: initialDialog.llm_setting, visible }
              : {})}
            {...(key === ConfigurationSegmented.PromptEngine
              ? { ref: promptEngineRef }
              : {})}
          ></Element>
        ))}
      </Form>
    </Modal>
  );
};

export default ChatConfigurationModal;
