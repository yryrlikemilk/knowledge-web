import React from 'react';
import { Modal, Tooltip, Form, InputNumber, Button } from 'antd';
import Rerank from '@/components/rerank';
interface ViewRetrievalParamsModalProps {
    visible: boolean;
    onClose: () => void;
    params?: {
        similarity_threshold?: number; // 1-100
        vector_similarity_weight?: number; // 1-100
        rerank_id?: string | number;
        top_k?: number;
    } | null;
}

const ViewRetrievalParamsModal: React.FC<ViewRetrievalParamsModalProps> = ({ visible, onClose, params }) => {
    const [form] = Form.useForm();
    const similarityThreshold = Number(params?.similarity_threshold ?? 0);
    const vectorWeight = Number(params?.vector_similarity_weight ?? 0);
    const hasRerank = !!params?.rerank_id;

    React.useEffect(() => {
        if (visible) {
            form.setFieldsValue({
                rerank_id: params?.rerank_id,
                top_k: params?.top_k,
            });
        }
    }, [visible, params, form]);

    return (
        <Modal
            title={<div style={{ textAlign: 'center' }}><span>检索参数</span></div>}
            open={visible}
            onCancel={onClose}
            width={600}
            footer={null}
        >
            <div>
                {/* <div style={{ paddingLeft: 20 }}>1、检索设置</div> */}
                <div className='flex justify-center w-full'>
                    <Form layout="vertical" style={{ width: 500, margin: 20 }} form={form} disabled>
                        <Form.Item label="相似度阈值">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <InputNumber
                                    min={1}
                                    max={100}
                                    step={1}
                                    precision={0}
                                    style={{ width: '100%' }}
                                    value={similarityThreshold}
                                    disabled
                                />
                                <span style={{ width: 32 }}>分</span>
                            </div>
                        </Form.Item>

                        <Form.Item label="关键字相似度权重">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <InputNumber
                                    min={1}
                                    max={100}
                                    step={1}
                                    precision={0}
                                    style={{ width: '100%' }}
                                    value={vectorWeight}
                                    disabled
                                />
                                <span style={{ width: 32 }}>%</span>
                            </div>
                        </Form.Item>
                        {hasRerank ? (
                            <div style={{ width: 'calc(100% - 32px)' }}>
                                <Rerank />
                            </div>
                        ) : (
                            <div></div>
                        )}
                    </Form>
                </div>

                {/* <div style={{ paddingLeft: 20 }}>2、设定评估指标</div>
                <div className='flex justify-center w-full'>
                    <div style={{ width: 500, margin: 20 }}>
                        <Tooltip
                            placement="top"
                            mouseEnterDelay={0.2}
                            title={
                                <div style={{ textAlign: 'left', lineHeight: 1.6 }}>
                                    <div>1、问题可回答率：表示测试的问题中，有多少能找到知识库的内容。</div>
                                    <div>2、问题回答准确率：表示找到的内容中，有多少是正确或相关的。</div>
                                </div>
                            }
                        >
                            <Button key="system" type="primary">
                                系统默认指标
                            </Button>
                        </Tooltip>
                    </div>
                </div> */}
            </div>
        </Modal>
    );
};

export default ViewRetrievalParamsModal;


