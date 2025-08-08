import Rerank from '@/components/rerank';
import SimilaritySlider from '@/components/similarity-slider';
import { useTranslate } from '@/hooks/common-hooks';
import { useChunkIsTesting } from '@/hooks/knowledge-hooks';
import { Button, Divider, Flex, Form, Input, InputNumber, Space, message, TreeSelect } from 'antd';
import { FormInstance } from 'antd/lib';
import { LabelWordCloud } from './label-word-cloud';

import { CrossLanguageItem } from '@/components/cross-language-item';
import { UseKnowledgeGraphItem } from '@/components/use-knowledge-graph-item';
import styles from './index.less';
import DOMPurify from 'dompurify';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import Editor, { loader } from '@monaco-editor/react';
import { useSelectLlmList } from '@/hooks/llm-hooks';
import { useFetchKnowledgeList } from '@/hooks/knowledge-hooks';



// loader.config({ paths: { vs: '/vs' } });
type FieldType = {
  similarity_threshold?: number;
  vector_similarity_weight?: number;
  question: string;
  meta?: string;
  top_k?: string;
};

interface IProps {
  form: FormInstance;
  handleTesting: (documentIds?: string[]) => Promise<any>;
  selectedDocumentIds: string[];
}

const TestingControl = ({
  form,
  handleTesting,
  selectedDocumentIds,
}: IProps) => {
  const question = Form.useWatch('question', { form, preserve: true });
  const loading = useChunkIsTesting();
  const { t } = useTranslate('knowledgeDetails');
  const { myLlmList } = useSelectLlmList();
  const { list: knowledgeList } = useFetchKnowledgeList();

  const buttonDisabled =
    !question || (typeof question === 'string' && question.trim() === '');
  console.log(`myLlmList,knowledgeList`, myLlmList, knowledgeList)

  // 构造树形结构数据（修正版）
  const treeData = myLlmList.flatMap((model) => {
    return model.llm.map((llmItem) => {
      const children = knowledgeList
        .filter((kb) => kb.embd_id && kb.embd_id.split('@')[0] === llmItem.name)
        .map((kb) => ({
          title: kb.name,
          value: kb.id,
          key: kb.id,
          isLeaf: true,
        }));
      return {
        title: <span style={{ paddingLeft: 4 }}>{llmItem.name}</span>,
        value: llmItem.name,
        key: llmItem.name,
        selectable: false,
        children,
      };
    }).filter((node) => node.children.length > 0);
  }).filter((node) => node.children && node.children.length > 0);
  console.log(`treeData68`, treeData)

  const onClick = async () => {
    try {
      // 先进行表单校验
      await form.validateFields();
      // 校验通过后再调用 handleTesting
      handleTesting(selectedDocumentIds);
    } catch (error) {

    }
  };

  return (
    <section className={styles.testingControlWrapper}>
      <div>
        <Flex justify='center' align='center' >
          <h3 style={{ color: '#1D2129', fontSize: "20px", fontWeight: 600, marginBottom: 16 }}>{t('testing')}</h3>
        </Flex>
      </div>
      <Flex justify='center' align='center' >
        <div className={styles.testingControlTip}>
          <div>  <svg xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" style={{ width: 20, height: 20, marginRight: 8, }} viewBox="0 0 20 20">
            <defs>
              <clipPath id="master_svg0_2_7215">
                <rect x="0" y="0" width="20" height="20" rx="0" style={{ width: 20, height: 20, }} />
              </clipPath>
            </defs>
            <g clipPath="url(#master_svg0_2_7215)">
              <g>
                <path d="M10,1.25C14.8307,1.25,18.75,5.16387,18.75,10C18.75,14.8361,14.8361,18.75,10,18.75C5.16387,18.75,1.25,14.8361,1.25,10C1.25,5.16387,5.16934,1.25,10,1.25ZM11.09238,13.2826L8.90762,13.2826L8.90762,15.4674L11.09238,15.4674L11.09238,13.2826ZM11.09238,4.53262L8.90762,4.53262L8.90762,11.09238L11.09238,11.09238L11.09238,4.53262Z" fill="#F9CA06" fillOpacity="1" style={{ width: 20, height: 20, }} />
              </g>
            </g>
          </svg></div>
          <p className={styles.testingDescription}>{t('testingDescription')}</p>
        </div>
      </Flex>



      <section>
        <Form
          name="testing"
          layout="horizontal"
          form={form}
          // labelCol={{ span: 4 }}
          // wrapperCol={{ span: 20 }}
          labelCol={{ flex: '160px' }}
          labelWrap
          wrapperCol={{ flex: 1 }}
          labelAlign="right"
        >
          <div className={styles.formContent}>

            <Form.Item
              label="测试知识库"
              name={'test_kb_ids'}
              tooltip={'请根据不同的Embedding模型选择知识库，不支持跨模型选择知识库。'}
              rules={[{ required: true, message: "请选择一个或多个知识库" }]}
            >
              <TreeSelect
                treeData={treeData}
                value={form.getFieldValue('test_kb_ids') || []}
                onChange={(value: string[] | string) => {
                  // 只允许选择叶子节点，且支持多选
                  let selected: string[] = Array.isArray(value) ? value : [value];
                  const leafValues: string[] = [];
                  for (const parent of treeData) {
                    if (parent.children) {
                      for (const child of parent.children) {
                        if (selected.includes(child.value)) {
                          leafValues.push(child.value);
                        }
                      }
                    }
                  }
                  form.setFieldsValue({ test_kb_ids: leafValues });
                }}
                placeholder="请选择测试知识库"
                allowClear
                style={{ width: '100%' }}
                treeDefaultExpandAll
                showSearch
                multiple
                styles={{ popup: { root: { maxHeight: 400, overflow: 'auto' } } }}
              />
            </Form.Item>

            <Form.Item
              label='相似度阈值'
              name={'similarity_threshold'}
              tooltip={t('similarityThresholdTip')}
              initialValue={0.2}
              rules={[
                { required: true, message: t('pleaseInput') },
                {
                  validator: (_, value) => {
                    if (value < 0 || value > 1) {
                      return Promise.reject('请输入0-1之间的数值');
                    }
                    if (Math.round(value * 10) % 1 !== 0) {
                      return Promise.reject('请输入0.1的倍数，如0.1、0.2、0.3等');
                    }
                    return Promise.resolve();
                  },
                },
              ]}

            >
              <InputNumber
                min={0.1}
                max={1}
                step={0.1}
                precision={1}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              label={t('vectorSimilarityWeight')}
              name={'vector_similarity_weight'}
              initialValue={0.7}
              tooltip={t('vectorSimilarityWeightTip')}
              rules={[
                { required: true, message: t('pleaseInput') },
                {
                  validator: (_, value) => {
                    if (value < 0 || value > 1) {
                      return Promise.reject('请输入0-1之间的数值');
                    }
                    if (Math.round(value * 10) % 1 !== 0) {
                      return Promise.reject('请输入0.1的倍数，如0.1、0.2、0.3等');
                    }
                    return Promise.resolve();
                  },
                },
              ]}

            >
              <InputNumber
                min={0.1}
                max={1}
                step={0.1}
                precision={1}
                style={{ width: '100%' }}
              />
            </Form.Item>
            {/* <Form.Item label='高级筛选' colon={false}></Form.Item> */}

            <Rerank></Rerank>
            <UseKnowledgeGraphItem filedName={['use_kg']}></UseKnowledgeGraphItem>
            <Form.Item<FieldType>
              label={t('testText')}
              name={'question'}
              rules={[{ required: true, message: t('testTextPlaceholder') }]}

            >
              <Input.TextArea
                placeholder={t('testTextPlaceholder')}
                allowClear
                style={{ height: 34, resize: 'vertical' }}
              ></Input.TextArea>
            </Form.Item>



            <Form.Item
              label={t('setMetaData')}
              tooltip={
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(t('documentMetaTips')),
                  }}
                />
              }

            >
              <Form.List name="metaList">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Flex key={key} style={{ marginBottom: 8, width: '100%' }} align="center" gap={8}>
                        <Form.Item
                          label="字段名"
                          {...restField}
                          name={[name, 'key']}
                          rules={[
                            {
                              pattern: /^[a-zA-Z]*$/,
                              message: '字段名只能输入英文字母'
                            }
                          ]}
                          style={{ flex: 1, marginBottom: 0 }}
                          labelCol={{ span: 6 }}
                          wrapperCol={{ span: 18 }}
                        >
                          <Input placeholder="请输入字段名" allowClear />
                        </Form.Item>
                        <Form.Item
                          {...restField}
                          label="数据"
                          name={[name, 'value']}
                          rules={[{ message: '请输入数据' }]}
                          style={{ flex: 1, marginBottom: 0 }}
                          labelCol={{ span: 6 }}
                          wrapperCol={{ span: 18 }}
                        >
                          <Input placeholder="请输入数据" allowClear />
                        </Form.Item>
                        <MinusCircleOutlined
                          onClick={() => remove(name)}
                          style={{ cursor: 'pointer', color: '#ff4d4f' }}
                        />
                      </Flex>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => {
                          if (fields.length < 50) {
                            add();
                          } else {
                            message.warning('最多只能添加50行数据');
                          }
                        }}
                        block
                        icon={<PlusOutlined />}
                      >
                        添加元数据
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form.Item>
            {/* <Form.Item<FieldType>
              label={'topk设置'}
              name={'top_k'}
              tooltip={'设置返回切片数最大值，不设置默认全部返回'}
              rules={[
                { type: 'number', message: t('请输入数字') }
              ]}
            >
              <InputNumber
                min={1}

                step={1}
                precision={1}
                style={{ width: '100%' }}
              />
            </Form.Item> */}

            <Button
              type="primary"
              onClick={onClick}
              // disabled={buttonDisabled}
              loading={loading}
              className={styles.testingButton}
            >
              {t('testingLabel')}
            </Button>
          </div>
        </Form>
      </section>

      <LabelWordCloud></LabelWordCloud>
      {/* <section>
        <div className={styles.historyTitle}>
          <Space size={'middle'}>
            <HistoryOutlined className={styles.historyIcon} />
            <b>Test history</b>
          </Space>
        </div>
        <Space
          direction="vertical"
          size={'middle'}
          className={styles.historyCardWrapper}
        >
          {list.map((x) => (
            <Card className={styles.historyCard} key={x}>
              <Flex justify={'space-between'} gap={'small'}>
                <span>{x}</span>
                <div className={styles.historyText}>
                  content dcjsjl snldsh svnodvn svnodrfn svjdoghdtbnhdo
                  sdvhodhbuid sldghdrlh
                </div>
                <Flex gap={'small'}>
                  <span>time</span>
                  <DeleteOutlined></DeleteOutlined>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Space>
      </section> */}
    </section >
  );
};

export default TestingControl;
