import React, { useState } from 'react';
import { Typography, Space, Button, Table, Tag, Modal, message, Tooltip, Dropdown, Form, Input, Select } from 'antd';
import { Edit, Delete, Trash2, Plus, ChevronDown } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { useFetchRetrievalQuestionPageList, useDeleteQuestions, useFetchQuestionCategory } from '@/hooks/knowledge-hooks';
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
    const [form] = Form.useForm();
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
    const [isManualModalVisible, setIsManualModalVisible] = useState(false);
    const [isAIModalVisible, setIsAIModalVisible] = useState(false);
    const [current, setCurrent] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [filters, setFilters] = useState({
        question_text: '',
        auto_generate: '',
        status: '',
        category_sub: '',
    });
    const { questionPageList } = useFetchRetrievalQuestionPageList(current, pageSize, filters);

    const { categories: categoryOptions } = useFetchQuestionCategory();
    const { deleteQuestions } = useDeleteQuestions();

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
            dataIndex: 'doc_name',
            key: 'doc_name',
            width: 150,
            ellipsis: true,
            render: (doc_name: string) => (
                <Tooltip title={doc_name} placement="topLeft">
                    <span style={{ cursor: 'help' }}>{doc_name || '-'}</span>
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
            width: 160,
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

    const handleSearch = () => {
        const values = form.getFieldsValue();
        setFilters({
            question_text: values.question_text || '',
            auto_generate: values.auto_generate || '',
            status: values.status || '',
            category_sub: values.category_sub || '',
        });
        setCurrent(1);
    };

    const handleReset = () => {
        form.resetFields();
        setFilters({ question_text: '', auto_generate: '', status: '', category_sub: '' });
        setCurrent(1);
    };

    return (
        <div style={{ marginTop:36 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
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

            {/* 筛选表单 */}
            <div style={{ marginBottom: 16 }}>
                <Form form={form} layout="inline">
                    <Form.Item label="问题" name="question_text" style={{ marginBottom: 12 }}>
                        <Input allowClear placeholder="请输入问题" style={{ width: 160 }} />
                    </Form.Item>
                    {categoryOptions.length > 0 && (
                        <Form.Item label="类型" name="category_sub" style={{ marginBottom: 12 }}>
                            <Select allowClear placeholder="请选择类型" style={{ width: 160 }}>
                            {categoryOptions.map((c: string) => (
                                    <Select.Option key={c} value={c}>{c}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    )}

                    <Form.Item label="来源" name="auto_generate" style={{ marginBottom: 12 }}>
                        <Select allowClear placeholder="请选择来源" style={{ width: 160 }}>
                            <Select.Option value="false">手动输入</Select.Option>
                            <Select.Option value="true">AI生成</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="状态" name="status" style={{ marginBottom: 12 }}>
                        <Select allowClear placeholder="请选择状态" style={{ width: 160 }}>
                            <Select.Option value="0">待测试</Select.Option>
                            <Select.Option value="1">已测试</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 12 }}>
                        <Space>
                            <Button type="primary" onClick={handleSearch}>搜索</Button>
                            <Button onClick={handleReset}>重置</Button>
                        </Space>
                    </Form.Item>
                </Form>
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
                        showTotal: (total) => `共 ${total} 条`,
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
