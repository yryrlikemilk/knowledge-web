import React, { useState } from 'react';
import { Typography, Button, Steps, Table, Tag } from 'antd';
import { FileText, Settings, BarChart3, Eye } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import CreateEvaluationModal from './create-evaluation-modal';
import { useNavigate, useLocation } from 'umi';
import { useFetchPageList } from '@/hooks/knowledge-hooks';

const { Title, Paragraph } = Typography;

interface EvaluationTask {
    id: string;
    taskName: string;
    questionCount: number;
    questionSource: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    score?: number;
    retrievalParams: string;
    evaluationParams: string;
    updateTime: string;
}

interface AutoEvaluationProps {
    onSwitchToQuestions?: () => void;
}

const AutoEvaluation: React.FC<AutoEvaluationProps> = ({ onSwitchToQuestions }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStep] = useState(0);
    const [modalVisible, setModalVisible] = useState(false);
    const { pageList } = useFetchPageList();
    const [taskList, setTaskList] = useState<EvaluationTask[]>([
        {
            id: '1',
            taskName: 'AI知识库评估任务',
            questionCount: 15,
            questionSource: '手工输入',
            status: 'completed',
            score: 85,
            retrievalParams: '相似度阈值: 20',
            evaluationParams: '系统默认指标',
            updateTime: '2024-01-15 14:30:00'
        },
        {
            id: '2',
            taskName: '机器学习文档测试',
            questionCount: 8,
            questionSource: 'AI生成',
            status: 'running',
            score: undefined,
            retrievalParams: '相似度阈值: 25',
            evaluationParams: '系统默认指标',
            updateTime: '2024-01-15 15:20:00'
        },
        {
            id: '3',
            taskName: '深度学习评估',
            questionCount: 12,
            questionSource: '手工输入+AI生成',
            status: 'pending',
            score: undefined,
            retrievalParams: '相似度阈值: 18',
            evaluationParams: 'Claude-3',
            updateTime: '2024-01-15 16:10:00'
        }
    ]);

    const steps = [
        {
            title: '准备测试问题',
            description: '选择或创建评估问题集',
            icon: <FileText size={20} />,
        },
        {
            title: '设置检索参数&评估指标',
            description: '配置检索参数和评估标准',
            icon: <Settings size={20} />,
        },
        {
            title: '自动生成评估报告',
            description: '大模型自动打分并生成报告',
            icon: <BarChart3 size={20} />,
        },
    ];

    // 移除未使用的函数

    const handleCreateTask = () => {
        setModalVisible(true);
    };

    const handleModalCancel = () => {
        setModalVisible(false);
        // 弹窗关闭时会自动清空数据（在弹窗组件中处理）
    };

    const handleModalOk = (data: {
        taskName: string;
        selectedQuestions: any[];
        formData: any;
    }) => {
        setModalVisible(false);

        // 输出所有收集的数据到控制台
        console.log('=== 创建评估任务数据 ===');
        console.log('任务名称:', data.taskName);
        console.log('选择的问题列表:', data.selectedQuestions);
        console.log('检索设置表单数据:', data.formData);
        console.log('=== 数据输出完成 ===', data);

        // 添加新任务到列表
        const newTask: EvaluationTask = {
            id: Date.now().toString(),
            taskName: data.taskName,
            questionCount: data.selectedQuestions.length,
            questionSource: data.selectedQuestions.some(q => q.source === 'manual') && data.selectedQuestions.some(q => q.source === 'ai')
                ? '手工输入+AI生成'
                : data.selectedQuestions.some(q => q.source === 'manual')
                    ? '手工输入'
                    : 'AI生成',
            status: 'pending',
            retrievalParams: `相似度阈值: ${data.formData.similarity_threshold}, 权重: ${data.formData.vector_similarity_weight}%`,
            evaluationParams: data.formData.model || 'GPT-3.5 Turbo',
            updateTime: new Date().toLocaleString('zh-CN')
        };

        setTaskList(prev => [newTask, ...prev]);
    };

    const handleViewReport = (record: EvaluationTask) => {
        const params = new URLSearchParams(location.search);
        const knowledgeId = params.get('id') || '';
        navigate(`/knowledge/testing/deep-search/report/${record.id}${knowledgeId ? `?id=${knowledgeId}` : ''}`);
    };

    const getStatusTag = (status: string) => {
        const statusMap = {
            pending: { color: 'default', text: '待开始' },
            running: { color: 'processing', text: '进行中' },
            completed: { color: 'success', text: '已完成' },
            failed: { color: 'error', text: '失败' }
        };
        const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
        return <Tag color={config.color}>{config.text}</Tag>;
    };

    const columns: ColumnsType<EvaluationTask> = [
        {
            title: '任务名',
            dataIndex: 'taskName',
            key: 'taskName',
            width: 200,
        },
        {
            title: '问题数量',
            dataIndex: 'questionCount',
            key: 'questionCount',
            width: 100,
            align: 'center',
        },
        {
            title: '问题来源',
            dataIndex: 'questionSource',
            key: 'questionSource',
            width: 120,
        },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => getStatusTag(status),
        },
        {
            title: '结果分数',
            dataIndex: 'score',
            key: 'score',
            width: 100,
            align: 'center',
            render: (score?: number) => score ? `${score}分` : '-',
        },
        {
            title: '检索参数',
            dataIndex: 'retrievalParams',
            key: 'retrievalParams',
            width: 200,
        },
        {
            title: '评估指标',
            dataIndex: 'evaluationParams',
            key: 'evaluationParams',
            width: 150,
        },
        {
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
            width: 150,
        },
        {
            title: '操作',
            key: 'action',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
                <Button
                    type="link"
                    icon={<Eye size={14} />}
                    onClick={() => handleViewReport(record)}
                    disabled={record.status !== 'completed'}
                >
                    查看报告
                </Button>
            ),
        },
    ];

    return (
        <div style={{
            padding: '0',
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
        }}>

            {/* 评估任务列表 - 根据pageList数据长度显示 */}
            {pageList.records.length > 0 ? (
                <div style={{ marginTop: '40px', width: '100%' }}>
                    <Button type="primary" style={{ marginBottom: '20px' }}>新增评估任务</Button>
                    <Table
                        columns={columns}
                        dataSource={taskList}
                        rowKey="id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total) => `共 ${total} 条`,
                        }}
                        scroll={{ x: 1200 }}
                        size="middle"
                    />
                </div>
            ) : (
                <div>
                    <div style={{
                        textAlign: 'center',
                        maxWidth: '600px',
                        width: '100%'
                    }}>
                        <div style={{ marginBottom: '40px' }}>
                            <Title level={4}>你还没有创建过深度评估任务</Title>
            <Paragraph type="secondary">
            点击创建，选择评估问题集，大模型自动打分，并生成评估报告
            </Paragraph>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            {/* {currentStep === 0 ? ( */}
                            <Button type="primary" size="large" onClick={handleCreateTask}>
                    创建评估任务
                </Button>
                            {/* ) : (

                    )} */}
                        </div>

                        {/* {currentStep > 0 && (
                    <Button type="link" onClick={handleStart}>
                        重新开始
                    </Button>
                )} */}
                    </div>
                    {/* 步骤条 */}
                    <div style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <Steps
                            current={currentStep}
                            items={steps}
                            size="default"
                            style={{ maxWidth: '800px' }}
                        />
            </div>
                </div>
            )}


            {/* 创建评估任务弹窗 */}
            <CreateEvaluationModal
                visible={modalVisible}
                onCancel={handleModalCancel}
                onOk={handleModalOk}
                onSwitchToQuestions={onSwitchToQuestions}
            />


        </div>
    );
};

export default AutoEvaluation;
