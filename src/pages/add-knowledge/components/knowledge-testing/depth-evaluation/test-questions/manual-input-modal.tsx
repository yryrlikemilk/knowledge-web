import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAddQuestions } from '@/hooks/knowledge-hooks';

interface ManualInputModalProps {
    visible: boolean;
    onCancel: () => void;
    onOk: (data: {
        questions: string[];
        category: string;
    }) => void;
}

const ManualInputModal: React.FC<ManualInputModalProps> = ({ visible, onCancel, onOk }) => {
    const [form] = Form.useForm();
    const [questionInput, setQuestionInput] = useState('');
    const [questionList, setQuestionList] = useState<string[]>([]);
    const [questionInputError, setQuestionInputError] = useState<string | null>(null);
    const { addQuestions, loading } = useAddQuestions();

    const handleAddQuestion = () => {
        const value = questionInput.trim();
        if (!value) {
            setQuestionInputError('请输入问题内容');
            return;
        }
        setQuestionInputError(null);
        const newQuestionList = [value, ...questionList];
        setQuestionList(newQuestionList);
        // 同步到 form 的 question 字段
        form.setFieldsValue({ question: newQuestionList });
        setQuestionInput('');
    };

    const handleDeleteQuestion = (idx: number) => {
        const newQuestionList = questionList.filter((_, i) => i !== idx);
        setQuestionList(newQuestionList);
        // 同步到 form 的 question 字段
        form.setFieldsValue({ question: newQuestionList });
    };

    const handleOk = async () => {
        try {
            // 如果输入框有内容，先尝试加进去
            if (questionInput.trim()) {
                if (!questionInput.trim()) {
                    setQuestionInputError('请输入问题内容');
                    return;
                } else {
                    setQuestionInputError(null);
                    const newQuestionList = [questionInput.trim(), ...questionList]; 
                    setQuestionList(newQuestionList);
                    form.setFieldsValue({ question: newQuestionList });
                    setQuestionInput('');
                }
            }

            await form.validateFields();
            const formQuestions = form.getFieldValue('question') || [];
            if (formQuestions.length === 0) {
                message.warning('请至少输入一个问题');
                return;
            }

            // 调用接口创建问题
            await addQuestions(formQuestions);
            
            // 调用父组件的回调
            onOk({
                questions: formQuestions,
                category: '未分类'
            });

            // 重置表单
            form.resetFields();
            setQuestionList([]);
            setQuestionInput('');
            setQuestionInputError(null);
        } catch (error) {
            console.error('创建问题失败:', error);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setQuestionList([]);
        setQuestionInput('');
        setQuestionInputError(null);
        onCancel();
    };

    return (
        <Modal
            title={
                <div style={{textAlign:'center'}}>
                    <span>手动输入测试问题</span>
                </div>
            }
            open={visible}
            onCancel={handleCancel}
            onOk={handleOk}
            width={600}
         
            okText="确认"
            cancelText="取消"
            confirmLoading={loading}
        >


            <Form
                name="manualInput"
                layout="horizontal"
                form={form}
                labelCol={{ flex: '120px' }}
                labelWrap
                wrapperCol={{ flex: 1 }}
                labelAlign="right"
                // style={{height:260}}
            >
                <div style={{marginTop:40,height:500,overflow:'auto'}}>
                    {/* 隐藏的 Form.Item 用于存储 question 数组 */}
                    <Form.Item name="question" hidden>
                        <Input />
                    </Form.Item>

                    <Form.Item 
                        label="测试问题" 
                        required 
                        validateStatus={questionInputError ? 'error' : ''} 
                        help={questionInputError}
                        // rules={[{ required: true, message: '请输入问题内容' },
                        //     {max:200,message:'问题内容不能超过200个字符'}
                        // ]}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Input
                                value={questionInput}
                                onChange={e => {
                                    setQuestionInput(e.target.value);
                                    if (questionInputError) setQuestionInputError(null);
                                }}
                                placeholder="请输入问题内容"
                                allowClear
                                style={{ flex: 1 }}
                                onPressEnter={handleAddQuestion}
                            />
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddQuestion} />
                        </div>
                        {questionList.length > 0 && (
                            <div>
                                {questionList.map((q, idx) => (
                                    <div key={idx} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        margin: '4px 0', 
                                        background: '#f6f8fa', 
                                        borderRadius: 4, 
                                        padding: '4px 8px' 
                                    }}>
                                        <span style={{ flex: 1 }}>{q}</span>
                                        <DeleteOutlined 
                                            style={{ color: '#ff4d4f', cursor: 'pointer' }} 
                                            onClick={() => handleDeleteQuestion(idx)} 
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </Form.Item>
                </div>
            </Form>
        </Modal>
    );
};

export default ManualInputModal;
