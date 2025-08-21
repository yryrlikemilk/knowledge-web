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
import { PlusOutlined, MinusCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import Editor, { loader } from '@monaco-editor/react';
import { useSelectLlmList } from '@/hooks/llm-hooks';
import { useFetchKnowledgeList } from '@/hooks/knowledge-hooks';
import { useState } from 'react';



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
  handleTesting: (documentIds?: string[], idOfQuery?: number) => Promise<any>;
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
  const [isAdvancedFilterVisible, setIsAdvancedFilterVisible] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [questionList, setQuestionList] = useState<string[]>([]);
  const [questionInputError, setQuestionInputError] = useState<string | null>(null);

  const buttonDisabled =
    !question || (typeof question === 'string' && question.trim() === '');
  console.log(`myLlmList,knowledgeList`, myLlmList, knowledgeList)

  // 构造树形结构数据（修正版）
  const treeData = myLlmList.flatMap((model) => {
    return model.llm.map((llmItem) => {
      console.log(`llmItem`, llmItem);
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

  const handleAddQuestion = () => {
    const value = questionInput.trim();
    if (!value) {
      setQuestionInputError(t('testTextPlaceholder'));
      return;
    }
    setQuestionInputError(null);
    const newQuestionList = [value, ...questionList];
    setQuestionList(newQuestionList);
    // 同步到 form 的 question 字段
    form.setFieldsValue({ question: newQuestionList });
    setQuestionInput('');
  };
  const handleDeleteQuestion = (idx: number) => {
    const newQuestionList = questionList.filter((_, i) => i !== idx);
    setQuestionList(newQuestionList);
    // 同步到 form 的 question 字段
    form.setFieldsValue({ question: newQuestionList });
  };

  const onClick = async () => {
    try {
      if (questionInput.trim()) {
        if (!questionInput.trim()) {
          setQuestionInputError(t('testTextPlaceholder'));
          return;
        } else {
          setQuestionInputError(null);
          const newQuestionList = [questionInput.trim(), ...questionList];
          setQuestionList(newQuestionList);
          form.setFieldsValue({ question: newQuestionList });
          setQuestionInput('');
        }
      }
      await form.validateFields();
      const formQuestions = form.getFieldValue('question') || [];
      if (formQuestions.length === 0) {
        message.warning('请至少输入一个问题');
        return;
      }
      handleTesting(selectedDocumentIds, undefined);
    } catch (error) { }
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
            <Form.Item name="question" hidden>
              <Input />
            </Form.Item>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item style={{ flex: 1 }} label={t('testText')} required
                rules={[
                  { required: true, message: '请输入问题' }]}
                validateStatus={questionInputError ? 'error' : ''} help={questionInputError}>
                <Input
                  value={questionInput}
                  onChange={e => {
                    setQuestionInput(e.target.value);
                    if (questionInputError) setQuestionInputError(null);
                  }}
                  placeholder={t('testTextPlaceholder')}
                  allowClear

                  onPressEnter={handleAddQuestion}
                />

                {questionList.length > 0 && (
                  <div style={{ maxHeight: 200, overflow: 'auto' }}>
                    {questionList.map((q, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', margin: '4px 0', background: '#f6f8fa', borderRadius: 4, padding: '4px 8px' }}>
                        <span style={{ flex: 1, maxWidth: 500, overflow: 'auto' }}>{q}</span>
                        <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer' }} onClick={() => handleDeleteQuestion(idx)} />
                      </div>
                    ))}
                  </div>
                )}
              </Form.Item>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddQuestion} />
            </div>




            <Form.Item
              label='相似度阈值'
              name={'similarity_threshold'}
              tooltip={t('similarityThresholdTip')}
              initialValue={20}
              rules={[
                { required: true, message: '请输入相似度阈值' },
                {
                  validator: (_, value) => {
                    console.log(`objectvalue`, value, typeof (value))
                    const numValue = Number(value);
                    if (isNaN(numValue) || numValue < 1 || numValue > 100) {
                      return Promise.reject('请输入1-100之间的数值');
                    }
                    if (!Number.isInteger(numValue)) {
                      return Promise.reject('请输入整数');
                    }
                    return Promise.resolve();
                  },
                },
              ]}

            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <InputNumber
                  min={1}
                  max={100}
                  step={1}
                  precision={0}
                  style={{ width: '100%' }}
                  defaultValue={20}
                />
                <span style={{ width: 32 }}>分</span>
              </div>
            </Form.Item>
            <Form.Item
              label={t('vectorSimilarityWeight')}
              name={'vector_similarity_weight'}
              initialValue={70}
              tooltip={t('vectorSimilarityWeightTip')}
              rules={[
                { required: true, message: '请输入关键字相似度权重' },
                {
                  validator: (_, value) => {
                    const numValue = Number(value);
                    if (isNaN(numValue) || numValue < 1 || numValue > 100) {
                      return Promise.reject('请输入1-100之间的数值');
                    }
                    if (!Number.isInteger(numValue)) {
                      return Promise.reject('请输入整数');
                    }
                    return Promise.resolve();
                  },
                },
              ]}

            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <InputNumber
                  min={1}
                  max={100}
                  step={1}
                  precision={0}
                  style={{ width: '100%' }}
                  defaultValue={70}
                />
                <span style={{ width: 32 }}>%</span>
              </div>
            </Form.Item>
            <Form.Item
              label="测试知识库"
              name={'test_kb_ids'}
              tooltip={'请根据不同的Embedding模型选择知识库，不支持跨模型选择知识库。'}
              rules={[{ required: true, message: "请选择一个或多个知识库" }]}
              style={{ width: 'calc(100% - 38px)' }}
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
              // label={
              //   <div
              //     style={{
              //       cursor: 'pointer',
              //       userSelect: 'none'
              //     }}
              //     onClick={() => setIsAdvancedFilterVisible(!isAdvancedFilterVisible)}
              //   >
              //     高级筛选

              //   </div>
              // }
              label='高级配置'
              colon={false}
            >
              {isAdvancedFilterVisible ?
                <svg onClick={() => setIsAdvancedFilterVisible(!isAdvancedFilterVisible)}
                  style={{
                    marginLeft: 8, cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  t="1754459741571" className="icon" viewBox="0 0 1024 1024" version="1.1"
                  xmlns="http://www.w3.org/2000/svg" p-id="2340" width="16" height="16"
                  xlink="http://www.w3.org/1999/xlink">
                  <path d="M325.456471 862.280661" fill="#272636" p-id="2341" />
                  <path d="M882.057788 862.280661" fill="#272636" p-id="2342" />
                  <path d="M236.028491 877.160382" fill="#272636" p-id="2343" />
                  <path d="M960.132455 877.160382" fill="#272636" p-id="2344" />
                  <path d="M63.683483 788.736998" fill="#272636" p-id="2345" />
                  <path d="M958.469023 788.736998" fill="#272636" p-id="2346" />
                  <path d="M64.77753 858.792098" fill="#272636" p-id="2347" />
                  <path d="M163.396533 289.168875c-40.577772 0-66.525252 54.184545-35.441258 85.258218L477.217578 723.704878c20.031716 20.031716 49.823841 20.031716 69.853837 0l349.274345-349.277785c30.304744-30.294423 6.677812-85.258218-34.928639-85.258218L163.396533 289.168875 163.396533 289.168875z" fill="#575B66" p-id="2348" />
                  <path d="M959.523505 858.792098" fill="#272636" p-id="2349" />
                </svg>
                :

                <svg onClick={() => setIsAdvancedFilterVisible(!isAdvancedFilterVisible)}
                  style={{
                    marginLeft: 8, cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  t="1754459876883" className="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4177" width="16" height="16">
                  <path d="M385.536 102.4l398.848 364.544c12.288 10.752 19.456 26.624 19.456 43.008s-7.168 32.256-19.456 43.008l-398.848 364.544c-18.944 17.92-46.08 23.552-70.656 14.336s-40.96-31.232-43.52-57.344V145.408c2.048-26.112 18.944-48.128 43.52-57.344 24.064-9.216 51.712-3.584 70.656 14.336z"
                    fill="#575B66" p-id="4178" />
                </svg>

              }
            </Form.Item>

            {isAdvancedFilterVisible && (
              <div style={{ width: 'calc(100% - 38px)' }}>
                <Rerank ></Rerank>
                <UseKnowledgeGraphItem filedName={['use_kg']}></UseKnowledgeGraphItem>






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
              </div>
            )}
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
