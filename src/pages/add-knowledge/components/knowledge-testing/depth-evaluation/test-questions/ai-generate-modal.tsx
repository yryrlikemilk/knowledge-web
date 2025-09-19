import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, message, InputNumber, Table, Button, Space, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useGenerateAiQuestion, useFetchFileUpdates, useFetchAiQuestionCount, useFetchCheckFirstGenerate, useFetchAiQuestionCountByDocIds, useOtherDocGenerateAiQuestion } from '@/hooks/knowledge-hooks';

interface AIGenerateModalProps {
    visible: boolean;
    onCancel: () => void;
    onOk: () => void;
}

const AIGenerateModal: React.FC<AIGenerateModalProps> = ({ visible, onCancel, onOk }) => {
    const [form] = Form.useForm();
    const { generateAiQuestion, loading } = useGenerateAiQuestion();
    const { fileUpdates, loading: updatesLoading, refetch } = useFetchFileUpdates();
    const { questionCount, loading: countLoading, refetch: refetchCount } = useFetchAiQuestionCount();
    const { firstGenerateStatus, loading: firstGenerateLoading, refetch: refetchFirstGenerate } = useFetchCheckFirstGenerate();
    const { fetchCount } = useFetchAiQuestionCountByDocIds();
    const { otherDocGenerateAiQuestion, loading: otherGenLoading } = useOtherDocGenerateAiQuestion();

    // 左侧面板选中：'new' | 'edited'
    const [activeSource, setActiveSource] = useState<'new' | 'edited'>('new');
    // 右侧表格已选中id
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

    // 可显示的数据，根据左侧选择切换
    const displayedDocuments = useMemo(() => {
        return activeSource === 'new' ? (fileUpdates.newDocuments || []) : (fileUpdates.modifiedDocuments || []);
    }, [activeSource, fileUpdates]);

    // 弹窗首次打开且有数据时，默认全选当前类别
    useEffect(() => {
        if (visible && fileUpdates?.hasUpdates) {
            const initialList = activeSource === 'new' ? (fileUpdates.newDocuments || []) : (fileUpdates.modifiedDocuments || []);
            setSelectedDocIds(initialList.map((d: any) => d.id).filter(Boolean));
        }
        // 仅在visible或数据源变化时重新默认选中
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, activeSource, fileUpdates?.newDocuments, fileUpdates?.modifiedDocuments]);

    const [dynamicLimit, setDynamicLimit] = useState<number | undefined>(undefined);
    const [fetchingCount, setFetchingCount] = useState<boolean>(false);

    useEffect(() => {
        if (visible) {
            refetch();
            refetchCount();
            refetchFirstGenerate();
        } else {
            // 弹窗关闭时重置内部状态，确保下次打开先显示文件列表
            setDynamicLimit(undefined);
            setSelectedDocIds([]);
            setActiveSource('new');
        }
    }, [visible, refetch, refetchCount, refetchFirstGenerate]);

    const handleOk = async () => {
        const values = await form.validateFields();
        const max = Number(questionCount?.limitCount || 0);
        const qty = Number(values.questionCount || 0);
        if (!qty || qty < 1 || (max > 0 && qty > max)) {
            message.warning(`请输入大于1的数量`);
            return;
        }
        await generateAiQuestion(qty);
        message.success('问题生成成功');
        form.resetFields();
        onOk();
    };

    // 点击重新生成：按选中文档获取题目数量限制
    const handleFetchCountByDocIds = async () => {
        const ids = selectedDocIds;
        if (!ids || ids.length === 0) {
            message.warning('请先选择文件');
            return;
        }
        setFetchingCount(true);
        try {
            const res = await fetchCount(ids);
            form.setFieldsValue({ questionCount: res.recommendCount || 0 });
            setDynamicLimit(res.limitCount || 0);
        } finally {
            setFetchingCount(false);
        }
    };


    const handleCancel = () => {
        form.resetFields();
        setDynamicLimit(undefined);
        setSelectedDocIds([]);
        setActiveSource('new');
        onCancel();
    };


    return (
        <Modal
            title={
                <div style={{ textAlign: 'center' }}>
                    <span>AI生成测试问题</span>
                </div>
            }
            open={visible}
            onCancel={handleCancel}
            width={900}
            confirmLoading={loading}
            footer={null}
        >
            <div style={{ overflow: 'auto' }}>
                <Form form={form} layout="horizontal" >
                    {updatesLoading || countLoading || firstGenerateLoading ? (
                        <div style={{ marginTop: 40, textAlign: 'center' }}>
                            <div>加载中...</div>
                        </div>
                    ) : firstGenerateStatus === 1 ? (
                        <div style={{ marginTop: 40 }}>
                            <Form.Item
                                name="questionCount"
                                label="问题数量"
                                rules={[{ required: true, message: '请输入生成数量' }]}
                                initialValue={questionCount.recommendCount || 50}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <InputNumber
                                        min={1}
                                        max={questionCount.limitCount || 200}
                                        style={{ width: '100%' }}
                                        placeholder="请输入要生成的问题数量"
                                    />
                                    <Tooltip
                                        title={
                                            <div style={{ maxWidth: 280, lineHeight: 1.6 }}>
                                                <div><strong>问题总数推荐规则：</strong></div>
                                                <div>· 小文件（解析块 &lt; 10）：1-2 个问题</div>
                                                <div>· 中文件（10 ≤ 解析块 ≤ 100）：3-5 个问题</div>
                                                <div>· 大文件（解析块 &gt; 100）：10-20 个问题</div>
                                                <div style={{ marginTop: 6 }}><strong>推荐值：</strong>按每类文件最低值计算总和，支持修改但不超过上限。</div>
                                                <div><strong>上限值：</strong>按每类文件最高值计算总和。</div>
                                            </div>
                                        }
                                    >
                                        <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 16, cursor: 'pointer' }} />
                                    </Tooltip>
                                </div>
                            </Form.Item>
                            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 10 }}>
                                <Button onClick={handleCancel}> 取消</Button>
                                <Button type='primary' loading={loading} onClick={handleOk}> 生成</Button>
                            </div>

                        </div>
                    ) : (
                        fileUpdates.hasUpdates === false ? (
                            <div style={{ marginTop: 40 }}>
                                <div  style={{ textAlign: 'center' }}>您当前知识库文件内容没有任何变更，暂时不需要重新生成</div>
                                <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
                                    <Button type='primary' onClick={handleCancel}> 关闭弹窗</Button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginTop: 40 }}>

                                {typeof dynamicLimit === 'undefined' ? (
                                    <>
                                        <div style={{ textAlign: 'center' }}>知识库文件内容有变动，以下文件建议重新生成问题</div>
                                        {/* 文件变更列表（两列布局） */}
                                        <div style={{
                                            display: 'flex',
                                            marginTop: 16,
                                            border: '1px solid #d9d9d9',
                                            borderRadius: 6,
                                            overflow: 'hidden'
                                        }}>
                                            {/* 左侧：文件类型选择 */}
                                            <div style={{
                                                width: 200,
                                                flexShrink: 0,
                                                borderRight: '1px solid #d9d9d9',
                                                padding: 16,
                                                backgroundColor: '#fafafa'
                                            }}>
                                                <div style={{ marginBottom: 12, fontWeight: 'bold' }}>文件类型</div>
                                                <Space direction="vertical" style={{ width: '100%' }}>
                                                    <Button
                                                        type={activeSource === 'new' ? 'primary' : 'default'}
                                                        block
                                                        onClick={() => setActiveSource('new')}
                                                        disabled={(fileUpdates.newDocuments?.length || 0) === 0}
                                                    >
                                                        最新上传 ({fileUpdates.newDocuments?.length || 0})
                                                    </Button>
                                                    <Button
                                                        type={activeSource === 'edited' ? 'primary' : 'default'}
                                                        block
                                                        onClick={() => setActiveSource('edited')}
                                                        disabled={(fileUpdates.modifiedDocuments?.length || 0) === 0}
                                                    >
                                                        最新编辑 ({fileUpdates.modifiedDocuments?.length || 0})
                                                    </Button>
                                                </Space>
                                            </div>

                                            {/* 右侧：文件列表 */}
                                            <div style={{ flex: 1, padding: 16 }}>
                                                <div style={{ marginBottom: 12, fontWeight: 'bold' }}>
                                                    文件列表 (已选择 {selectedDocIds.length} 个)
                                                </div>
                                                <Table
                                                    columns={[
                                                        { title: '文件名', dataIndex: 'name', key: 'name', width: 300 },
                                                        { title: '更新时间', dataIndex: 'updateDate', key: 'updateDate' },
                                                    ]}
                                                    dataSource={displayedDocuments}
                                                    rowKey={(r: any) => r.id}
                                                    pagination={false}
                                                    size="small"
                                                    onRow={(record: any) => ({
                                                        onClick: () => {
                                                            const id = record.id;
                                                            if (!id) return;
                                                            setSelectedDocIds((prev) =>
                                                                prev.includes(id)
                                                                    ? prev.filter((x) => x !== id)
                                                                    : [...prev, id],
                                                            );
                                                        },
                                                        style: {
                                                            cursor: 'pointer',
                                                            backgroundColor: selectedDocIds.includes(record.id) ? '#e6f7ff' : 'transparent',
                                                        },
                                                    })}
                                                    locale={{ emptyText: '暂无文件' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 10 }}>
                                            <Button onClick={handleCancel}> 取消</Button>
                                            <Button type='primary' loading={fetchingCount} onClick={handleFetchCountByDocIds}> 重新生成</Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Form.Item
                                            name="questionCount"
                                            label="问题数量"
                                            rules={[{ required: true, message: '请输入生成数量' }]}
                                            initialValue={questionCount.recommendCount || 50}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <InputNumber
                                                    min={1}
                                                    max={dynamicLimit || questionCount.limitCount || 200}
                                                    style={{ width: '100%' }}
                                                    placeholder="请输入要生成的问题数量"
                                                />
                                                <Tooltip
                                                    title={
                                                        <div style={{ maxWidth: 280, lineHeight: 1.6 }}>
                                                            <div><strong>问题总数推荐规则：</strong></div>
                                                            <div>· 小文件（解析块 &lt; 10）：1-2 个问题</div>
                                                            <div>· 中文件（10 ≤ 解析块 ≤ 100）：3-5 个问题</div>
                                                            <div>· 大文件（解析块 &gt; 100）：10-20 个问题</div>
                                                            <div style={{ marginTop: 6 }}><strong>推荐值：</strong>按每类文件最低值计算总和，支持修改但不超过上限。</div>
                                                            <div><strong>上限值：</strong>按每类文件最高值计算总和。</div>
                                                        </div>
                                                    }
                                                >
                                                    <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 16, cursor: 'pointer' }} />
                                                </Tooltip>
                                            </div>
                                        </Form.Item>
                                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 10 }}>
                                            <Button
                                                type='primary'
                                                loading={otherGenLoading}
                                                onClick={async () => {
                                                    const { questionCount } = await form.validateFields();
                                                    const qty = Number(questionCount || 0);
                                                    const max = Number(dynamicLimit || 0);
                                                    if (!qty || qty < 1 || (max > 0 && qty > max)) {
                                                        message.warning(`请输入大于1的数量`);
                                                        return;
                                                    }
                                                    await otherDocGenerateAiQuestion({ doc_ids: selectedDocIds, question_count: qty });
                                                    message.success('问题生成成功');
                                                    handleCancel();
                                                }}
                                            > 确定生成</Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}




                </Form>
            </div>




        </Modal>
    );
};

export default AIGenerateModal;
