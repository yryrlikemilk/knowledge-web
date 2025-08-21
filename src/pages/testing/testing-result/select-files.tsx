import NewDocumentLink from '@/components/new-document-link';
import { useTranslate } from '@/hooks/common-hooks';
import { ITestingDocument } from '@/interfaces/database/knowledge';
import { Button, Table, TableProps, Tooltip } from 'antd';
import { ReactComponent as Eyes } from '@/assets/svg/eyes.svg';
import { useEffect } from 'react';

interface IProps {
  handleTesting: (ids: string[]) => void;
  setSelectedDocumentIds: (ids: string[]) => void;
  documents?: ITestingDocument[];
  selectedDocumentIds?: string[];
}

const SelectFiles = ({ setSelectedDocumentIds, handleTesting, documents , selectedDocumentIds = []}: IProps) => {
  const { t } = useTranslate('fileManager');

  // 当 selectedDocumentIds 重置为空数组时，确保 UI 也重置
  useEffect(() => {
    if (selectedDocumentIds.length === 0) {
      // 可以在这里添加额外的重置逻辑如果需要的话
    }
  }, [selectedDocumentIds]);

  const columns: TableProps<ITestingDocument>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'doc_name',
      key: 'doc_name',
      render: (text) => <p>{text}</p>,
    },

    {
      title: 'Hits',
      dataIndex: 'count',
      key: 'count',
      width: 80,
    },
    {
      title: 'View',
      key: 'view',
      width: 50,
      render: (_, { doc_id, doc_name }) => (
        <NewDocumentLink
          documentName={doc_name}
          documentId={doc_id}
          prefix="document"
        >
          <Tooltip title={t('preview')}>
            <Button type="text">
              <Eyes  />
            </Button>
          </Tooltip>
        </NewDocumentLink>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedDocumentIds,
    preserveSelectedRowKeys: false, 
    onChange: (selectedRowKeys: React.Key[]) => {
      const ids = selectedRowKeys as string[];
      setSelectedDocumentIds(ids);
        handleTesting(ids);
    },
    getCheckboxProps: (record: ITestingDocument) => ({
      disabled: record.doc_name === 'Disabled User',
      name: record.doc_name,
    }),
  };

  return (
    <Table
      columns={columns}
      dataSource={documents}
      showHeader={false}
      rowSelection={rowSelection}
      rowKey={'doc_id'}
    />
  );
};

export default SelectFiles;
