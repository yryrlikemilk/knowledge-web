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
    const [current, setCurrent] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const { pageList } = useFetchPageList(current, pageSize);
    const [taskList, setTaskList] = useState<EvaluationTask[]>([
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
        console.log('任务名称:', data.taskName);
        console.log('选择的问题列表:', data.selectedQuestions);
        console.log('检索设置表单数据:', data.formData);
        console.log('=== 数据输出完成 ===', data);


    };

    const handleViewReport = (record: EvaluationTask) => {
        const params = new URLSearchParams(location.search);
        const knowledgeId = params.get('id') || '';
        navigate(`/knowledge/testing/deep-search/report/${record.id}${knowledgeId ? `?id=${knowledgeId}` : ''}`);
    };

    const getStatusTag = (status: string) => {
        const statusMap = {
            pending: { color: 'default', text: '未开始' },
            running: { color: 'processing', text: '正在评估中' },
            completed: { color: 'success', text: '成功' },
            failed: { color: 'error', text: '失败' }
        };
        const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
        return <Tag color={config.color}>{config.text}</Tag>;
    };

    const columns: ColumnsType<EvaluationTask> = [
        {
            title: '任务名',
            dataIndex: 'name',
            key: 'name',
            width: 200,
        },
        {
            title: '问题数量',
            dataIndex: 'question_count',
            key: 'question_count',
            width: 100,
            align: 'center',
        },
        {
            title: '问题来源',
            dataIndex: 'question_source',
            key: 'question_source',
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
            dataIndex: 'update_time',
            key: 'update_time',
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
        <>

            {/* 评估任务列表 - 根据pageList数据长度显示 */}
            {pageList.records.length > 0 ? (
                <div style={{ marginTop: '40px', width: '100%' }}>
                    <Button type="primary" style={{ marginBottom: '20px' }} onClick={handleCreateTask}>新增评估任务</Button>
                    <Table
                        columns={columns}
                        dataSource={pageList.records}
                        rowKey="id"
                        pagination={{
                            current,
                            pageSize,
                            total: pageList.total,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total) => `共 ${total} 条`,
                            onChange: (page, size) => {
                                setCurrent(page);
                                setPageSize(size || 10);
                            },
                        }}
                        scroll={{ x: 1200 }}
                        size="middle"
                    />
                </div>
            ) : (
                <div style={{
                    padding: '0',
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
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


        </>
    );
};

export default AutoEvaluation;
