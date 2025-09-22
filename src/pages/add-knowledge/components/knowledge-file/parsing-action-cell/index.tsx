import { useShowDeleteConfirm, useTranslate } from '@/hooks/common-hooks';
import { useRemoveNextDocumentKb } from '@/hooks/document-hooks';
import { IDocumentInfo } from '@/interfaces/database/document';
import { downloadDocument } from '@/utils/file-util';

import { Button, Dropdown, MenuProps, Space } from 'antd';
import { isParserRunning } from '../utils';
import { useCallback, useState } from 'react';
import { DocumentType } from '../constant';
import styles from './index.less';
import PreviewModal from '../preview-modal/index';

interface IProps {
  record: IDocumentInfo;
  setCurrentRecord: (record: IDocumentInfo) => void;
  showRenameModal: () => void;
  showChangeParserModal: () => void;
  showSetMetaModal: () => void;
  knowledgeId: string;
}

const ParsingActionCell = ({
  record,
  setCurrentRecord,
  showRenameModal,
  showChangeParserModal,
  showSetMetaModal,
  knowledgeId,
}: IProps) => {
  const documentId = record.id;
  const isRunning = isParserRunning(record.run);
  const { t } = useTranslate('knowledgeDetails');
  const { removeDocument } = useRemoveNextDocumentKb();
  const showDeleteConfirm = useShowDeleteConfirm();
  const isVirtualDocument = record.type === DocumentType.Virtual;
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string>('');

  const onRmDocument = () => {
    if (!isRunning) {
      console.log(`knowledgeId`,knowledgeId);
      console.log(`objectrecord`,record)
      showDeleteConfirm({
        title:'你确定删除这个文件吗',
        onOk: () => removeDocument({ documentIds: [documentId], knowledgeId }),
        // content:JSON.parse( record?.parser_config as string)?.graphrag?.use_graphrag
        //   ? t('deleteDocumentConfirmContent')
        //   : '',
        content:`${record.name}被删除后，将无法恢复`
      });
    }
  };

  const onDownloadDocument = () => {
    downloadDocument({
      id: documentId,
      filename: record.name,
    });
  };

  const setRecord = useCallback(() => {
    setCurrentRecord(record);
  }, [record, setCurrentRecord]);

  const onShowRenameModal = () => {
    setRecord();
    showRenameModal();
  };
  const onShowChangeParserModal = () => {
    setRecord();
    showChangeParserModal();
  };

  const onShowSetMetaModal = useCallback(() => {
    setRecord();
    showSetMetaModal();
  }, [setRecord, showSetMetaModal]);

  const onShowPreviewModal = (docId: string) => {
    setPreviewDocId(docId); // 只传 id，不拼接
    setPreviewVisible(true);
  };

  const hidePreviewModal = () => {
    setPreviewVisible(false);
    setPreviewDocId('');
  };

  const chunkItems: MenuProps['items'] = [
    {
      key: '1',
      label: (
        <div className="flex flex-col">
          <Button type="link" onClick={onShowChangeParserModal}>
            {t('chunkMethod')}
          </Button>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: '2',
      label: (
        <div className="flex flex-col">
          <Button type="link" onClick={onShowSetMetaModal}>
            {t('setMetaData')}
          </Button>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: '3',
      label: (
        <div className="flex flex-col">
          <Button
            type="link"
            size='small'
            disabled={isRunning}
            onClick={onShowRenameModal}
            className={styles.iconButton}
          >
            {t('rename', { keyPrefix: 'common' })}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Space size={0}>
        {isVirtualDocument || (
          <Dropdown
            menu={{ items: chunkItems }}
            trigger={['click']}
            disabled={isRunning || record.parser_id === 'tag'}
          >
            <Button type="link" size='small' className={styles.iconButton}>
              设置
            </Button>
          </Dropdown>
        )}
        <Button
          type="link"
          size='small'
          disabled={isRunning}
          onClick={() => onShowPreviewModal(record.id)}
          className={styles.iconButton}
        >
          预览
        </Button>
        <Button
          type="link"
          size='small'
          disabled={isRunning}
          onClick={onRmDocument}
          className={styles.iconButton}
          style={{color: '#F56C6C'}}
        >
          {t('delete', { keyPrefix: 'common' })}
        </Button>
        {isVirtualDocument || (
          <Button
            type="link"
            size='small'
            disabled={isRunning}
            onClick={onDownloadDocument}
            className={styles.iconButton}
          >
            {t('download', { keyPrefix: 'common' })}
          </Button>
        )}
      </Space>
      <PreviewModal
        visible={previewVisible}
        hideModal={hidePreviewModal}
        docId={previewDocId} // 只传 id
      />
    </>
  );
};

export default ParsingActionCell;
