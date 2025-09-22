import { ReactComponent as FilterIcon } from '@/assets/filter.svg';
import { KnowledgeRouteKey } from '@/constants/knowledge';
import { IChunkListResult, useSelectChunkList } from '@/hooks/chunk-hooks';
import { useTranslate } from '@/hooks/common-hooks';
import { useKnowledgeBaseId } from '@/hooks/knowledge-hooks';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  FilePdfOutlined,
  PlusOutlined,
  SearchOutlined,
  UpOutlined, // 新增：向上图标
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Flex,
  Input,
  Menu,
  MenuProps,
  Popover,
  Radio,
  RadioChangeEvent,
  Segmented,
  SegmentedProps,
  Space,
  Typography,
} from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'umi';
import { ChunkTextMode } from '../../constant';

const { Text } = Typography;

interface IProps
  extends Pick<
    IChunkListResult,
    'searchString' | 'handleInputChange' | 'available' | 'handleSetAvailable'
  > {
  checked: boolean;
  selectAllChunk: (checked: boolean) => void;
  createChunk: () => void;
  removeChunk: () => void;
  switchChunk: (available: number) => void;
  changeChunkTextMode(mode: ChunkTextMode): void;
}

const ChunkToolBar = ({
  selectAllChunk,
  checked,
  createChunk,
  removeChunk,
  switchChunk,
  changeChunkTextMode,
  available,
  handleSetAvailable,
  searchString,
  handleInputChange,
}: IProps) => {
  const data = useSelectChunkList();
  const documentInfo = data?.documentInfo;
  const knowledgeBaseId = useKnowledgeBaseId();
  const [isShowSearchBox, setIsShowSearchBox] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false); // 新增：记录筛选 Popover 展开状态
  const { t } = useTranslate('chunk');

  const handleSelectAllCheck = useCallback(
    (e: any) => {
      selectAllChunk(e.target.checked);
    },
    [selectAllChunk],
  );

  const handleSearchIconClick = () => {
    setIsShowSearchBox(true);
  };

  const handleSearchBlur = () => {
    if (!searchString?.trim()) {
      setIsShowSearchBox(false);
    }
  };

  const handleDelete = useCallback(() => {
    removeChunk();
  }, [removeChunk]);

  const handleEnabledClick = useCallback(() => {
    switchChunk(1);
  }, [switchChunk]);

  const handleDisabledClick = useCallback(() => {
    switchChunk(0);
  }, [switchChunk]);

  const items: MenuProps['items'] = useMemo(() => {
    return [
      {
        key: '1',
        label: (
          <>
            <Checkbox onChange={handleSelectAllCheck} checked={checked}>
              <b>{t('selectAll')}</b>
            </Checkbox>
          </>
        ),
      },
      { type: 'divider' },
      {
        key: '2',
        label: (
          <Space onClick={handleEnabledClick}>
            <CheckCircleOutlined />
            <b>{t('enabledSelected')}</b>
          </Space>
        ),
      },
      {
        key: '3',
        label: (
          <Space onClick={handleDisabledClick}>
            <CloseCircleOutlined />
            <b>{t('disabledSelected')}</b>
          </Space>
        ),
      },
      { type: 'divider' },
      {
        key: '4',
        label: (
          <Space onClick={handleDelete}>
            <DeleteOutlined />
            <b>{t('deleteSelected')}</b>
          </Space>
        ),
      },
    ];
  }, [
    checked,
    handleSelectAllCheck,
    handleDelete,
    handleEnabledClick,
    handleDisabledClick,
    t,
  ]);

  const content = (
    <Menu style={{ width: 200 }} items={items} selectable={false} />
  );

  const handleFilterChange = (e: RadioChangeEvent) => {
    selectAllChunk(false);
    handleSetAvailable(e.target.value);
  };

  const filterContent = (
    <Radio.Group onChange={handleFilterChange} value={available}>
      <Space direction="vertical">
        <Radio value={undefined}>全部</Radio>
        <Radio value={1}>{t('enabled')}</Radio>
        <Radio value={0}>{t('disabled')}</Radio>
      </Space>
    </Radio.Group>
  );

  const getFilterLabel = () => {
    if (available === 1) return t('enabled');
    if (available === 0) return t('disabled');
    return '全部';
  };

  return (
    <Flex justify="space-between" align="center">
      <Space size={'middle'}>
        <Link
          to={`/knowledge/${KnowledgeRouteKey.Dataset}?id=${knowledgeBaseId}`}
        >
          <ArrowLeftOutlined />
        </Link>
        <FilePdfOutlined />
        <Text ellipsis={{ tooltip: documentInfo?.name }} style={{ width: 150 }}>
          {documentInfo?.name}
        </Text>
      </Space>
      <Space>
        
        {/*
        //全文-省略
        <Segmented
          options={[
            { label: t(ChunkTextMode.Full), value: ChunkTextMode.Full },
            { label: t(ChunkTextMode.Ellipse), value: ChunkTextMode.Ellipse },
          ]}
          onChange={changeChunkTextMode as SegmentedProps['onChange']}
        /> */}
        <Popover content={content} placement="bottom" arrow={false}>
          <Button>
            {t('bulk')}
            <DownOutlined />
          </Button>
        </Popover>
        {/* {isShowSearchBox ? ( */}
          <Input
          style={{width:150}}
            size="middle"
            placeholder={t('search')}
            prefix={<SearchOutlined />}
            allowClear
            onChange={handleInputChange}
            onBlur={handleSearchBlur}
            value={searchString}
          />
        {/* ) : (
          <Button icon={<SearchOutlined />} onClick={handleSearchIconClick} />
        )} */}

        <Popover
          content={filterContent}
          placement="bottom"
          arrow={false}
          open={filterOpen}
          onOpenChange={(open) => setFilterOpen(open)}
        >
          <div style={{ marginRight: 6}}>
            <span style={{ marginLeft: 6 }}>{getFilterLabel()}</span>
            {/* 根据 Popover 展开状态切换箭头方向 */}
            {filterOpen ? (
              <UpOutlined style={{ marginLeft: 6 }} />
            ) : (
              <DownOutlined style={{ marginLeft: 6 }} />
            )}
          </div>
        </Popover>
        <Button
          type="primary"
          onClick={() => createChunk()}
        >新增</Button>
      </Space>
    </Flex>
  );
};

export default ChunkToolBar;
