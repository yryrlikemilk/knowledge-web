import { Modal, Button } from 'antd';
import { ReactNode } from 'react';

interface IOptimizationSuggestionModalProps {
  visible: boolean;
  onClose: () => void;
  children?: ReactNode;
  title?: string;
}

const OptimizationSuggestionModal = ({
  visible,
  onClose,
  children,
  title = '具体优化方向',
}: IOptimizationSuggestionModalProps) => {
  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
     
      footer={[
        <Button key="close" type="primary" onClick={onClose} style={{ width: 100 }}>
          关闭
        </Button>,
      ]}
      width={800}
      centered
      styles={{
        body: { maxHeight: '60vh', overflow: 'auto', padding: '24px' },
        footer: { display: 'flex', justifyContent: 'center', padding: '16px 24px' },
        header: {
          textAlign: 'center'
        }
      }}
    >
      {children}
    </Modal>
  );
};

export default OptimizationSuggestionModal;

