import React, { useState } from 'react';
import { Typography, Space, Button, Table, Tag, Modal, message, Tooltip, Dropdown } from 'antd';
import { Edit, Delete, Trash2, Plus, ChevronDown } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { useFetchRetrievalQuestionPageList, useDeleteQuestions } from '@/hooks/knowledge-hooks';
import ManualInputModal from './manual-input-modal';
import AIGenerateModal from './ai-generate-modal';
import EditQuestionModal from './edit-question-modal';

const { Title, Paragraph } = Typography;

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
}

const TestQuestions = () => {
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
    const [isManualModalVisible, setIsManualModalVisible] = useState(false);
    const [isAIModalVisible, setIsAIModalVisible] = useState(false);
    const [current, setCurrent] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const { questionPageList } = useFetchRetrievalQuestionPageList(current, pageSize);
    const { deleteQuestions, loading: deleteLoading } = useDeleteQuestions();

    const handleDelete = (questionId: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个问题吗？',
            onOk: async () => {
                try {
                    await deleteQuestions([questionId]);
                } catch (error) {
                    console.error('删除问题失败:', error);
                    message.error(error instanceof Error ? error.message : '删除失败');
                }
            },
        });
    };

    const handleBatchDelete = () => {
        Modal.confirm({
            title: '批量删除',
            content: `确定要删除选中的 ${selectedRowKeys.length} 个问题吗？`,
            onOk: async () => {
                try {
                    await deleteQuestions(selectedRowKeys as string[]);
                    setSelectedRowKeys([]);
                } catch (error) {
                    console.error('批量删除失败:', error);
                    message.error(error instanceof Error ? error.message : '批量删除失败');
                }
            },
        });
    };

    const handleEdit = (record: QuestionItem) => {
        setEditingQuestion(record);
        setIsEditModalVisible(true);
    };

    const handleEditModalOk = () => {
        setIsEditModalVisible(false);
        setEditingQuestion(null);
        // 成功提示和问题列表刷新已在hook中处理
    };

    const handleEditModalCancel = () => {
        setIsEditModalVisible(false);
        setEditingQuestion(null);
    };

    const handleManualInput = () => {
        setIsManualModalVisible(true);
    };

    const handleAIGenerate = () => {
        setIsAIModalVisible(true);
    };

    const handleManualModalOk = () => {
        setIsManualModalVisible(false);
        // 成功提示和问题列表刷新已在hook中处理
    };

    const handleAIModalOk = () => {
        setIsAIModalVisible(false);
        // 成功提示和问题列表刷新已在hook中处理
    };

    const getStatusTag = (status: number) => {
        const statusMap = {
            0: { color: 'yellow', text: '待测试' },
            1: { color: 'green', text: '已测试' },
        };
        const config = statusMap[status as keyof typeof statusMap] || statusMap[0];
        return <Tag color={config.color}>{config.text}</Tag>;
    };

    const columns: ColumnsType<QuestionItem> = [
        {
            title: '问题',
            dataIndex: 'question_text',
            key: 'question_text',
            width: 300,
            ellipsis: true,
            render: (text: string) => (
                <Tooltip title={text} placement="topLeft">
                    <span style={{ cursor: 'help' }}>{text}</span>
                </Tooltip>
            ),
        },
        {
            title: '类型',
            dataIndex: 'category_sub',
            key: 'category_sub',
            width: 120,
            render: (category: string) => <Tag color="blue">{category || '未分类'}</Tag>,
        },
        {
            title: '来源',
            dataIndex: 'auto_generate',
            key: 'auto_generate',
            width: 100,
            render: (autoGenerate: boolean) => autoGenerate ? 'AI生成' : '手动输入',
        },
        {
            title: '来源文件',
            dataIndex: 'doc_id',
            key: 'doc_id',
            width: 150,
            ellipsis: true,
            render: (docId: string) => (
                <Tooltip title={docId} placement="topLeft">
                    <span style={{ cursor: 'help' }}>{docId || '-'}</span>
                </Tooltip>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: number) => getStatusTag(status),
        },
        {
            title: '创建时间',
            dataIndex: 'create_time',
            key: 'create_time',
            width: 150,
            render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-',
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    {!record.auto_generate && (
                        <Button
                            type="default"
                            size="small"
                            icon={<Edit size={12} />}
                            onClick={() => handleEdit(record)}
                        >
                            编辑
                        </Button>
                    )}
                    <Button
                        type="text"
                        size="small"
                        icon={<Delete size={12} />}
                        danger
                        onClick={() => handleDelete(record.id)}
                    >
                        删除
                    </Button>
                </Space>
            ),
        },
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: React.Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    return (
        <div style={{ padding: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <Title level={3}>测试问题列表</Title>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'manual',
                                    label: (
                                        <div style={{ padding: '8px 0' }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>手动输入</div>
                                        </div>
                                    ),
                                    onClick: handleManualInput,
                                },
                                {
                                    key: 'ai',
                                    label: (
                                        <div style={{ padding: '8px 0' }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>AI生成</div>
                                        </div>
                                    ),
                                    onClick: handleAIGenerate,
                                },
                            ],
                        }}
                        trigger={['click']}
                        placement="bottomLeft"
                    >
                        <Button type="primary" style={{ marginBottom: '20px' }} icon={<Plus size={16} />}>
                            新增测试问题 <ChevronDown size={14} />
                        </Button>
                    </Dropdown>
                </div>
                <Button
                    type="primary"
                    danger
                    icon={<Trash2 size={16} />}
                    disabled={selectedRowKeys.length === 0}
                    onClick={handleBatchDelete}
                >
                    批量删除 ({selectedRowKeys.length})
                </Button>
            </div>

            {questionPageList.records.length > 0 ? (
                <Table
                    columns={columns}
                    dataSource={questionPageList.records}
                    rowKey="id"
                    rowSelection={rowSelection}
                    pagination={{
                        current,
                        pageSize,
                        total: questionPageList.total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => `共 ${total} 条`,
                        onChange: (page, size) => {
                            setCurrent(page);
                            setPageSize(size || 10);
                        },
                    }}
                    scroll={{ x: 1000 }}
                />
            ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Title level={4}>暂无测试问题数据</Title>
                    <Paragraph type="secondary">
                        您还没有创建过任何测试问题，请点击上方按钮创建第一个测试问题
                    </Paragraph>
                </div>
            )}

            {/* 编辑问题弹窗 */}
            <EditQuestionModal
                visible={isEditModalVisible}
                onCancel={handleEditModalCancel}
                onOk={handleEditModalOk}
                question={editingQuestion}
            />

            {/* 手动输入弹窗 */}
            <ManualInputModal
                visible={isManualModalVisible}
                onCancel={() => setIsManualModalVisible(false)}
                onOk={handleManualModalOk}
            />

            {/* AI生成弹窗 */}
            <AIGenerateModal
                visible={isAIModalVisible}
                onCancel={() => setIsAIModalVisible(false)}
                onOk={handleAIModalOk}
            />
        </div>
    );
};

export default TestQuestions;
