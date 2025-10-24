import React, { useState } from 'react';
import { Typography, Button, Table, Tag, Input, Select, Space, Form, Spin } from 'antd';
import { Eye, Search, RotateCcw } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import CreateEvaluationModal from './create-evaluation-modal';
import ViewRetrievalParamsModal from './view-retrieval-params-modal';
import { useNavigate, useLocation } from 'umi';
import { useFetchPageList } from '@/hooks/knowledge-hooks';
import depthEvaluationNoData from '@/assets/imgs/depth-evaluation-noData.png';
const { Paragraph } = Typography;
import set1 from '@/assets/imgs/set1.png';
import set2 from '@/assets/imgs/set2.png';
import set3 from '@/assets/imgs/set3.png';
import set11 from '@/assets/imgs/111.png';
import set22 from '@/assets/imgs/222.png';
import set33 from '@/assets/imgs/333.png';
interface EvaluationTask {
    id: string;
    task_name: string;
    questionCount: number;
    questionSource: string;
    // 状态由接口返回 0/1/2/3
    status: 0 | 1 | 2 | 3;
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
    const [form] = Form.useForm();
    const [modalVisible, setModalVisible] = useState(false);
    const [viewParamsVisible, setViewParamsVisible] = useState(false);
    const [viewParamsData, setViewParamsData] = useState<any>(null);
    const [current, setCurrent] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // 筛选条件状态
    const [filters, setFilters] = useState({
        name: '',
        auto_generate: '',
        status: ''
    });

    const { pageList, loading } = useFetchPageList(current, pageSize, filters);


    // 移除未使用的函数

    const handleCreateTask = () => {
        setModalVisible(true);
    };

    const handleModalCancel = () => {
        setModalVisible(false);
        // 弹窗关闭时会自动清空数据（在弹窗组件中处理）
    };

    const handleModalOk = (data: {
        task_name: string;
        selectedQuestions: any[];
        formData: any;
    }) => {
        setModalVisible(false);

        // 输出所有收集的数据到控制台
        console.log('任务名称:', data.task_name);
        console.log('选择的问题列表:', data.selectedQuestions);
        console.log('检索设置表单数据:', data.formData);
        console.log('=== 数据输出完成 ===', data);
    };

    // 搜索处理
    const handleSearch = () => {
        const values = form.getFieldsValue();
        setFilters({
            name: values.name || '',
            auto_generate: values.auto_generate || '',
            status: values.status || ''
        });
        setCurrent(1); // 重置到第一页
    };

    // 重置处理
    const handleReset = () => {
        form.resetFields();
        setFilters({
            name: '',
            auto_generate: '',
            status: ''
        });
        setCurrent(1); // 重置到第一页
    };

    const handleViewReport = (record: EvaluationTask) => {
        const params = new URLSearchParams(location.search);
        const knowledgeId = params.get('id') || '';
        // 同时传递 reportId 和 知识库 id（id），使用查询参数避免路由冲突
        navigate(`/knowledge/testing/deep-search/report?reportId=${record.id}${knowledgeId ? `&id=${knowledgeId}` : ''}`);
    };

    const getStatusTag = (status: number, progress: any) => {
        const statusMap: Record<number, { color: string; text: string }> = {
            0: { color: 'default', text: '未开始' },
            1: { color: 'processing', text: `评估中${progress * 100}%` },
            2: { color: 'success', text: '成功' },
            3: { color: 'error', text: '失败' },
        };
        const config = statusMap[status] || statusMap[0];
        return <Tag color={config.color}>{config.text}</Tag>;
    };

