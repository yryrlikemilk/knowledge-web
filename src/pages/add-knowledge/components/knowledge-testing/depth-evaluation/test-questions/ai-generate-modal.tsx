import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Modal, Form, message, InputNumber, Table, Button, Space, Tooltip, Progress, List, Card } from 'antd';
import { InfoCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { useGenerateAiQuestion, useFetchFileUpdates, useFetchAiQuestionCount, useFetchCheckFirstGenerate, useFetchAiQuestionCountByDocIds, useOtherDocGenerateAiQuestion, useGenerateProgress, useSaveAiQuestions, useKnowledgeBaseId } from '@/hooks/knowledge-hooks';
import { useGenerateProgressContext } from '@/contexts/generate-progress-context';

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
    const { startProgress, progressState, clearProgress } = useGenerateProgressContext();
    const kbId = useKnowledgeBaseId();

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
    const [historyId, setHistoryId] = useState<string | null>(null);
    const [showProgress, setShowProgress] = useState<boolean>(false);
    const [lastGenerateType, setLastGenerateType] = useState<'all' | 'selected' | null>(null);
    const [lastQuestionCount, setLastQuestionCount] = useState<number | null>(null);
    const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

    const [questionNumber, setQuestionNumber] = useState<{
        value: number;
        validateStatus?: 'error' | 'success' | undefined;
        errorMsg?: string | null;
    }>({ value: questionCount?.recommendCount ?? 1 });
    const manualEditedRef = useRef(false);

    // 轮询进度 - 使用全局状态中的 historyId 或本地 historyId
    const activeHistoryId = progressState?.historyId || historyId;
    const { progressData } = useGenerateProgress(activeHistoryId);
    // 保存AI问题
    const { saveAiQuestions, loading: saveLoading } = useSaveAiQuestions();

    useEffect(() => {
        if (visible) {
            refetch();
            refetchCount();
            refetchFirstGenerate();
            // 如果全局状态中有正在进行的任务，同步到本地状态
            if (progressState?.historyId) {
                setHistoryId(progressState.historyId);
                setShowProgress(true);
                setLastGenerateType(progressState.lastGenerateType);
                setLastQuestionCount(progressState.lastQuestionCount);
            }
        }
        // 注意：弹窗关闭时的逻辑在 handleCancel 中处理，这里不做处理
    }, [visible, refetch, refetchCount, refetchFirstGenerate, progressState]);

    const handleOk = async () => {
        const values = await form.validateFields();
        const max = Number(questionCount?.limitCount || 0);
        const qty = Number(values.questionCount || 0);
        if (!qty || qty < 1 || (max > 0 && qty > max)) {
            message.warning(`请输入大于1的数量`);
            return;
        }

        try {
            const result = await generateAiQuestion(qty);
            if (result?.history_id) {
                setHistoryId(result.history_id);
                setShowProgress(true);
                setLastGenerateType('all');
                setLastQuestionCount(qty);
                // 不立即启动全局进度跟踪，等弹窗关闭后再启动
                message.info('开始生成问题，请稍候...');
            }
        } catch (error) {
            message.error('生成失败，请重试');
        }
    };

    // 处理选中文档生成问题
    const handleOtherDocGenerate = async () => {
        const values = await form.validateFields();
        const max = Number(dynamicLimit || 0);
        const qty = Number(values.questionCount || 0);
        if (!qty || qty < 1 || (max > 0 && qty > max)) {
            message.warning(`请输入大于1的数量`);
            return;
        }

        try {
            const result = await otherDocGenerateAiQuestion({ doc_ids: selectedDocIds, question_count: qty });
            if (result?.history_id) {
                setHistoryId(result.history_id);
                setShowProgress(true);
                setLastGenerateType('selected');
                setLastQuestionCount(qty);
                // 不立即启动全局进度跟踪，等弹窗关闭后再启动
                message.info('开始生成问题，请稍候...');
            }
        } catch (error) {
            message.error('生成失败，请重试');
        }
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
            const rec = res.recommendCount || 0;
            form.setFieldsValue({ questionCount: rec });
            setDynamicLimit(res.limitCount || 0);
            // 同步本地状态（并标记为未手动修改，若希望覆盖用户输入可去掉 manualEditedRef）
            manualEditedRef.current = false;
            const validateQuestionCount = (val: number | undefined, max?: number) => {
                const value = Number(val || 0);
                if (!value || value < 1) {
                    return { value, validateStatus: 'error' as const, errorMsg: '请输入大于0的数量' };
                }
                if (max && max > 0 && value > max) {
                    return { value, validateStatus: 'error' as const, errorMsg: `不能超过上限 ${max}` };
                }
                return { value, validateStatus: 'success' as const, errorMsg: null };
            };
            setQuestionNumber(validateQuestionCount(rec, res.limitCount || 0));
            // try {
            //     const res = await fetchCount(ids);
            //     form.setFieldsValue({ questionCount: res.recommendCount || 0 });
            //     setDynamicLimit(res.limitCount || 0);
        }
        finally {
            setFetchingCount(false);
        }
    };


    const handleCancel = () => {
        form.resetFields();
        setDynamicLimit(undefined);
        setSelectedDocIds([]);
        setActiveSource('new');

        // 检查是否有正在进行的任务（本地状态）
        const hasActiveTask = historyId && showProgress;
        // 获取当前进度值，优先使用全局状态，其次使用轮询数据
        const currentProgressValue = progressState?.progress ?? progressData?.progress ?? 0;
        // 判断任务是否正在进行中（有任务且进度不是1（完成）也不是-1（失败））
        const isTaskInProgress = hasActiveTask && currentProgressValue !== 1 && currentProgressValue !== -1;

        if (isTaskInProgress && !progressState?.historyId) {
            // 如果正在生成中且全局状态还没有启动，关闭弹窗后启动全局进度跟踪（显示左下角提示）
            if (lastGenerateType && lastQuestionCount !== null && historyId) {
                startProgress(
                    historyId,
                    lastGenerateType,
                    lastQuestionCount,
                    lastGenerateType === 'selected' ? selectedDocIds : [],
                    kbId || null
                );
            }
            setShowProgress(false);
        } else {
            // 如果任务已完成、失败、没有任务，或者全局状态已经启动，清除本地状态
            setHistoryId(null);
            setShowProgress(false);
            // 如果全局状态存在且任务已完成或失败，清除全局状态
            if (progressState && (progressState.progress === 1 || progressState.error)) {
                clearProgress();
            }
        }
        onCancel();
    };


    // 当弹窗打开或后端的 recommendCount 更新且用户未手动修改时，初始化本地值与表单
    useEffect(() => {
        if (visible && !manualEditedRef.current) {
            const v = questionCount?.recommendCount ?? 1;
            setQuestionNumber({ value: v, validateStatus: undefined, errorMsg: null });
            form.setFieldsValue({ questionCount: v });
        }
    }, [visible, questionCount, form]);

    // 当通过按选中文档获取推荐值时，也同步到本地 state（handleFetchCountByDocIds 已经设置了 form）
    // 确保 handleFetchCountByDocIds 在设置 form 后也调用 setQuestionNumber（见下方修改）

    const validateQuestionCount = (val: number | undefined, max?: number) => {
        const value = Number(val || 0);
        if (!value || value < 1) {
            return { value, validateStatus: 'error' as const, errorMsg: '请输入大于0的数量' };
        }
        if (max && max > 0 && value > max) {
            return { value, validateStatus: 'error' as const, errorMsg: `不能超过上限 ${max}` };
        }
        return { value, validateStatus: 'success' as const, errorMsg: null };
    };

    const onNumberChange: React.ComponentProps<typeof InputNumber>['onChange'] = (val) => {
        const max = dynamicLimit || questionCount?.limitCount || 0;
        const next = validateQuestionCount(val as number, max);
        manualEditedRef.current = true;
        setQuestionNumber(next);
        // 同步到 form
        form.setFieldsValue({ questionCount: next.value });
    };

    // 监听进度完成 - 使用全局状态或本地进度数据
    const currentProgress = progressState?.progress ?? progressData.progress;
    useEffect(() => {
        if (currentProgress === 1 && showProgress) {
            message.success('问题生成完成！');
            // 不自动关闭弹窗，保持显示问题列表
        }
    }, [currentProgress, showProgress]);


    return (
        <Modal
            title={
                <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
                    <span>AI生成测试问题</span>
                </div>
            }
            open={visible}
            onCancel={handleCancel}
            closable={true}
            maskClosable={true}
            closeIcon={<CloseOutlined onClick={handleCancel} />}
            width={900}
            confirmLoading={loading}
            footer={null}
        >
            <div style={{ overflow: 'auto' }}>
                <Form form={form} layout="horizontal" >
                    {showProgress ? (
                        <div style={{ padding: '20px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                {(currentProgress === -1 || progressState?.error) ? (
                                    <>
                                        <div style={{ marginBottom: '16px', color: '#faad14', fontSize: '14px' }}>
                                            网络不好，请稍后再试
                                        </div>
                                        <div>
                                            <Button type='primary' onClick={async () => {
                                                const qty = lastQuestionCount ?? form.getFieldValue('questionCount');
                                                if (!qty) {
                                                    message.warning('未获取到问题数量');
                                                    return;
                                                }
                                                if (lastGenerateType === 'selected') {
                                                    // 直接复用接口，避免再次验证表单
                                                    try {
                                                        const result = await otherDocGenerateAiQuestion({ doc_ids: selectedDocIds, question_count: Number(qty) });
                                                        if (result?.history_id) {
                                                            setHistoryId(result.history_id);
                                                            setShowProgress(true);
                                                            setLastQuestionCount(Number(qty));
                                                            // 不立即启动全局进度跟踪，等弹窗关闭后再启动
                                                            message.info('开始生成问题，请稍候...');
                                                        }
                                                    } catch (e) {
                                                        message.error('生成失败，请重试');
                                                    }
                                                } else if (lastGenerateType === 'all') {
                                                    try {
                                                        const result = await generateAiQuestion(Number(qty));
                                                        if (result?.history_id) {
                                                            setHistoryId(result.history_id);
                                                            setShowProgress(true);
                                                            setLastQuestionCount(Number(qty));
                                                            // 不立即启动全局进度跟踪，等弹窗关闭后再启动
                                                            message.info('开始生成问题，请稍候...');
                                                        }
                                                    } catch (e) {
                                                        message.error('生成失败，请重试');
                                                    }
                                                } else {
                                                    message.warning('无法确定生成方式，请返回重试');
                                                }
                                            }}>重新生成</Button>
                                        </div>
                                    </>
                                ) : currentProgress !== 1 ? (
                                    <>
                                        {/* <div style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 'bold' }}>
                                            AI正在生成问题...
                                        </div> */}
                                        <Progress
                                            type="circle"
                                            percent={(currentProgress || 0) * 100}
                                            status={currentProgress === 1 ? 'success' : 'active'}
                                            strokeColor={{
                                                '0%': '#108ee9',
                                                '100%': '#87d068',
                                            }}
                                            size={120}
                                        />
                                        <div style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
                                            进度: {(currentProgress || 0) * 100}%
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                                        ✅ 问题生成完成！
                                    </div>
                                )}
                            </div>

                            {currentProgress === 1 && (progressState?.aiQuestions || progressData.aiQuestions)?.length > 0 && (
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>生成的问题预览:</div>
                                    <div style={{ maxHeight: '420px', overflow: 'auto' }}>
                                        {(progressState?.aiQuestions || progressData.aiQuestions || []).map((item: any, index: number) => {
                                            const key = `${item.category || '未分类'}-${index}`;
                                            const expanded = !!expandedMap[key];
                                            const shownQuestions = expanded ? item.questions : (item.questions || []).slice(0, 3);
                                            return (
                                                <Card
                                                    key={key}
                                                    size="small"
                                                    style={{ marginBottom: 12 }}
                                                    title={
                                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                            <span style={{ fontWeight: 600 }}>{item.category || '未分类'}</span>
                                                            <span style={{ color: '#666', fontSize: 12 }}>
                                                                ({item.doc_count}个文件，占{Math.round((item.question_ratio || 0) * 100)}%，共生成{item.question_count}个问题)
                                                            </span>
                                                        </div>
                                                    }
                                                    headStyle={{ padding: '8px 12px' }}
                                                    bodyStyle={{ padding: '8px 12px' }}
                                                >
                                                    <div style={{ borderBottom: '1px solid #f0f0f0', marginBottom: 8 }} />
                                                    <List
                                                        size="small"
                                                        dataSource={shownQuestions}
                                                        renderItem={(q: any) => (
                                                            <List.Item style={{ padding: '6px 0', fontSize: 14 }}>
                                                                {q.question_text}
                                                            </List.Item>
                                                        )}
                                                    />
                                                    {(item.questions?.length || 0) > 3 && (
                                                        <div style={{ textAlign: 'center', marginTop: 4 }}>
                                                            <Button type="link" size="small" onClick={() => setExpandedMap(prev => ({ ...prev, [key]: !expanded }))}>
                                                                {expanded ? '收起' : '查看更多'}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10 }}>
                                {(showProgress && currentProgress !== 1) ? (
                                    <>
                                    </>) : (<Button onClick={handleCancel}> 取消</Button>)}
                                {currentProgress === 1 && (
                                    <Button
                                        type='primary'
                                        loading={saveLoading}
                                        onClick={async () => {
                                            try {
                                                const questions = progressState?.aiQuestions || progressData.aiQuestions || [];
                                                const activeId = progressState?.historyId || historyId || '';
                                                console.log(`questions, activeId`, questions, activeId)

                                                await saveAiQuestions({
                                                    aiQuestions: questions,
                                                    historyId: activeId
                                                });
                                                setShowProgress(false);
                                                setHistoryId(null);
                                                clearProgress();
                                                onOk();
                                            } catch (error) {
                                                message.error('保存失败，请重试');
                                                console.log(`error`, error)
                                            }
                                        }}
                                    >
                                        添加到测试问题列表
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : updatesLoading || countLoading || firstGenerateLoading ? (
                        <div style={{ marginTop: 40, textAlign: 'center' }}>
                            <div>加载中...</div>
                        </div>
                    ) : firstGenerateStatus === 1 ? (
                        <div style={{ marginTop: 40 }}>
                            <Form.Item
                                name="questionCount"
                                label="问题数量"
                                rules={[{ required: true, message: '请输入生成数量' }]}
                                validateStatus={questionNumber.validateStatus}
                                help={questionNumber.errorMsg || null}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <InputNumber
                                        min={1}
                                        max={dynamicLimit || questionCount.limitCount || 200}
                                        value={questionNumber.value}
                                        style={{ width: '100%' }}
                                        placeholder="请输入要生成的问题数量"
                                        onChange={onNumberChange}
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
                                <div style={{ textAlign: 'center' }}>您当前知识库文件内容没有任何变更，暂时不需要重新生成</div>
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
                                            validateStatus={questionNumber.validateStatus}
                                            help={questionNumber.errorMsg || null}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <InputNumber
                                                    min={1}
                                                    max={dynamicLimit || questionCount.limitCount || 200}
                                                    value={questionNumber.value}
                                                    style={{ width: '100%' }}
                                                    placeholder="请输入要生成的问题数量"
                                                    onChange={onNumberChange}
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
                                                onClick={handleOtherDocGenerate}
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
