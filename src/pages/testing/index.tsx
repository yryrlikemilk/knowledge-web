import { useTestChunkAllRetrieval } from '@/hooks/knowledge-hooks';
import { App, Form, Modal } from 'antd';
import TestingControl from './testing-control';
import TestingResult from './testing-result';

import { useState } from 'react';
import styles from './index.less';

const KnowledgeTesting = () => {
  const [form] = Form.useForm();
  const { testChunkAll } = useTestChunkAllRetrieval();
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { message } = App.useApp();

  const handleTesting = async (documentIds: string[] = []) => {
    try {
      const values = form.getFieldsValue();

      // 将元数据转换为JSON格式
      const metaData: { [key: string]: string } = {};
      values.metaList?.forEach((item: { key: string; value: string }) => {
        if (item.key && item.value) {
          metaData[item.key] = item.value;
        }
      });
      if (values.similarity_threshold !== undefined) {
        values.similarity_threshold = values.similarity_threshold / 100;
      }
      if (values.vector_similarity_weight !== undefined) {
        values.vector_similarity_weight = values.vector_similarity_weight / 100;
      }

      // 将metaData转换为JSON字符串
      const metaJsonString = JSON.stringify(metaData);

      // 更新form中的meta字段
      form.setFieldsValue({ meta: metaJsonString });

      // 获取 test_kb_ids 的第一个值作为 kb_id
      const kb_id = values.test_kb_ids;

      // 输出所有表单数据
      console.log('Form Data:', {
        ...values,
        meta: metaJsonString,
        kb_id
      });
      const document_ids = Array.isArray(documentIds) ? documentIds : [];
      await testChunkAll({
        ...values,
        meta: metaJsonString,
        doc_ids: document_ids,
        vector_similarity_weight: values.vector_similarity_weight,
        kb_id,
        test_kb_ids: kb_id,
      });
      setIsModalOpen(true);
      
    } catch (error) {
      console.error('Testing failed:', error);
      message.error('测试失败，请重试');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDocumentIds([]);
  };

  return (
    <div className={styles.testingWrapper}>
      <div className={styles.testingControlSection}>
        <TestingControl
          form={form}
          handleTesting={handleTesting}
          selectedDocumentIds={selectedDocumentIds}
        />
      </div>
      <Modal
        title="测试详情"
        open={isModalOpen}
        onCancel={handleModalClose}
        width="80%"
        footer={null}
        destroyOnHidden
        styles={{
          header: {
            textAlign: 'center'
          }
        }}
      >
        <TestingResult
          handleTesting={handleTesting}
          selectedDocumentIds={selectedDocumentIds}
          setSelectedDocumentIds={setSelectedDocumentIds}
        />
      </Modal>
    </div>
  );
};

export default KnowledgeTesting;
