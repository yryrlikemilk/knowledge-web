import { ReactComponent as CancelIcon } from '@/assets/svg/cancel.svg';
import { ReactComponent as DeleteIcon } from '@/assets/svg/delete.svg';
import { ReactComponent as DisableIcon } from '@/assets/svg/disable.svg';
import { ReactComponent as EnableIcon } from '@/assets/svg/enable.svg';
import { ReactComponent as RunIcon } from '@/assets/svg/run.svg';
import { useShowDeleteConfirm, useTranslate } from '@/hooks/common-hooks';
import {
  useRemoveNextDocument,
  useRunNextDocument,
  useSetNextDocumentStatus,
} from '@/hooks/document-hooks';
import { IDocumentInfo } from '@/interfaces/database/document';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, DatePicker, Flex, Form, Input, Select, Space } from 'antd';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { RunningStatus } from './constant';

import styles from './index.less';

interface IProps {
  selectedRowKeys: string[];
  showWebCrawlModal(): void;
  showDocumentUploadModal(): void;
  documents: IDocumentInfo[];
  onSearch: (filters: {
    name: string;
    chunkMethod: string;
    status: string;
    run: string;
    key: string;
    value: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  onReset: () => void;
  parserList: { label: string; value: string }[];
  onFilteredDocumentsChange: (documents: IDocumentInfo[]) => void;
}

const DocumentToolbar = ({
  selectedRowKeys,
  documents,
  onSearch,
  onReset,
  parserList,
  onFilteredDocumentsChange,
}: IProps) => {
  const { t } = useTranslate('knowledgeDetails');
  const { removeDocument } = useRemoveNextDocument();
  const showDeleteConfirm = useShowDeleteConfirm();
  const { runDocumentByIds } = useRunNextDocument();
  const { setDocumentStatus } = useSetNextDocumentStatus();
  const [form] = Form.useForm();

  const handleSearch = () => {
    const values = form.getFieldsValue();
    const { dateRange, key, value, ...rest } = values;
    const [startDate, endDate] = dateRange || [];
    
    // 验证元数据名和值必须同时输入
    if ((key && !value) || (!key && value)) {
      toast.error('元数据名和元数据值需要同时输入才能搜索');
      return;
    }
    
    onSearch({
      ...rest,
      key: key || '',
      value: value || '',
      startDate,
      endDate,
    });
  };

  const handleReset = () => {
    form.resetFields();
    onReset();
  };

  // 监听documents变化
  useEffect(() => {
    onFilteredDocumentsChange(documents);
  }, [documents, onFilteredDocumentsChange]);

  const handleDelete = useCallback(() => {
    const deletedKeys = selectedRowKeys.filter(
      (x) =>
        !documents
          .filter((y) => y.run === RunningStatus.RUNNING)
          .some((y) => y.id === x),
    );
    if (deletedKeys.length === 0) {
      toast.error(t('theDocumentBeingParsedCannotBeDeleted'));
      return;
    }
    showDeleteConfirm({
      onOk: () => {
        removeDocument(deletedKeys);
      },
    });
  }, [selectedRowKeys, showDeleteConfirm, documents, t, removeDocument]);

  const runDocument = useCallback(
    (run: number) => {
      runDocumentByIds({
        documentIds: selectedRowKeys,
        run,
        shouldDelete: false,
      });
    },
    [runDocumentByIds, selectedRowKeys],
  );

  const handleRunClick = useCallback(() => {
    runDocument(1);
  }, [runDocument]);

  const handleCancelClick = useCallback(() => {
    runDocument(2);
  }, [runDocument]);

  const onChangeStatus = useCallback(
    (enabled: boolean) => {
      selectedRowKeys.forEach((id) => {
        setDocumentStatus({ status: enabled, documentId: id });
      });
    },
    [selectedRowKeys, setDocumentStatus],
  );

  const handleEnableClick = useCallback(() => {
    onChangeStatus(true);
  }, [onChangeStatus]);

  const handleDisableClick = useCallback(() => {
    onChangeStatus(false);
  }, [onChangeStatus]);

  // const disabled = selectedRowKeys.length === 0;

  // const items = useMemo(() => {
  //   return [
  //     {
  //       key: '0',
  //       onClick: handleEnableClick,
  //       label: (
  //         <Flex gap={10}>
  //           <EnableIcon></EnableIcon>
  //           <b>{t('enabled')}</b>
  //         </Flex>
  //       ),
  //     },
  //     {
  //       key: '1',
  //       onClick: handleDisableClick,
  //       label: (
  //         <Flex gap={10}>
  //           <DisableIcon></DisableIcon>
  //           <b>{t('disabled')}</b>
  //         </Flex>
  //       ),
  //     },
  //     { type: 'divider' },
  //     {
  //       key: '2',
  //       onClick: handleRunClick,
  //       label: (
  //         <Flex gap={10}>
  //           <RunIcon></RunIcon>
  //           <b>{t('run')}</b>
  //         </Flex>
  //       ),
  //     },
  //     {
  //       key: '3',
  //       onClick: handleCancelClick,
  //       label: (
  //         <Flex gap={10}>
  //           <CancelIcon />
  //           <b>{t('cancel')}</b>
  //         </Flex>
  //       ),
  //     },
  //     { type: 'divider' },
  //     {
  //       key: '4',
  //       onClick: handleDelete,
  //       label: (
  //         <Flex gap={10}>
  //           <span className={styles.deleteIconWrapper}>
  //             <DeleteIcon width={18} />
  //           </span>
  //           <b>{t('delete', { keyPrefix: 'common' })}</b>
  //         </Flex>
  //       ),
  //     },
  //   ];
  // }, [
  //   handleDelete,
  //   handleRunClick,
  //   handleCancelClick,
  //   t,
  //   handleDisableClick,
  //   handleEnableClick,
  // ]);

  return (
    <div className={styles.filter} style={{ height: 'fit-content' }}>
      <Flex justify="space-between" align="center" style={{ width: '100%' }}>
        <Form
          form={form}
          layout="inline"
          className="flex-wrap"
          labelCol={{ style: { width: 80, textAlign: 'right' } }}
          wrapperCol={{ style: { height:50 }  }}
        >
          <Space size="middle" align="center" wrap style={{ columnGap: '0' }}>
            <Form.Item name="name" label={t('fileName')}>
              <Input
                placeholder={t('pleaseInputFileName')}
                style={{ width: 200 }}
                allowClear
              />
            </Form.Item>
            <Form.Item name="chunkMethod" label={t('chunkMethod')}>
              <Select
                placeholder={"请选择切片方法"}
                style={{ width: 200 }}
                allowClear
                options={parserList}
              />
            </Form.Item>
            <Form.Item name="status" label='启用状态'>
              <Select
                placeholder={"请选择启用状态"}
                style={{ width: 200 }}
                allowClear
                options={[
                  { label: t('enabled'), value: '1' },
                  { label: t('disabled'), value: '0' }
                ]}
              />
            </Form.Item>
            <Form.Item name="run" label={t('parsingStatus')}>
              <Select
                mode="multiple"
                placeholder="请选择解析状态"
                style={{ width: 200 }}
                allowClear
                options={Object.entries(RunningStatus).map(([, value]) => ({
                  label: t(`runningStatus${value}`),
                  value: value
                }))}
              />
            </Form.Item>
            <Form.Item 
              name="key" 
              label="元数据名"
              dependencies={['value']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, val) {
                    const value = getFieldValue('value');
                    if ((val && !value) || (!val && value)) {
                      return Promise.reject(new Error('元数据名和元数据值需同时输入'));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input
                placeholder="请输入元数据字段名"
                style={{ width: 200 }}
                allowClear
              />
            </Form.Item>
            <Form.Item 
              name="value" 
              label="元数据值"
              dependencies={['key']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, val) {
                    const key = getFieldValue('key');
                    if ((key && !val) || (!key && val)) {
                      return Promise.reject(new Error('元数据名和元数据值需同时输入'));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input
                placeholder="请输入元数据值"
                style={{ width: 200 }}
                allowClear
              />
            </Form.Item>
            <Form.Item name="dateRange" label="创建时间">
              <DatePicker.RangePicker
                style={{ width: 200 }}
                format="YYYY-MM-DD"
                allowClear
              />
            </Form.Item>
            <div style={{ width: 160,  height:50}}>
                <Button style={{ padding: '0 10px' }} type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
                  {t('search')}
                </Button>
                <Button style={{ padding: '0 10px',marginLeft:10 }} onClick={handleReset} icon={<ReloadOutlined />}>
                  {t('reset')}
                </Button>
            </div>
          </Space>


        </Form>

      </Flex>
      {/* 批量 */}
      {/* <Dropdown
        menu={{ items }}
        placement="bottom"
        arrow={false}
        disabled={disabled}
      >
        <Button>
          <Space>
            <b> {t('bulk')}</b>
            <DownOutlined />
          </Space>
        </Button>
      </Dropdown> */}
    </div>
  );
};

export default DocumentToolbar;
