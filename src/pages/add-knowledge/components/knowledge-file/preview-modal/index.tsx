import { useFetchNextChunkList } from '@/hooks/chunk-hooks';
import { Modal, Spin } from 'antd';
import DocumentPreview from '../../knowledge-chunk/components/document-preview/preview';
import { useGetChunkHighlights } from '../../knowledge-chunk/hooks';
import styles from './index.less';

export interface IProps {
    visible: boolean;
    hideModal: () => void;
    docId: string;
}

const PreviewModal = ({ visible, hideModal, docId }: IProps) => {
    console.log('Setting doc_id:111', docId);
    // useEffect(() => {
    //     console.log('Setting doc_id:', docId);
    //     if (visible && docId) {
    //         console.log('Setting doc_id:', docId);
    //     }
    // }, [visible, docId, ]);

    const {
        data: { documentInfo, data = [] },
        loading,
    } = useFetchNextChunkList({
        enabled: visible && !!docId, // 只在弹窗打开且有 docId 时调用接口
        docId // 传递 docId，确保接口参数正确
    });

    console.log('documentInfo:', documentInfo);
    console.log('docId:', docId);
    const isPdf = documentInfo?.type === 'pdf';
    console.log('isPdf:', isPdf);

    const { highlights, setWidthAndHeight } = useGetChunkHighlights(docId);

    return (
        <Modal
            title={
                <div style={{ width: '100%', borderBottom: "1px solid #E5E6EB", paddingBottom: '12px', paddingLeft: '20px' }}>
                    <i style={{ height: '100%', borderLeft: "4px solid #0C7CFF", borderRadius: '4px' }}></i>
                    <span className='pl-2 text-[16px] font-bold'> 预览</span>
                </div>
            }
            open={visible}
            onCancel={hideModal}
            width={800}
            footer={null}
            className={styles.previewModal}
        >
            <div className={styles.chunkPage}>
                <Spin spinning={loading}>
                    {isPdf ? (
                        <DocumentPreview
                            highlights={highlights}
                            setWidthAndHeight={setWidthAndHeight}
                            docId={docId}
                        />
                    ) :data.length>0? (
                        <div className={styles.textContent}>
                            {data.map((item) => (
                                <div key={item.chunk_id} className={styles.textItem}>
                                    <div className={styles.textTitle}> {item.content_with_weight}</div>
                                </div>
                            ))}
                        </div>
                    ):(
                        <div className={styles.textContent} style={{textAlign:'center',fontSize:'20px'}}>
                           没有分块
                        </div>
                    )}
                </Spin>
            </div>
        </Modal>
    );
};

export default PreviewModal;
