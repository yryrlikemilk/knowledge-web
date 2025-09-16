import React, { useEffect } from 'react';
import { Modal, Form, message, InputNumber, Button } from 'antd';
import { useGenerateAiQuestion, useFetchFileUpdates, useFetchAiQuestionCount } from '@/hooks/knowledge-hooks';

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

    useEffect(() => {
        if (visible) {
            refetch();
            refetchCount();
        }
    }, [visible, refetch, refetchCount]);

    const handleOk = async () => {
        const values = await form.validateFields();

        // 调用AI生成接口
        await generateAiQuestion(values.questionCount);

        message.success('问题生成成功');

        // 重置表单
        form.resetFields();

        // 调用父组件的回调
        onOk();

    };

    const handleCancel = () => {
        form.resetFields();
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
            onOk={handleOk}
            width={600}
            okText={loading ? "生成中..." : "生成问题"}
            cancelText="取消"
            confirmLoading={loading}
        >

            <div style={{ marginBottom: 12, textAlign: 'center' }}>
                <span>文件更新状态：
                    <span style={{
                        color: updatesLoading ? '#999' : (fileUpdates.hasUpdates ? '#52c41a' : '#999'),
                        marginLeft: 6
                    }}>
                        {updatesLoading ? '检查中…' : (fileUpdates.hasUpdates ? '更新' : '未更新')}
                    </span>
                </span>
            </div>


            <Form form={form} layout="horizontal" style={{ height: 260 }}>
                {updatesLoading || countLoading ? (
                    <div style={{ marginTop: 40, textAlign: 'center' }}>
                        <div>加载中...</div>
                    </div>
                ) : fileUpdates.hasUpdates ? (
                    <div style={{ marginTop: 40 }}>
                        <Form.Item
                            name="questionCount"
                            label="问题数量"
                            rules={[{ required: true, message: '请输入生成数量' }]}
                            initialValue={questionCount.recommendCount || 50}
                        >
                            <InputNumber
                                min={1}
                                max={questionCount.limitCount || 200}
                                style={{ width: '100%' }}
                                placeholder="请输入要生成的问题数量"
                            />
                        </Form.Item>
                    </div>
                ) : (
                    <div>
                        <div>您当前知识库文件内容没有任何变更，暂时不需要重新生成</div>
                    </div>
                )}




            </Form>


        </Modal>
    );
};

export default AIGenerateModal;
