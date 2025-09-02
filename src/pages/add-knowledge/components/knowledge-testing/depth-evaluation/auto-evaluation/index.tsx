import React, { useState } from 'react';
import { Typography, Button, Steps, Space } from 'antd';
import { FileText, Settings, BarChart3 } from 'lucide-react';

const { Title, Paragraph } = Typography;

const AutoEvaluation = () => {
    const [currentStep, setCurrentStep] = useState(0);

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

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleStart = () => {
        setCurrentStep(0);
    };

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
                    {currentStep === 0 ? (
                        <Button type="primary" size="large" onClick={handleStart}>
                            创建评估任务
                        </Button>
                    ) : (
                        <Space>
                            <Button onClick={handlePrev} disabled={currentStep === 0}>
                                上一步
                            </Button>
                            <Button type="primary" onClick={handleNext} disabled={currentStep === steps.length - 1}>
                                下一步
                            </Button>
                        </Space>
                    )}
                </div>

                {currentStep > 0 && (
                    <Button type="link" onClick={handleStart}>
                        重新开始
                    </Button>
                )}
            </div>

            {/* 步骤条 */}
            <div style={{ 
                position: "absolute", 
                bottom: 20, 
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
    );
};

export default AutoEvaluation;
