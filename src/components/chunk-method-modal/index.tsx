import MaxTokenNumber from '@/components/max-token-number';
import { IModalManagerChildrenProps } from '@/components/modal-manager';
import {
  MinusCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Tooltip,
} from 'antd';
import omit from 'lodash/omit';
import React, { useEffect, useMemo } from 'react';
import { useFetchParserListOnMount, useShowAutoKeywords } from './hooks';

import { DocumentParserType } from '@/constants/knowledge';
import { useTranslate } from '@/hooks/common-hooks';
import { useFetchKnowledgeBaseConfiguration } from '@/hooks/knowledge-hooks';
import { IParserConfig } from '@/interfaces/database/document';
import { IChangeParserConfigRequestBody } from '@/interfaces/request/document';
import { get } from 'lodash';
import { AutoKeywordsItem, AutoQuestionsItem } from '../auto-keywords-item';
import { DatasetConfigurationContainer } from '../dataset-configuration-container';
import Delimiter from '../delimiter';
import EntityTypesItem from '../entity-types-item';
import ExcelToHtml from '../excel-to-html';
import LayoutRecognize from '../layout-recognize';
import ParseConfiguration, {
  showRaptorParseConfiguration,
} from '../parse-configuration';
import {
  UseGraphRagItem,
  showGraphRagItems,
} from '../parse-configuration/graph-rag-items';
import styles from './index.less';

interface IProps extends Omit<IModalManagerChildrenProps, 'showModal'> {
  loading: boolean;
  onOk: (
    parserId: DocumentParserType | undefined,
    parserConfig: IChangeParserConfigRequestBody,
  ) => void;
  showModal?(): void;
  parserId: DocumentParserType;
  parserConfig: IParserConfig;
  documentExtension: string;
  documentId: string;
}

const hidePagesChunkMethods = [
  DocumentParserType.Qa,
  DocumentParserType.Table,
  DocumentParserType.Picture,
  DocumentParserType.Resume,
  DocumentParserType.One,
  DocumentParserType.KnowledgeGraph,
];

