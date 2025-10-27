import { useTranslate } from '@/hooks/common-hooks';
import {
  FileTextOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Breadcrumb,
  BreadcrumbProps,
  Button,
  Dropdown,
  Flex,
  Input,
  MenuProps,
  Space,
  DatePicker,
  Divider,
  Form,
} from 'antd';
import { RangePickerProps } from 'antd/es/date-picker';
import { useCallback, useMemo, useState } from 'react';
import {
  useHandleBreadcrumbClick,
  useHandleDeleteFile,
  useSelectBreadcrumbItems,
} from './hooks';
import { FolderInput, Trash2 } from 'lucide-react';
import styles from './index.less';
import dayjs from 'dayjs';

interface IProps {
  selectedRowKeys: string[];
  showFolderCreateModal: () => void;
  showFileUploadModal: () => void;
  setSelectedRowKeys: (keys: string[]) => void;
  showMoveFileModal: (ids: string[]) => void;
  onSearch: (filters: { name: string; knowledgeName: string; dateRange: [string, string] | null }) => void;
  onReset: () => void;
}

const FileToolbar = ({
  selectedRowKeys,
  showFolderCreateModal,
  showFileUploadModal,
  setSelectedRowKeys,
  showMoveFileModal,
  onSearch,
  onReset,
}: IProps) => {
  const { t } = useTranslate('knowledgeDetails');
  const breadcrumbItems = useSelectBreadcrumbItems();
  const { handleBreadcrumbClick } = useHandleBreadcrumbClick();
  // const parentFolderList = useFetchParentFolderList();
  // const isKnowledgeBase =
  //   parentFolderList.at(-1)?.source_type === 'knowledgebase';

  const itemRender: BreadcrumbProps['itemRender'] = (
    currentRoute,
    params,
    items,
  ) => {
    const isLast = currentRoute?.path === items[items.length - 1]?.path;

    return isLast ? (
      <span>{currentRoute.title}</span>
    ) : (
      <span
        className={styles.breadcrumbItemButton}
        onClick={() => handleBreadcrumbClick(currentRoute.path)}
      >
        {currentRoute.title}
      </span>
    );
  };

  const actionItems: MenuProps['items'] = useMemo(() => {
    return [
      {
        key: '1',
        onClick: showFileUploadModal,
        label: (
          <div>
            <Button type="link">
              <Space>
                <FileTextOutlined />
                {t('uploadFile', { keyPrefix: 'fileManager' })}
              </Space>
            </Button>
          </div>
        ),
      },
      { type: 'divider' },
      {
        key: '2',
        onClick: showFolderCreateModal,
        label: (
          <div>
            <Button type="link">
              <Space>
                <FolderOpenOutlined />
                {t('newFolder', { keyPrefix: 'fileManager' })}
              </Space>
            </Button>
          </div>
        ),
      },
    ];
  }, [t, showFolderCreateModal, showFileUploadModal]);

  const { handleRemoveFile } = useHandleDeleteFile(
    selectedRowKeys,
    setSelectedRowKeys,
  );

  const handleShowMoveFileModal = useCallback(() => {
    showMoveFileModal(selectedRowKeys);
  }, [selectedRowKeys, showMoveFileModal]);
  const disabled = selectedRowKeys.length === 0;
  const [form] = Form.useForm();
  const [name, setName] = useState('');
  const [knowledgeName, setKnowledgeName] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };
  const handleKnowledgeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKnowledgeName(e.target.value);
  };
  const handleDateChange: RangePickerProps['onChange'] = (
    dates,
    dateStrings
  ) => {
    if (dateStrings[0] && dateStrings[1]) {
      setDateRange([dateStrings[0], dateStrings[1]]);
    } else {
      setDateRange(null);
    }
  };
  const handleSearch = () => {
    const values = form.getFieldsValue();
    console.log('搜索条件：', values);
    onSearch({
      name: values.name || '',
      knowledgeName: values.knowledgeName || '',
      dateRange: values.dateRange
        ? [values.dateRange[0].format('YYYY-MM-DD'), values.dateRange[1].format('YYYY-MM-DD')]
        : null,
    });
  };
  const handleReset = () => {
    form.resetFields();
    setName('');
    setKnowledgeName('');
    setDateRange(null);
    onReset();
  };

  return (
    <div className={styles.filter}>


        <div className='mb-5 flex items-center gap-3' style={{ width: 300 }}>
          <Dropdown menu={{ items: actionItems }} trigger={['click']}>
            <Button type="primary" icon={<PlusOutlined />}>
              新增文件
            </Button>
          </Dropdown>

          <Button type="primary" disabled={disabled} onClick={handleShowMoveFileModal}
          // icon={<FolderInput className="size-4" />}
          >批量移动</Button>

          <Button type="primary" danger disabled={disabled} onClick={handleRemoveFile} style={{ flex: 'end' }}
          // icon={<Trash2 className="size-4" />}
          >批量删除</Button>
        </div>
      <Flex justify="space-between" align="center" style={{ width: '100%' }}>
        <Form
          form={form}
          layout="inline"
          className="flex-wrap"
          labelCol={{ style: { width: 80, textAlign: 'left' } }}
        >
          <Space size="middle" align="center" wrap style={{ columnGap: '0' }}>
            <Form.Item name="name" label="文件名" >
              <Input
                placeholder="请输入文件名"
                style={{ width: 190 }}
                allowClear
                value={name}
                onChange={handleNameChange}

              />
            </Form.Item>
            {/* <Form.Item name="knowledgeName" label="知识库名称">
              <Input
                placeholder="请输入知识库名称"
                style={{ width: 190 }}
                allowClear
                value={knowledgeName}
                onChange={handleKnowledgeNameChange}
              />
            </Form.Item>
            <Form.Item name="dateRange" label="上传日期">
              <DatePicker.RangePicker
                style={{ width: 190 }}
                value={dateRange ? [dateRange[0] ? dayjs(dateRange[0]) : null, dateRange[1] ? dayjs(dateRange[1]) : null] : undefined}
                onChange={handleDateChange}
                format="YYYY-MM-DD"
                allowClear
              />
            </Form.Item> */}
          </Space>


        </Form>
        <div style={{ width: 160, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}  >
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} style={{ padding: '0 10px', marginRight: 8 }}>查询</Button>
            <Button style={{ padding: '0 10px' }} icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>

          </Space>
        </div>
      </Flex>


     
      <Breadcrumb style={{ marginTop: '20px ' }} items={breadcrumbItems} itemRender={itemRender} />
    </div>
  );
};

export default FileToolbar;
