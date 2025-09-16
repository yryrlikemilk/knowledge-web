import React, { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { useUpdateQuestion } from '@/hooks/knowledge-hooks';

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

interface EditQuestionModalProps {
    visible: boolean;
    onCancel: () => void;
    onOk: () => void;
    question: QuestionItem | null;
}

const EditQuestionModal: React.FC<EditQuestionModalProps> = ({ visible, onCancel, onOk, question }) => {
    const [form] = Form.useForm();
    const { updateQuestion, loading } = useUpdateQuestion();

    // 当问题数据变化时，更新表单
    useEffect(() => {
        if (question && visible) {
            form.setFieldsValue({
                question_text: question.question_text
            });
        }
    }, [question, visible, form]);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            
            if (!question) {
                message.error('问题数据不存在');
                return;
            }

            // 调用更新接口
            await updateQuestion({
                id: question.id,
                question_text: values.question_text
            });
            
            // 重置表单
            form.resetFields();
            
            // 调用父组件的回调
            onOk();
        } catch (error) {
            console.error('更新问题失败:', error);
            message.error(error instanceof Error ? error.message : '更新问题失败');
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={
                <div style={{ textAlign: 'center' }}>
                    <span>编辑问题</span>
                </div>
            }
            open={visible}
            onCancel={handleCancel}
            onOk={handleOk}
            width={600}
            okText="确定"
            cancelText="取消"
            confirmLoading={loading}
        >
            <Form
                form={form}
                layout="horizontal"
                style={{ marginTop: 20 }}
            >
                <Form.Item
                    name="question_text"
                    label="问题"
                    rules={[
                        { required: true, message: '请输入问题内容' },
                        { min: 1, message: '问题内容不能为空' }
                    ]}
                >
                    <Input
                        placeholder="请输入问题内容"
                        maxLength={500}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default EditQuestionModal;
