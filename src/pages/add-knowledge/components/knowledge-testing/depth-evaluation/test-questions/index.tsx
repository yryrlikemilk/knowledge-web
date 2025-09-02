import React, { useState } from 'react';
import { Typography, Space, Button, Table, Tag, Modal, message, Tooltip } from 'antd';
import { Edit, Delete, Trash2 } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';

const { Title, Paragraph } = Typography;

interface QuestionItem {
    id: number;
    question: string;
    type: string;
    source: string;
    sourceFile: string;
    status: 'active' | 'inactive' | 'testing';
    createTime: string;
}

const TestQuestions = () => {
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);

    // 模拟测试问题数据
    const [testQuestions, setTestQuestions] = useState<QuestionItem[]>([
        {
            id: 1,
            question: '什么是人工智能？',
            type: '基础概念',
            source: '用户输入',
            sourceFile: 'AI基础文档.pdf',
            status: 'active',
            createTime: '2024-01-15 10:30:00'
        },
        {
            id: 2,
            question: '机器学习的主要类型有哪些？',
            type: '技术分类',
            source: '知识库',
            sourceFile: 'ML技术手册.docx',
            status: 'active',
            createTime: '2024-01-16 14:20:00'
        },
        {
            id: 3,
            question: '深度学习与传统机器学习的区别是什么？',
            type: '技术对比',
            source: '用户输入',
            sourceFile: '深度学习指南.pdf',
            status: 'testing',
            createTime: '2024-01-17 09:15:00'
        },
        {
            id: 4,
            question: '神经网络的基本结构是什么？',
            type: '技术原理',
            source: '知识库',
            sourceFile: '神经网络基础.pdf',
            status: 'inactive',
            createTime: '2024-01-18 16:45:00'
        },
        {
            id: 5,
            question: '如何评估机器学习模型的性能？',
            type: '评估方法',
            source: '用户输入',
            sourceFile: '模型评估方法.docx',
            status: 'active',
            createTime: '2024-01-19 11:30:00'
        },
    ]);

    const handleDelete = (id: number) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个问题吗？',
            onOk() {
                setTestQuestions(prev => prev.filter(item => item.id !== id));
                message.success('删除成功');
            },
        });
    };

    const handleBatchDelete = () => {
        Modal.confirm({
            title: '批量删除',
            content: `确定要删除选中的 ${selectedRowKeys.length} 个问题吗？`,
            onOk() {
                setTestQuestions(prev => prev.filter(item => !selectedRowKeys.includes(item.id)));
                setSelectedRowKeys([]);
                message.success('批量删除成功');
            },
        });
    };

    const handleEdit = (record: QuestionItem) => {
        setEditingQuestion(record);
        setIsEditModalVisible(true);
    };

    const handleEditModalOk = () => {
        // 这里可以添加保存逻辑
        setIsEditModalVisible(false);
        setEditingQuestion(null);
        message.success('编辑成功');
    };

    const handleEditModalCancel = () => {
        setIsEditModalVisible(false);
        setEditingQuestion(null);
    };

    const getStatusTag = (status: string) => {
        const statusMap = {
            active: { color: 'green', text: '活跃' },
            inactive: { color: 'red', text: '停用' },
            testing: { color: 'blue', text: '测试中' },
        };
        const config = statusMap[status as keyof typeof statusMap];
        return <Tag color={config.color}>{config.text}</Tag>;
    };

    const columns: ColumnsType<QuestionItem> = [
        {
            title: '问题',
            dataIndex: 'question',
            key: 'question',
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
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: (type: string) => <Tag color="blue">{type}</Tag>,
        },
        {
            title: '来源',
            dataIndex: 'source',
            key: 'source',
            width: 100,
        },
        {
            title: '来源文件',
            dataIndex: 'sourceFile',
            key: 'sourceFile',
            width: 150,
            ellipsis: true,
            render: (text: string) => (
                <Tooltip title={text} placement="topLeft">
                    <span style={{ cursor: 'help' }}>{text}</span>
                </Tooltip>
            ),
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => getStatusTag(status),
        },
        {
            title: '创建时间',
            dataIndex: 'createTime',
            key: 'createTime',
            width: 100,
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="default"
                        size="small"
                        icon={<Edit size={12} />}
                        onClick={() => handleEdit(record)}
                    >
                        编辑
                    </Button>
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

            <Table
                columns={columns}
                dataSource={testQuestions}
                rowKey="id"
                rowSelection={rowSelection}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                }}
                scroll={{ x: 1000 }}
            />

            <Modal
                title="编辑问题"
                open={isEditModalVisible}
                onOk={handleEditModalOk}
                onCancel={handleEditModalCancel}
                width={600}
            >
                {editingQuestion && (
                    <div>
                        <p><strong>问题：</strong>{editingQuestion.question}</p>
                        <p><strong>类型：</strong>{editingQuestion.type}</p>
                        <p><strong>来源：</strong>{editingQuestion.source}</p>
                        <p><strong>来源文件：</strong>{editingQuestion.sourceFile}</p>
                        <p><strong>状态：</strong>{getStatusTag(editingQuestion.status)}</p>
                        <p><strong>创建时间：</strong>{editingQuestion.createTime}</p>
                        {/* 这里可以添加表单来编辑问题 */}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TestQuestions;
