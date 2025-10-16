import React, { useState } from 'react';
import { Modal, Form, Input, Button, Space, Table, Tag, InputNumber, message, Typography, Tooltip } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Rerank from '@/components/rerank';
import { useFetchAllQuestions, useSaveRetrievalTask } from '@/hooks/knowledge-hooks';

const { Title, Paragraph } = Typography;

interface CreateEvaluationModalProps {
    visible: boolean;
    onCancel: () => void;
    onOk: (data: {
        task_name: string;
        selectedQuestions: QuestionItem[];
        formData: any;
    }) => void;
    onSwitchToQuestions?: () => void;
}

interface QuestionItem {
    id: string;
    question_text: string;
    auto_generate: boolean;
    category_sub: string;
    chunk_id: string;
    create_time: string;
    doc_id: string;
    kb_id: string;
    status: number;
    update_time: string;
    selected: boolean;
}

const CreateEvaluationModal: React.FC<CreateEvaluationModalProps> = ({ visible, onCancel, onOk, onSwitchToQuestions }) => {
    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedSources, setSelectedSources] = useState<('manual' | 'ai')[]>([]);
    const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
    const [canAccessStep2, setCanAccessStep2] = useState(false);
    const { allQuestions: allQ, loading: allQuestionLoading } = useFetchAllQuestions();
    const { saveRetrievalTask, loading: saveLoading } = useSaveRetrievalTask();

    // 根据接口数据生成问题列表
    const mapItem = (item: any): QuestionItem => ({
        id: item.id,
        question_text: item.questionText,
        auto_generate: !!item.autoGenerate,
        category_sub: item.categorySub,
        chunk_id: item.chunkId,
        create_time: item.createTime,
        doc_id: item.docId,
        kb_id: item.kbId,
        status: item.status,
        update_time: item.updateTime,
        selected: false,
    });

    const getQuestionsFromApi = (): QuestionItem[] => {
        const ai = (allQ.autoQuestion || []).map(mapItem);
        const manual = (allQ.manualQuestion || []).map(mapItem);
        return [...manual, ...ai];
    };

    const allQuestions = getQuestionsFromApi();
    const manualQuestions = allQuestions.filter(q => !q.auto_generate);
    const aiQuestions = allQuestions.filter(q => q.auto_generate);

    const handleSourceToggle = (source: 'manual' | 'ai') => {
        setSelectedSources(prev => {
            const newSources = prev.includes(source)
                ? prev.filter(s => s !== source)
                : [...prev, source];

            // 更新选中的问题列表
            setSelectedQuestions(prevQuestions => {
                if (newSources.includes(source)) {
                    // 选中来源时，添加该来源的所有问题（如果还没有选中）
                    const sourceQuestions = source === 'manual' ? manualQuestions : aiQuestions;
                    const newQuestionIds = sourceQuestions.map(q => q.id);
                    const existingIds = prevQuestions.filter(id => {
                        const question = allQuestions.find(q => q.id === id);
                        return question && newSources.includes(question.auto_generate ? 'ai' : 'manual');
                    });
                    return [...new Set([...existingIds, ...newQuestionIds])];
                } else {
                    // 取消来源时，移除该来源的所有问题
                    return prevQuestions.filter(id => {
                        const question = allQuestions.find(q => q.id === id);
                        return question && newSources.includes(question.auto_generate ? 'ai' : 'manual');
                    });
                }
            });

            return newSources;
        });
    };

    const handleQuestionSelect = (questionId: string) => {
        setSelectedQuestions(prev =>
            prev.includes(questionId)
                ? prev.filter(id => id !== questionId)
                : [...prev, questionId]
        );
    };

    const getDisplayQuestions = () => {
        return allQuestions.filter(question => selectedSources.includes(question.auto_generate ? 'ai' : 'manual'));
    };
    const handlePrev = () => {
        setCurrentStep(0);
    };
    const handleNext = () => {
        if (currentStep === 0) {
            form.validateFields(['task_name']).then(() => {
                if (selectedQuestions.length === 0) {
                    message.warning('请至少选择一个测试问题');
                    return;
                }
                setCanAccessStep2(true);
                setCurrentStep(1);
            });
        } else {
            // 验证所有字段，包括第一步的task_name
            form.validateFields(['task_name', 'similarity_threshold', 'vector_similarity_weight', 'rerank_id', 'top_k']).then(async (formData) => {
                try {
                    console.log(`formDataformDataformData`, formData)
                    const selectedQuestionsData = allQuestions.filter(q => selectedQuestions.includes(q.id));

                    // // 调用保存接口
                    await saveRetrievalTask({
                        task_name: formData.task_name,
                        test_ques_ids: selectedQuestions,
                        selectedQuestionsData: selectedQuestionsData,
                        similarity_threshold: formData.similarity_threshold,
                        vector_similarity_weight: formData.vector_similarity_weight,
                        rerank_id: formData.rerank_id,
                        top_k: formData.top_k

                    });

                    message.success('评估任务创建成功');

                    // 调用父组件的回调
                    onOk({
                        task_name: formData.task_name,
                        selectedQuestions: selectedQuestionsData,
                        formData
                    });

                    // 创建成功后清空所有数据
                    setCurrentStep(0);
                    setSelectedSources([]);
                    setSelectedQuestions([]);
                    setCanAccessStep2(false);
                    form.resetFields();
                } catch (error) {
                    console.error('创建评估任务失败:', error);
                    message.error(error instanceof Error ? error.message : '创建评估任务失败');
                }
            });
        }
    };

    const handleCancel = () => {
        // 清空所有状态
        setCurrentStep(0);
        setSelectedSources([]);
        setSelectedQuestions([]);
        setCanAccessStep2(false);
        form.resetFields();
        onCancel();
    };


    // 监听弹窗关闭，清空数据
    React.useEffect(() => {
        if (!visible) {
            // 弹窗关闭时清空所有数据
            setCurrentStep(0);
            setSelectedSources([]);
            setSelectedQuestions([]);
            setCanAccessStep2(false);
            form.resetFields();
        }
    }, [visible, form]);

    const columns: ColumnsType<QuestionItem> = [
        {
            title: '问题内容',
            dataIndex: 'question_text',
            key: 'question_text',
            render: (text: string, record: QuestionItem) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {selectedQuestions.includes(record.id) && (
                        <CheckCircleOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
                    )}
                    <span>{text}</span>
                </div>
            ),
        },
        {
            title: '来源',
            dataIndex: 'auto_generate',
            key: 'auto_generate',
            width: 100,
            render: (autoGenerate: boolean) => (
                <Tag color={autoGenerate ? 'green' : 'blue'}>
                    {autoGenerate ? 'AI生成' : '手工输入'}
                </Tag>
            ),
        },
    ];

    const renderStep1 = () => {
        // 如果没有问题数据，显示提示信息
        if ((allQ.manualQuestion?.length || 0) + (allQ.autoQuestion?.length || 0) === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Title level={4}>暂时没有测试问题</Title>
                    <Paragraph type="secondary" style={{ marginBottom: '30px' }}>
                        请先新增测试问题，然后再创建评估任务
                    </Paragraph>
                </div>
            );
        }

        return (
            <div>
                <div style={{
                    backgroundColor: '#fff7e6',
                    border: '1px solid #ffd591',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    margin: '20px 0'
                }}>
                    <p style={{ margin: 0, color: '#d46b08' }}>
                        <strong>提示：</strong>一个评估任务发起后不支持修改，且生成报告会消耗较多tokens，请确认您要评估的问题集。
                        确保问题较全面的覆盖您的业务场景。
                    </p>
                </div>

                <Form form={form} layout="vertical">
                    <Form.Item
                        name="task_name"
                        label="任务名称"
                        rules={[{ required: true, message: '请输入任务名称' }]}
                    >
                        <Input placeholder="请输入任务名称" />
                    </Form.Item>
                </Form>

                <div style={{ marginTop: '20px' }}>
                    <h4>选择测试问题</h4>

                    <div style={{
                        display: 'flex',
                        marginTop: '16px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        overflow: 'hidden'
                    }}>
                        {/* 问题来源选择 */}
                        <div style={{
                            width: '200px',
                            flexShrink: 0,
                            borderRight: '1px solid #d9d9d9',
                            padding: '16px',
                            backgroundColor: '#fafafa'
                        }}>
                            <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>问题来源</div>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Button
                                    type={selectedSources.includes('manual') ? 'primary' : 'default'}
                                    block
                                    onClick={() => handleSourceToggle('manual')}
                                    disabled={manualQuestions.length === 0}
                                >
                                    手工输入 ({manualQuestions.length})
                                </Button>
                                <Button
                                    type={selectedSources.includes('ai') ? 'primary' : 'default'}
                                    block
                                    onClick={() => handleSourceToggle('ai')}
                                    disabled={aiQuestions.length === 0}
                                >
                                    AI生成 ({aiQuestions.length})
                                </Button>
                            </Space>
                        </div>

                        {/* 问题列表 */}
                        <div style={{ flex: 1, padding: '16px', height: 400, overflow: 'auto' }}>
                            <div style={{ marginBottom: '12px', fontWeight: 'bold' }}>
                                问题列表 (已选择 {selectedQuestions.length} 个)
                            </div>
                            <Table
                                columns={columns}
                                dataSource={getDisplayQuestions()}
                                rowKey="id"
                                pagination={false}
                                size="small"
                                onRow={(record) => ({
                                    onClick: () => handleQuestionSelect(record.id),
                                    style: {
                                        cursor: 'pointer',
                                        backgroundColor: selectedQuestions.includes(record.id) ? '#e6f7ff' : 'transparent',
                                    },
                                })}
                                locale={{ emptyText: '请先选择问题来源' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderStep2 = () => (
        <div>
            <div style={{ paddingLeft: 20 }}>1、检索设置</div>
            <div className='flex justify-center w-full'>
                <Form form={form} layout="vertical" style={{ width: 500, margin: 20 }}>
                    <Form.Item
                        label="相似度阈值"
                        name="similarity_threshold"
                        tooltip="我们使用混合相似度得分来评估两行文本之间的距离。 它是加权关键词相似度和向量余弦相似度。 如果查询和块之间的相似度小于此阈值，则该块将被过滤掉。默认设置为 0.2，也就是说文本块的混合相似度得分至少 20 才会被召回。"
                        initialValue={20}
                        rules={[
                            { required: true, message: '请输入相似度阈值' },
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
                                defaultValue={20}
                            />
                            <span style={{ width: 32 }}>分</span>
                        </div>
                    </Form.Item>

                    <Form.Item
                        label="关键字相似度权重"
                        name="vector_similarity_weight"
                        initialValue={70}
                        tooltip="关键字相似度权重用于计算混合相似度得分。 它是关键词相似度和向量余弦相似度的加权组合。 默认设置为 70%，也就是说关键词相似度占 70%，向量余弦相似度占 30%。"
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
                    <div style={{ width: 'calc(100% - 32px)' }}>
                        <Rerank />
                    </div>



                </Form>
            </div>
            <div style={{ paddingLeft: 20 }}>
                2、设定评估指标

            </div>
            <div className='flex justify-center w-full'>
                <div style={{ width: 500, margin: 20 }}>
                    <Tooltip
                        placement="top"
                        mouseEnterDelay={0.2}
                        title={
                            <div style={{ textAlign: 'left', lineHeight: 1.6 }}>
                                <div>1、问题可回答率：表示测试的问题中，有多少能找到知识库的内容。</div>
                                <div>2、问题回答准确率：表示找到的内容中，有多少是正确或相关的。</div>
                            </div>
                        }
                    >
                        <Button key="system" type="primary" >
                            系统默认指标
                        </Button>
                    </Tooltip>
                </div>

            </div>

        </div>


    );

    // 根据是否有数据显示不同的底部按钮
    const renderFooter = () => {
        const totalCount = (allQ.manualQuestion?.length || 0) + (allQ.autoQuestion?.length || 0);
        if (totalCount === 0) {
            return [
                <Button key="cancel" onClick={handleCancel}>
                    取消
                </Button>,
                <Button key="add" type="primary" onClick={() => {
                    handleCancel();
                    onSwitchToQuestions?.();
                }}>
                    去新增测试问题
                </Button>,
            ];
        }

        return [
            <Button key="cancel" onClick={handleCancel}>
                取消
            </Button>,
            currentStep === 1 && (
                <Button key="prev" onClick={handlePrev}>
                    上一步
                </Button>
            ),
            <Button key="next" type="primary" onClick={handleNext} loading={saveLoading}>
                {currentStep === 1 ? '创建任务' : '下一步'}
            </Button>,
        ].filter(Boolean);
    };

    return (
        <Modal
            title={
                <div style={{ textAlign: 'center', }}>
                    <span>创建评估任务</span>
                </div>
            }
            open={visible}
            onCancel={handleCancel}
            width={800}
            footer={renderFooter()}
        >
            {allQuestionLoading ? (
                <div>加载中---</div>
            ) : (
                <> {(allQ.manualQuestion?.length || 0) + (allQ.autoQuestion?.length || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '20px 0', }}>
                        <Button
                            type={currentStep === 0 ? 'primary' : 'default'}
                            size="small"
                            onClick={() => setCurrentStep(0)}
                        >
                            1. 选择测试问题
                        </Button>
                        <Button
                            type={currentStep === 1 ? 'primary' : 'default'}
                            size="small"
                            disabled={!canAccessStep2}
                            onClick={() => canAccessStep2 && setCurrentStep(1)}
                        >
                            2. 设置检索参数&评估指标
                        </Button>
                    </div>
                )}
                    {(allQ.manualQuestion?.length || 0) + (allQ.autoQuestion?.length || 0) === 0 ? renderStep1() : (currentStep === 0 ? renderStep1() : renderStep2())}</>
            )}

        </Modal>
    );
};

export default CreateEvaluationModal;