    const openViewParams = (record: any) => {
        // 从记录中提取参数；similarity_threshold 需要乘以10用于列表展示，但在弹窗中按原值显示
        const params = {
            similarity_threshold: Number(record.similarity_threshold ?? 0),
            vector_similarity_weight: Number(record.vector_similarity_weight ?? 0),
            rerank_id: record.rerank_id,
            top_k: record.top_k,
        };
        setViewParamsData(params);
        setViewParamsVisible(true);
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
            render: (_: any, record: any) => getStatusTag(record.status, record.progress),
        },
        {
            title: '结果分数',
            dataIndex: 'score',
            key: 'score',
            width: 100,
            align: 'center',
            render: (score?: number) => score ? `${score.toFixed(2)}分` : '-',
        },
        {
            title: '检索参数',
            dataIndex: 'retrievalParams',
            key: 'retrievalParams',
            width: 200,
            render: (_: any, record: any) => (
                <Button type="link" onClick={() => openViewParams(record)}>
                    相似度阈值{typeof record.similarity_threshold === 'number' ? record.similarity_threshold : '0'}
                </Button>
            ),
        },
        {
            title: '评估指标',
            dataIndex: 'evaluationParams',
            key: 'evaluationParams',
            width: 150,
            render: (_: any, record: any) => (
                <Button type="link" onClick={() => openViewParams(record)}>
                    系统默认指标
                </Button>
            ),
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
                    // completed 对应接口状态 2
                    disabled={record.status !== 2}
                >
                    查看报告
                </Button>
            ),
        },
    ];

    return (
        <>

            {/* 评估任务列表 - 根据pageList数据长度显示 */}
            {loading ? (
                <div style={{ height: '100%', padding: '160px 0', display: 'flex', justifyContent: 'center' }}>
                    <Spin tip="加载中..." />
                </div>
            ) : pageList.record.records.length > 0 || pageList.has_task ? (
                <div style={{ marginTop: '36px', width: '100%' }}>
                    <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button type="primary" onClick={handleCreateTask}>新增评估任务</Button>
                    </div>

                    {/* 筛选表单 */}
                    <div style={{
                        marginBottom: '20px',
                        padding: '16px 0',
                    }}>
                        <Form form={form} layout="inline" style={{ width: '100%' }}>
                            <Form.Item label="任务名称" name="name" style={{ marginBottom: '16px' }}>
                                <Input
                                    placeholder="请输入任务名称"
                                    style={{ width: 200 }}
                                    allowClear
                                />
                            </Form.Item>

                            <Form.Item label="问题来源" name="auto_generate" style={{ marginBottom: '16px' }}>
                                <Select
                                    placeholder="请选择问题来源"
                                    style={{ width: 150 }}
                                    allowClear
                                >
                                    <Select.Option value="false">手动输入</Select.Option>
                                    <Select.Option value="true">AI生成</Select.Option>
                                </Select>
                            </Form.Item>

                            <Form.Item label="状态" name="status" style={{ marginBottom: '16px' }}>
                                <Select
                                    placeholder="请选择状态"
                                    style={{ width: 150 }}
                                    allowClear
                                >
                                    <Select.Option value="1">正在评估中</Select.Option>
                                    <Select.Option value="2">成功</Select.Option>
                                    <Select.Option value="3">失败</Select.Option>
                                </Select>
                            </Form.Item>

                            <Form.Item style={{ marginBottom: '16px' }}>
                                <Space>
                                    <Button
                                        type="primary"
                                        icon={<Search size={14} />}
                                        onClick={handleSearch}
                                    >
                                        搜索
                                    </Button>
                                    <Button
                                        icon={<RotateCcw size={14} />}
                                        onClick={handleReset}
                                    >
                                        重置
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={pageList.record.records}
                        rowKey="id"
                        loading={loading}
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
                    // justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <img style={{ margin: "20px 0", height: 180, width: 180 }} src={depthEvaluationNoData} alt="图片" />
                    <div style={{
                        textAlign: 'center',
                        maxWidth: '600px',
                        width: '100%'
                    }}>
                        <div style={{ marginBottom: '20px' }}>
                            <span style={{
                                fontSize: 18,
                                fontWeight: "normal",
                                color: '#1D2129'
                            }}>你还没有创建过深度评估任务</span>
                            <Paragraph type="secondary" style={{ color: ' rgba(29, 33, 41, 0.55)' }}>
                                点击创建，选择评估问题集，大模型自动打分，并生成评估报告
                            </Paragraph>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            {/* {currentStep === 0 ? ( */}
                            <Button type="primary" size="large" style={{
                                background: 'linear-gradient(80deg, #55C9FF 0%, #336AFD 100%)',
                                borderRadius: '60px', border: 'none'
                            }} onClick={handleCreateTask}>
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
                        justifyContent: 'center',
                        padding: '0 110px',
                        alignItems: 'center'

                    }}>
                        <div style={{ zIndex: 3, textAlign: 'center' }}>
                            <img style={{ width: 120 }} src={set1} alt="第一步" />
                        </div>
                        <div style={{
                            flex: 1,
                            borderTop: '2px dashed #9ECBFF',
                            zIndex: 1,
                            pointerEvents: 'none',
                            position: 'relative',
                        }} >

                            <svg
                                viewBox="0 0 24 24"
                                width="16"
                                height="16"
                                style={{
                                    position: 'absolute',
                                    top: '-9px',
                                    left: '50%',
                                    zIndex: 2,
                                    pointerEvents: 'none'
                                }}
                            >
                                <polygon points="6,4 18,12 6,20" fill="#9ECBFF" />
                            </svg>
                        </div>
                        <div style={{ zIndex: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img style={{ width: 120 }} src={set2} alt="第二步" />
                        </div>
                        <div style={{
                            flex: 1,
                            borderTop: '2px dashed #9ECBFF',
                            zIndex: 1,
                            pointerEvents: 'none',
                            position: 'relative',
                        }} >

                            <svg
                                viewBox="0 0 24 24"
                                width="16"
                                height="16"
                                style={{
                                    position: 'absolute',
                                    top: '-9px',
                                    left: '50%',
                                    zIndex: 2,
                                    pointerEvents: 'none'
                                }}
                            >
                                <polygon points="6,4 18,12 6,20" fill="#9ECBFF" />
                            </svg>
                        </div>

                        <div style={{ zIndex: 3, textAlign: 'center' }}>
                            <img style={{ width: 120 }} src={set3} alt="第三步" />
                        </div>
                    </div>
                    <div style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: 10,
                        marginBottom: 10,
                        alignItems: 'center',
                        padding: '0 40px',
                        textAlign: 'center'

                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>

                            <span style={{ width: '140px', textAlign: 'center',marginBottom:12 }}>1.准备测试问题</span>
                            <img src={set11} style={{ width: '265px', height: "170" }} alt="" />
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>

                            <span style={{ width: '180px', textAlign: 'center',marginBottom:12  }}>2.设置检索参数&评估指标</span>
                            <img src={set22} style={{ width: '265px', height: "170" }} alt="" />
                        </div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>

                            <span style={{ width: '140px', textAlign: 'center',marginBottom:12  }}>3.自动生成评估报告</span>
                            <img src={set33} style={{ width: '265px', height: "170" }} alt="" />

                        </div>
                    </div>
                    <div style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0 40px',
                        alignItems: 'center'

                    }}>




                    </div>
                </div >
            )}


            {/* 创建评估任务弹窗 */}
            <CreateEvaluationModal
                visible={modalVisible}
                onCancel={handleModalCancel}
                onOk={handleModalOk}
                onSwitchToQuestions={onSwitchToQuestions}
            />

            {/* 查看检索参数/评估指标弹窗（只读） */}
            <ViewRetrievalParamsModal
                visible={viewParamsVisible}
                onClose={() => setViewParamsVisible(false)}
                params={viewParamsData}
            />

        </>
    );
};

export default AutoEvaluation;
