import React, { useEffect, useState } from 'react';
import { Progress, Button, Modal, Card, List, message } from 'antd';
import { useGenerateProgressContext } from '@/contexts/generate-progress-context';
import { useGenerateProgress } from '@/hooks/knowledge-hooks';
import { useOtherDocGenerateAiQuestion, useGenerateAiQuestion, useSaveAiQuestions } from '@/hooks/knowledge-hooks';
import styles from './index.less';

const GlobalProgressIndicator: React.FC = () => {
    const { progressState, updateProgress, setError, clearProgress, startProgress } = useGenerateProgressContext();
    const { progressData } = useGenerateProgress(progressState?.historyId || null);
    const { otherDocGenerateAiQuestion } = useOtherDocGenerateAiQuestion();
    const { generateAiQuestion } = useGenerateAiQuestion();
    const { saveAiQuestions, loading: saveLoading } = useSaveAiQuestions();
    const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
    const [showModal, setShowModal] = useState(false);

    // 同步轮询数据到全局状态
    useEffect(() => {
        if (progressState?.historyId && progressData) {
            if (progressData.progress === -1) {
                setError(true);
            } else {
                updateProgress(progressData.progress, progressData.aiQuestions);
            }
        }
    }, [progressData, progressState?.historyId, updateProgress, setError]);

    // 当进度完成或失败时，停止轮询（由 hook 内部处理）
    useEffect(() => {
        if (progressState && (progressState.progress === 1 || progressState.error)) {
            // 进度完成或失败，不需要额外操作，hook 会自动停止轮询
        }
    }, [progressState]);

    if (!progressState) {
        return null;
    }

    const handleViewClick = () => {
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        // 如果任务已完成或失败，关闭左下角提示
        if (progressState && (progressState.progress === 1 || progressState.error)) {
            clearProgress();
        }
    };

    const handleRetry = async () => {
        if (!progressState.lastQuestionCount) {
            message.warning('未获取到问题数量');
            return;
        }
        try {
            if (progressState.lastGenerateType === 'selected') {
                const result = await otherDocGenerateAiQuestion({
                    doc_ids: progressState.selectedDocIds,
                    question_count: progressState.lastQuestionCount,
                });
                if (result?.history_id) {
                    startProgress(result.history_id, 'selected', progressState.lastQuestionCount, progressState.selectedDocIds, progressState.knowledgeBaseId || null);
                    message.info('开始生成问题，请稍候...');
                }
            } else if (progressState.lastGenerateType === 'all') {
                const result = await generateAiQuestion(progressState.lastQuestionCount);
                if (result?.history_id) {
                    startProgress(result.history_id, 'all', progressState.lastQuestionCount, [], progressState.knowledgeBaseId || null);
                    message.info('开始生成问题，请稍候...');
                }
            }
        } catch (e) {
            message.error('生成失败，请重试');
        }
    };

    const handleSave = async () => {
        if (!progressState.historyId || !progressState.aiQuestions) {
            message.warning('没有可保存的问题');
            return;
        }
        try {
            await saveAiQuestions({
                aiQuestions: progressState.aiQuestions,
                historyId: progressState.historyId,
                kbIdOverride: progressState.knowledgeBaseId || undefined
            });
            setShowModal(false);
            clearProgress();
        } catch (error) {
            message.error('保存失败，请重试');
        }
    };

    const isCompleted = progressState.progress === 1;
    const isError = progressState.error || progressState.progress === -1;
    const isInProgress = !isCompleted && !isError;

    return (
        <>
            <div className={styles.progressIndicator}>
                <div className={styles.content}>
                    {isInProgress && (
                        <div className='flex flex-col'>
                            <Progress
                                type="line"
                                percent={(progressState.progress || 0) * 100}
                                strokeColor={{
                                    '0%': '#108ee9',
                                    '100%': '#87d068',
                                }}
                                showInfo={false}
                                style={{ width: 200, marginRight: 12 }}
                            />
                            <span className={styles.text}>正在从知识库自动生成测试问题中</span>
                        </div>
                    )}
                    {isCompleted && (
                        <>
                            <span className={styles.text}>AI写文档测试问题已完成</span>
                            <Button type="link" size="small" onClick={handleViewClick} style={{ marginLeft: 8 }}>
                                查看
                            </Button>
                        </>
                    )}
                    {isError && (
                        <>
                            <span className={styles.text} style={{ color: '#ff4d4f' }}>AI写文档测试问题失败</span>
                            <Button type="link" size="small" onClick={handleViewClick} style={{ marginLeft: 8 }}>
                                查看
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <Modal
                title="AI生成测试问题"
                open={showModal}
                onCancel={handleModalClose}
                width={900}
                footer={null}
                closable
            >
                <div style={{ padding: '20px' }}>
                    {isError ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div style={{ marginBottom: '16px', color: '#faad14', fontSize: '14px' }}>
                                网络不好，请稍后再试
                            </div>
                            <div>
                                <Button type="primary" onClick={handleRetry}>
                                    重新生成
                                </Button>
                            </div>
                        </div>
                    ) : isCompleted ? (
                        <>
                            {progressState.aiQuestions && progressState.aiQuestions.length > 0 && (
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>生成的问题预览:</div>
                                    <div style={{ maxHeight: '420px', overflow: 'auto' }}>
                                        {progressState.aiQuestions.map((item: any, index: number) => {
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
                                                            <Button
                                                                type="link"
                                                                size="small"
                                                                onClick={() => setExpandedMap((prev) => ({ ...prev, [key]: !expanded }))}
                                                            >
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
                                <Button onClick={handleModalClose}>取消</Button>
                                <Button type="primary" loading={saveLoading} onClick={handleSave}>
                                    添加到测试问题列表
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <Progress
                                type="circle"
                                percent={(progressState.progress || 0) * 100}
                                status="active"
                                strokeColor={{
                                    '0%': '#108ee9',
                                    '100%': '#87d068',
                                }}
                                size={120}
                            />
                            <div style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
                                进度: {(progressState.progress || 0) * 100}%
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default GlobalProgressIndicator;