const ChunkMethodModal: React.FC<IProps> = ({
  documentId,
  parserId,
  onOk,
  hideModal,
  visible,
  documentExtension,
  parserConfig,
  loading,
}) => {
  const [form] = Form.useForm();
  const { parserList, handleChange, selectedTag } = useFetchParserListOnMount(
    documentId,
    parserId,
    documentExtension,
    form,
  );
  console.log(`parserList222222222222`,parserList);
  const { t } = useTranslate('knowledgeDetails');
  const { data: knowledgeDetails } = useFetchKnowledgeBaseConfiguration();

  const useGraphRag = useMemo(() => {
    return knowledgeDetails.parser_config?.graphrag?.use_graphrag;
  }, [knowledgeDetails.parser_config?.graphrag?.use_graphrag]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const parser_config = {
      ...values.parser_config,
      pages: values.pages?.map((x: any) => [x.from, x.to]) ?? [],
    };
    // 确认提示：修改切片方法后需重新解析
    Modal.confirm({
      title: '确认修改切片方法',
      content: '修改切片方法后需重新解析，是否继续？',
      okText: '继续',
      cancelText: '取消',
      onOk: () => onOk(selectedTag, parser_config),
    });
  };

  const isPdf = documentExtension === 'pdf';

  const showPages = useMemo(() => {
    return isPdf && hidePagesChunkMethods.every((x) => x !== selectedTag);
  }, [selectedTag, isPdf]);

  const showOne = useMemo(() => {
    return (
      isPdf &&
      hidePagesChunkMethods
        .filter((x) => x !== DocumentParserType.One)
        .every((x) => x !== selectedTag)
    );
  }, [selectedTag, isPdf]);

  const showMaxTokenNumber =
    selectedTag === DocumentParserType.Naive ||
    selectedTag === DocumentParserType.KnowledgeGraph;

  const showEntityTypes = selectedTag === DocumentParserType.KnowledgeGraph;

  const showExcelToHtml =
    selectedTag === DocumentParserType.Naive && documentExtension === 'xlsx';

  const showAutoKeywords = useShowAutoKeywords();

  const afterClose = () => {
    form.resetFields();
  };
  const title = (
    <div style={{ width: '100%',background: '#F7F9FF', borderBottom: "1px solid #E5E6EB", paddingBottom: '12px',paddingTop: '20px', paddingLeft: '20px' }}>
      <i style={{ height: '100%', borderLeft: "4px solid #0C7CFF", borderRadius: '4px' }}></i>
      <span className='pl-2 text-[16px] font-bold'>切片方法</span>
    </div>
);
  useEffect(() => {
    if (visible) {
      const pages =
        parserConfig?.pages?.map((x) => ({ from: x[0], to: x[1] })) ?? [];
      form.setFieldsValue({
        pages: pages.length > 0 ? pages : [{ from: 1, to: 1024 }],
        parser_config: {
          ...omit(parserConfig, 'pages'),
          graphrag: {
            use_graphrag: get(
              parserConfig,
              'graphrag.use_graphrag',
              useGraphRag,
            ),
          },
        },
      });
    }
  }, [
    form,
    knowledgeDetails.parser_config,
    parserConfig,
    useGraphRag,
    visible,
  ]);

  return (
    <Modal

     title={title}
      style={{ right: 0, top: 0, position: 'absolute' }}
      open={visible}
      onOk={handleOk}
      onCancel={hideModal}
      afterClose={afterClose}
      confirmLoading={loading}
      className={styles.dialogRight}
      width={700}
    >
      <Space size={[0, 8]} wrap>
        <Form.Item label={t('chunkMethod')} className={styles.chunkMethod}>
          <Select
            style={{ width: 360 ,marginBottom: 20}}
            onChange={handleChange}
            value={selectedTag}
            options={parserList}
          />
        </Form.Item>
      </Space>
      <Form
        name="dynamic_form_nest_item"
        autoComplete="off"
        form={form}
        className="space-y-4"
      >
        {showPages && (
          <>
            <Space>
              <p>{t('pageRanges')}:</p>
              <Tooltip title={t('pageRangesTip')}>
                <QuestionCircleOutlined
                  className={styles.questionIcon}
                ></QuestionCircleOutlined>
              </Tooltip>
            </Space>
            <Form.List name="pages">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space
                      key={key}
                      style={{
                        display: 'flex',
                      }}
                      align="baseline"
                    >
                      <Form.Item
                        {...restField}
                        name={[name, 'from']}
                        dependencies={name > 0 ? [name - 1, 'to'] : []}
                        rules={[
                          {
                            required: true,
                            message: t('fromMessage'),
                          },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (
                                name === 0 ||
                                !value ||
                                getFieldValue(['pages', name - 1, 'to']) < value
                              ) {
                                return Promise.resolve();
                              }
                              return Promise.reject(
                                new Error(t('greaterThanPrevious')),
                              );
                            },
                          }),
                        ]}
                      >
                        <InputNumber
                          placeholder={t('fromPlaceholder')}
                          min={0}
                          precision={0}
                          className={styles.pageInputNumber}
                        />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'to']}
                        dependencies={[name, 'from']}
                        rules={[
                          {
                            required: true,
                            message: t('toMessage'),
                          },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (
                                !value ||
                                getFieldValue(['pages', name, 'from']) < value
                              ) {
                                return Promise.resolve();
                              }
                              return Promise.reject(
                                new Error(t('greaterThan')),
                              );
                            },
                          }),
                        ]}
                      >
                        <InputNumber
                          placeholder={t('toPlaceholder')}
                          min={0}
                          precision={0}
                          className={styles.pageInputNumber}
                        />
                      </Form.Item>
                      {name > 0 && (
                        <MinusCircleOutlined onClick={() => remove(name)} />
                      )}
                    </Space>
                  ))}
                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                    >
                      {t('addPage')}
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </>
        )}

        {showPages && (
          <Form.Item
            noStyle
            dependencies={[['parser_config', 'layout_recognize']]}
          >
            {({ getFieldValue }) =>
              getFieldValue(['parser_config', 'layout_recognize']) && (
                <Form.Item
                  name={['parser_config', 'task_page_size']}
                  label={t('taskPageSize')}
                  tooltip={t('taskPageSizeTip')}
                  initialValue={12}
                  rules={[
                    {
                      required: true,
                      message: t('taskPageSizeMessage'),
                    },
                  ]}
                >
                  <InputNumber min={1} max={128} />
                </Form.Item>
              )
            }
          </Form.Item>
        )}
        <DatasetConfigurationContainer show={showOne || showMaxTokenNumber}>
          {showOne && <LayoutRecognize></LayoutRecognize>}
          {showMaxTokenNumber && (
            <>
              <MaxTokenNumber
                max={
                  selectedTag === DocumentParserType.KnowledgeGraph
                    ? 8192 * 2
                    : 2048
                }
              ></MaxTokenNumber>
              <Delimiter></Delimiter>
            </>
          )}
        </DatasetConfigurationContainer>
        <DatasetConfigurationContainer
          show={showAutoKeywords(selectedTag) || showExcelToHtml}
        >
          {showAutoKeywords(selectedTag) && (
            <>
              <AutoKeywordsItem></AutoKeywordsItem>
              <AutoQuestionsItem></AutoQuestionsItem>
            </>
          )}
          {showExcelToHtml && <ExcelToHtml></ExcelToHtml>}
        </DatasetConfigurationContainer>
        {showRaptorParseConfiguration(selectedTag) && (
          <DatasetConfigurationContainer>
            <ParseConfiguration></ParseConfiguration>
          </DatasetConfigurationContainer>
        )}
        {showGraphRagItems(selectedTag) && useGraphRag && (
          <UseGraphRagItem></UseGraphRagItem>
        )}
        {showEntityTypes && <EntityTypesItem></EntityTypesItem>}
      </Form>
    </Modal>
  );
};
export default ChunkMethodModal;
