import ChunkMethodModal from '@/components/chunk-method-modal';
import SvgIcon from '@/components/svg-icon';
import {
  useFetchNextDocumentList,
  useSetNextDocumentStatus,
  // usePollingTaskList, // 移除未导出hook
} from '@/hooks/document-hooks';
import { useSetSelectedRecord } from '@/hooks/logic-hooks';
import { useSelectParserList } from '@/hooks/user-setting-hooks';
import { getExtension } from '@/utils/document-util';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Flex,
  MenuProps,
  Space,
  Switch,
  Table,
  Tooltip,
  Typography,
  Progress,
  Modal,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import CreateFileModal from './create-file-modal';
import DocumentToolbar from './document-toolbar';
import {
  useChangeDocumentParser,
  useCreateEmptyDocument,
  useGetRowSelection,
  useHandleUploadDocument,
  useHandleWebCrawl,
  useNavigateToOtherPage,
  useRenameDocument,
  useShowMetaModal,
} from './hooks';
import ParsingActionCell from './parsing-action-cell';
import ParsingStatusCell from './parsing-status-cell';
import RenameModal from './rename-modal';
import WebCrawlModal from './web-crawl-modal';

import FileUploadModal from '@/components/file-upload-modal';
import { RunningStatus } from '@/constants/knowledge';
import { IDocumentInfo } from '@/interfaces/database/document';
import { formatDate } from '@/utils/date';
import { CircleHelp } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import styles from './index.less';
import SetMetaModal from './set-meta-modal';
import Editor from '@monaco-editor/react';
import { useGetKnowledgeSearchParams } from '@/hooks/route-hook';
// import { getTaskList } from '@/services/knowledge-service';
const { Text } = Typography;

const KnowledgeFile = () => {
  const { documents, pagination, handleSearch, handleReset, loading, taskList, isShowProgress, docNames } = useFetchNextDocumentList();
  const [filteredDocuments, setFilteredDocuments] = useState<IDocumentInfo[]>([]);
  const parserList = useSelectParserList();
  const { setDocumentStatus } = useSetNextDocumentStatus();
  const { toChunk } = useNavigateToOtherPage();
  const { currentRecord, setRecord } = useSetSelectedRecord<IDocumentInfo>();
  const {
    renameLoading,
    onRenameOk,
    renameVisible,
    hideRenameModal,
    showRenameModal,
  } = useRenameDocument(currentRecord.id);
  const {
    createLoading,
    onCreateOk,
    createVisible,
    hideCreateModal,
    showCreateModal,
  } = useCreateEmptyDocument();
  const {
    changeParserLoading,
    onChangeParserOk,
    changeParserVisible,
    hideChangeParserModal,
    showChangeParserModal,
  } = useChangeDocumentParser(currentRecord.id);
  const {
    documentUploadVisible,
    hideDocumentUploadModal,
    showDocumentUploadModal,
    onDocumentUploadOk,
    documentUploadLoading,
    uploadFileList,
    setUploadFileList,
    uploadProgress,
    setUploadProgress,
  } = useHandleUploadDocument();
  const {
    webCrawlUploadVisible,
    hideWebCrawlUploadModal,
    showWebCrawlUploadModal,
    onWebCrawlUploadOk,
    webCrawlUploadLoading,
  } = useHandleWebCrawl();
  const { t } = useTranslation('translation', {
    keyPrefix: 'knowledgeDetails',
  });

  const {
    showSetMetaModal,
    hideSetMetaModal,
    setMetaVisible,
    onSetMetaModalOk,
  } = useShowMetaModal(currentRecord.id);

  // 本地loading状态用于SetMetaModal
  const [metaLoading, setMetaLoading] = useState(false);


  // SetMetaModal确定按钮处理
  const handleSetMetaModalOk = async (meta: string) => {
    setMetaLoading(true);
    try {
      await onSetMetaModalOk(meta); // hooks里的接口
    } finally {
      setMetaLoading(false);
    }
  };

  const { knowledgeId } = useGetKnowledgeSearchParams();
  // const { data: taskList } = usePollingTaskList(knowledgeId); // 移除


  const rowSelection = useGetRowSelection();

  const [viewMetaVisible, setViewMetaVisible] = useState(false);
  const [viewMetaData, setViewMetaData] = useState<any>(null);



  const columns: ColumnsType<IDocumentInfo> = [
    {
      title: t('name'),
      dataIndex: 'name',
      key: 'name',
      // fixed: 'left',
      render: (text: any, { kb_id, id, thumbnail, name }) => (
        <div className={styles.toChunks} onClick={() => toChunk(id)}>
          <Flex gap={10} align="center">
            {thumbnail ? (
              <img
                className={styles.img}
                src={
                  '/api/file/downloadImage?imageId=' + kb_id + '-' + thumbnail
                }
                alt=""
              />
            ) : (
              <SvgIcon
                name={`file-icon/${getExtension(name)}`}
                width={24}
              ></SvgIcon>
            )}
            <Text ellipsis={{ tooltip: text }} className={styles.nameText}>
              {text}
            </Text>
          </Flex>
        </div>
      ),
    },
    {
      title: t('chunkNumber'),
      dataIndex: 'chunk_num',
      key: 'chunk_num',
    },

    {
      title: t('chunkMethod'),
      dataIndex: 'parser_id',
      key: 'parser_id',
      render: (text) => {
        return parserList.find((x) => x.value === text)?.label;
      },
    },

    {
      title: (
        <span className="flex items-center gap-2">
          {t('parsingStatus')}
          <Tooltip title={t('parsingStatusTip')}>
            <CircleHelp className="size-3" />
          </Tooltip>
        </span>
      ),
      dataIndex: 'run',
      key: 'run',
      filters: Object.entries(RunningStatus).map(([, value]) => ({
        text: t(`runningStatus${value}`),
        value: value,
      })),
      onFilter: (value, record: IDocumentInfo) => record.run === value,
      render: (text, record) => {
        return <ParsingStatusCell record={record}></ParsingStatusCell>;
      },
    },
    {
      title: '元数据',
      dataIndex: 'meta_fields',
      key: 'meta_fields',
      ellipsis: true,
      render: (meta, record) => {
        const text = typeof record.meta_fields === 'object'
          ? JSON.stringify(record.meta_fields)
          : String(record.meta_fields ?? '');
        return (
          <Tooltip placement="topLeft" title={text}>
            <div
              style={{
                maxWidth: 200, // 可根据实际列宽调整
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              <a
                style={{ cursor: 'pointer' }}
                onClick={e => {
                  e.stopPropagation();

                  setViewMetaData(typeof record.meta_fields === 'string'
                    ? (() => { try { return JSON.parse(record.meta_fields); } catch { return {}; } })()
                    : record.meta_fields);
                  setViewMetaVisible(true);
                }}
              >
                {text}
              </a>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '启用状态',
      key: 'status',
      dataIndex: 'status',
      render: (_, { kb_id,status, id }) => (
        <>
          <Switch
            checked={status === '1'}
            onChange={(e) => {
              setDocumentStatus({kb_id:kb_id, status: e, documentId: id });
            }}
          />
        </>
      ),
    },
    {
      title: t('uploadDate'),
      dataIndex: 'create_time',
      key: 'create_time',
      render(value) {
        return formatDate(value);
      },
    },
    {
      title: t('action'),
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <ParsingActionCell
          setCurrentRecord={setRecord}
          showRenameModal={showRenameModal}
          showChangeParserModal={showChangeParserModal}
          showSetMetaModal={showSetMetaModal}
          record={record}
          knowledgeId={knowledgeId}
        />
      ),
    },
  ];

  const finalColumns = columns.map((x) => ({
    ...x,
    className: `${styles.column}`,
  }));
  const handleFileName = (originalName: string) => {
    const startLen = 4;
    const endLen = 8;

    if (originalName.length > startLen + endLen) {
      const shortName = 
        originalName.slice(0, startLen) + 
        "..." + 
        originalName.slice(-endLen); 
        return shortName;
    } else {
      return originalName;
    }
  }
  const statusEnum: Record<string, string> = {
    'RUNNING': '处理中',
    'FAILED': '失败',
    'PENDING': '待处理',
  }
  const fileItems: MenuProps['items'] = docNames.map((x, index) => ({
    key: index,
    label: (
      <div className={styles.fileItems}>
          <Space style={{color: x.status === 'FAILED' ? 'red' : '#1890ff'}}>
            <svg viewBox="0 0 1024 1024"  version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                <path d="M736.005 696.494H174.18c-17.673 0-32-14.327-32-32V255.582c0-17.673 14.327-32 32-32h157.213c7.96 0 15.635 2.967 21.525 8.321l47.547 43.222h335.54c17.673 0 32 14.327 32 32v357.369c0 17.673-14.327 32-32 32z m-529.825-64h497.825V339.125H388.094a32.002 32.002 0 0 1-21.525-8.321l-47.547-43.222H206.18v344.912z" fill={x.status === 'FAILED' ? 'red' : '#1890ff'}>
                </path>
                <path d="M853.18 821.092H317.509c-17.673 0-32-14.327-32-32s14.327-32 32-32H821.18V414.206c0-17.673 14.327-32 32-32s32 14.327 32 32v374.886c0 17.673-14.327 32-32 32z" fill={x.status === 'FAILED' ? 'red' : '#1890ff'}>
                </path>
              </svg>
              <Tooltip title={x.docName}>
                {handleFileName(x.docName)}
              </Tooltip>
              {statusEnum[x.status]}
            </Space>
            <Progress size="small" showInfo={false} percent={x.status === 'FAILED' ? 100 : x.percent} status={x.status === 'FAILED' ? 'exception' : 'active'} />
        </div>
      ),
    })
  );
  const actionItems: MenuProps['items'] = useMemo(() => {
    return [
      {
        key: '1',
        onClick: showDocumentUploadModal,
        label: (
          <div>
            <Button type="link">
              <Space>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" width="12" height="12" viewBox="0 0 12 12">
                  <defs>
                    <clipPath id="master_svg0_94_12485">
                      <rect x="0" y="0" width="12" height="12" rx="0" />
                    </clipPath>
                  </defs>
                  <g clipPath="url(#master_svg0_94_12485)">
                    <g>
                      <path d="M11.3318203125,8.927996459960937L11.3318203125,1.8674564599609376L11.3314203125,1.8629464599609376Q11.2917203125,1.4259844599609375,10.9773203125,1.1220974599609375Q10.6565303125,0.8119964599609375,10.2238203125,0.8119964599609375L1.7758203125,0.8119964599609375Q1.3383993125,0.8119964599609375,1.0271093125,1.1232854599609374Q0.7158203125,1.4345754599609375,0.7158203125,1.8719964599609376L0.7158203125,8.927996459960937Q0.7158203125,9.365416459960937,1.0271093125,9.676706459960938Q1.3384013125,9.987996459960938,1.7758203125,9.987996459960938L4.9878203125,9.987996459960938L4.9878203125,10.747996459960937L4.3678203125,10.747996459960937Q4.2184003125,10.747996459960937,4.1231103125,10.843296459960937Q4.027820312499999,10.938596459960937,4.027820312499999,11.087996459960937Q4.027820312499999,11.237396459960937,4.1231103125,11.332696459960937Q4.2184003125,11.427996459960937,4.3678203125,11.427996459960937L7.6798203125,11.427996459960937Q7.8292403125,11.427996459960937,7.9245303125,11.332696459960937Q8.0198203125,11.237396459960937,8.0198203125,11.087996459960937Q8.0198203125,10.938596459960937,7.9245303125,10.843296459960937Q7.8292403125,10.747996459960937,7.6798203125,10.747996459960937L7.0598203125,10.747996459960937L7.0598203125,9.987996459960938L10.2718203125,9.987996459960938Q10.7092403125,9.987996459960938,11.0205203125,9.676706459960938Q11.3318203125,9.365416459960937,11.3318203125,8.927996459960937ZM10.4855903125,1.5971024599609374Q10.6038203125,1.7074514599609376,10.6038203125,1.8719964599609376L10.6038203125,7.8679964599609375L1.3958203125000002,7.8679964599609375L1.3958203125000002,1.8719964599609376Q1.3958203125000002,1.7228414599609376,1.5009263124999999,1.6102284599609376Q1.6112753125000001,1.4919964599609377,1.7758203125,1.4919964599609377L10.2238203125,1.4919964599609377Q10.3729703125,1.4919964599609377,10.4855903125,1.5971024599609374ZM7.1854203125,3.7315764599609373L7.1727003125,3.7194964599609377L6.2135003125,2.8082564599609374Q6.1363203125,2.7319964599609374,5.9998203125,2.7319964599609374Q5.9299203125,2.7319964599609374,5.8902103125,2.7399364599609375Q5.7878603125,2.7604064599609375,5.7634603125,2.8309364599609377L4.8507403125,3.7436564599609374Q4.6998203125,3.7698864599609374,4.6998203125,3.9839964599609377Q4.6998203125,4.133416459960937,4.7951103125,4.228706459960938Q4.8904003125,4.323996459960938,5.0398203125,4.323996459960938Q5.1114303125,4.323996459960938,5.2285403125,4.265436459960938L5.2430603125,4.258186459960937L5.6598203125,3.8414164599609375L5.6598203125,6.3359964599609375Q5.6598203125,6.485416459960938,5.7551103125,6.580706459960937Q5.8504003125,6.675996459960937,5.9998203125,6.675996459960937Q6.3398203125,6.675996459960937,6.3398203125,6.3359964599609375L6.3398203125,3.8414164599609375L6.6971103125,4.198706459960937Q6.7744003125,4.275996459960938,6.9118203125,4.275996459960938Q7.0612403125,4.275996459960938,7.1565303125,4.180706459960938Q7.2518203125,4.085416459960937,7.2518203125,3.9359964599609376Q7.2518203125,3.8643864599609374,7.1932603125,3.7472764599609376L7.1854203125,3.7315764599609373ZM10.6038203125,8.547996459960938L10.6038203125,8.927996459960937Q10.6038203125,9.077156459960937,10.4987103125,9.189766459960937Q10.3883603125,9.307996459960938,10.2238203125,9.307996459960938L1.7758203125,9.307996459960938Q1.6266653125000001,9.307996459960938,1.5140523125,9.202896459960938Q1.3958203125000002,9.092546459960937,1.3958203125000002,8.927996459960937L1.3958203125000002,8.547996459960938L10.6038203125,8.547996459960938ZM6.3798203125,9.939996459960938L6.3798203125,10.699996459960937L5.6198203125,10.699996459960937L5.6198203125,9.939996459960938L6.3798203125,9.939996459960938Z" fillRule="evenodd" fill="#306EFD" fillOpacity="1" />
                    </g>
                  </g>
                </svg>
                {t('localFiles')}
              </Space>
            </Button>
          </div>
        ),
      },
      { type: 'divider' },
      {
        key: '3',
        onClick: showCreateModal,
        label: (
          <div>
            <Button type="link">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" width="12" height="12" viewBox="0 0 12 12">
                <defs>
                  <clipPath id="master_svg0_94_12496">
                    <rect x="0" y="0" width="12" height="12" rx="0" />
                  </clipPath>
                </defs>
                <g clipPath="url(#master_svg0_94_12496)">
                  <g>
                    <path d="M10.1248046875,11.3999755859375L2.4748046875,11.3999755859375C2.1021836875,11.3995755859375,1.8002175905,11.0975755859375,1.7998046875,10.7249755859375L1.7998046875,1.2749775859375C1.8002180485,0.9023575859374999,2.1021836875,0.6003912349375,2.4748046875,0.5999779891975L7.9444646875,0.5999779891975C8.1235746875,0.5994987109375,8.2954346875,0.6706945859375,8.4217446875,0.7976965859375L10.6020846875,2.9780355859375C10.7290846875,3.1043455859375,10.8002846875,3.2762055859375,10.7998046875,3.4553255859375L10.7998046875,10.7249755859375C10.7993946875,11.0975755859375,10.4974246875,11.3995755859375,10.1248046875,11.3999755859375ZM2.4748046875,1.1999775859375C2.4333836875,1.1999775859375,2.3998046875,1.2335565859375,2.3998046875,1.2749775859375L2.3998046875,10.7249755859375C2.3998046875,10.7663755859375,2.4333836875,10.7999755859375,2.4748046875,10.7999755859375L10.1248046875,10.7999755859375C10.1662246875,10.7999755859375,10.1998046875,10.7663755859375,10.1998046875,10.7249755859375L10.1998046875,3.5999755859375L8.4748046875,3.5999755859375C8.1021846875,3.5995655859375,7.8002146875,3.2975955859375,7.7998046875,2.9249755859375L7.7998046875,1.1999775859375L2.4748046875,1.1999775859375ZM8.3998046875,1.6241955859375L8.3998046875,2.9249755859375C8.3998046875,2.9663955859375,8.4333846875,2.9999755859375,8.4748046875,2.9999755859375L9.7755846875,2.9999755859375L8.3998046875,1.6241955859375Z" fill="#306EFD" fillOpacity="1" />
                  </g>
                  <g>
                    <path d="M3.9999999523162844,3.674999952316284L7.999999952316284,3.674999952316284C8.179489952316285,3.674999952316284,8.324999952316285,3.820506952316284,8.324999952316285,3.9999999523162844C8.324999952316285,4.179492952316284,8.179489952316285,4.3249999523162845,7.999999952316284,4.3249999523162845L3.9999999523162844,4.3249999523162845C3.820506952316284,4.3249999523162845,3.674999952316284,4.179492952316284,3.674999952316284,3.9999999523162844C3.674999952316284,3.820506952316284,3.820506952316284,3.674999952316284,3.9999999523162844,3.674999952316284Z" fillRule="evenodd" fill="#306EFD" fillOpacity="1" />
                  </g>
                  <g>
                    <path d="M4.02470703125,5.699981689453125L8.02470703125,5.699981689453125C8.20419703125,5.699981689453125,8.34970703125,5.845488689453125,8.34970703125,6.024981689453125C8.34970703125,6.204474689453125,8.20419703125,6.349981689453125,8.02470703125,6.349981689453125L4.02470703125,6.349981689453125C3.84521403125,6.349981689453125,3.69970703125,6.204474689453125,3.69970703125,6.024981689453125C3.69970703125,5.845488689453125,3.84521403125,5.699981689453125,4.02470703125,5.699981689453125Z" fillRule="evenodd" fill="#306EFD" fillOpacity="1" />
                  </g>
                  <g>
                    <path d="M4.0251953125,7.699981689453125L8.0251953125,7.699981689453125C8.2046853125,7.699981689453125,8.3501953125,7.845488689453125,8.3501953125,8.024981689453124C8.3501953125,8.204474689453125,8.2046853125,8.349981689453125,8.0251953125,8.349981689453125L4.0251953125,8.349981689453125C3.8457023125,8.349981689453125,3.7001953125,8.204474689453125,3.7001953125,8.024981689453124C3.7001953125,7.845488689453125,3.8457023125,7.699981689453125,4.0251953125,7.699981689453125Z" fillRule="evenodd" fill="#306EFD" fillOpacity="1" />
                  </g>
                </g>
              </svg>
              {t('emptyFiles')}
            </Button>
          </div>
        ),
      },
    ];
  }, [showDocumentUploadModal, showCreateModal, t]);

  useEffect(() => {
    console.log('接口返回数据：', documents);
    setFilteredDocuments(documents);
  }, [documents]);

  return (
    <div className={styles.datasetWrapper}>
      <div className={styles.topFex}>


        <Dropdown menu={{ items: actionItems }} trigger={['click']}>
          <Button type="primary" icon={<PlusOutlined />}>
            {t('addFile')}
          </Button>
        </Dropdown>
      </div>
      
      { isShowProgress && (
        <div>
        <Dropdown menu={{ items: fileItems }} trigger={['hover']} overlayClassName={styles.fileDropDown}>
          <div className={styles.fileInfo}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" style={{ width: 20, height: 20, marginRight: 8, display:'inline-block' }} viewBox="0 0 20 20">
              <defs>
                <clipPath id="master_svg0_2_7215">
                  <rect x="0" y="0" width="20" height="20" rx="0" style={{ width: 20, height: 20, }} />
                </clipPath>
              </defs>
              <g clipPath="url(#master_svg0_2_7215)">
                <g>
                  <path d="M10,1.25C14.8307,1.25,18.75,5.16387,18.75,10C18.75,14.8361,14.8361,18.75,10,18.75C5.16387,18.75,1.25,14.8361,1.25,10C1.25,5.16387,5.16934,1.25,10,1.25ZM11.09238,13.2826L8.90762,13.2826L8.90762,15.4674L11.09238,15.4674L11.09238,13.2826ZM11.09238,4.53262L8.90762,4.53262L8.90762,11.09238L11.09238,11.09238L11.09238,4.53262Z" fill="#F9CA06" fillOpacity="1" style={{ width: 20, height: 20, }} />
                </g>
              </g>
            </svg>
            <span style={{ marginRight: 8 }}>{taskList.length}个文件正在处理</span>
            <DownOutlined />
          </div>
        </Dropdown>
        </div>
      )}
      <DocumentToolbar
        selectedRowKeys={rowSelection.selectedRowKeys as string[]}
        showWebCrawlModal={showWebCrawlUploadModal}
        showDocumentUploadModal={showDocumentUploadModal}
        documents={documents}
        onSearch={handleSearch as (filters: { name: string; chunkMethod: string; status: string; run: string; key: string; value: string; startDate?: string; endDate?: string }) => void}
        onReset={handleReset}
        parserList={parserList}
        onFilteredDocumentsChange={setFilteredDocuments}
      />
      <div className={styles.testingControlTip}>
        <div>  <svg xmlns="http://www.w3.org/2000/svg" fill="none" version="1.1" style={{ width: 20, height: 20, marginRight: 8, }} viewBox="0 0 20 20">
          <defs>
            <clipPath id="master_svg0_2_7215">
              <rect x="0" y="0" width="20" height="20" rx="0" style={{ width: 20, height: 20, }} />
            </clipPath>
          </defs>
          <g clipPath="url(#master_svg0_2_7215)">
            <g>
              <path d="M10,1.25C14.8307,1.25,18.75,5.16387,18.75,10C18.75,14.8361,14.8361,18.75,10,18.75C5.16387,18.75,1.25,14.8361,1.25,10C1.25,5.16387,5.16934,1.25,10,1.25ZM11.09238,13.2826L8.90762,13.2826L8.90762,15.4674L11.09238,15.4674L11.09238,13.2826ZM11.09238,4.53262L8.90762,4.53262L8.90762,11.09238L11.09238,11.09238L11.09238,4.53262Z" fill="#F9CA06" fillOpacity="1" style={{ width: 20, height: 20, }} />
            </g>
          </g>
        </svg></div>
        <p className={styles.testingDescription}>特别提醒:解析成功后才能问答哦。</p>
      </div>
      <Table
        rowKey="id"
        columns={finalColumns}
        dataSource={filteredDocuments}
        pagination={{
          ...pagination,
          itemRender: (page, type, originalElement) => {
            if (type === 'prev') {
              return <a>上一页</a>;
            }
            if (type === 'next') {
              return <a>下一页</a>;
            }
            return originalElement;
          },
          showTotal: (total) => <span
            style={{
              color: '#86909C',
              lineHeight: '32px', marginRight: 16,
            }}>{`总共${total}条`}</span>,
        }}
        className={styles.documentTable}
        scroll={{ scrollToFirstRowOnChange: true, x: 1300 }}
        loading={loading}
      />
      <CreateFileModal
        visible={createVisible}
        hideModal={hideCreateModal}
        loading={createLoading}
        onOk={onCreateOk}
      />
      <ChunkMethodModal
        documentId={currentRecord.id}
        parserId={currentRecord.parser_id as any}
        parserConfig={currentRecord.parser_config}
        documentExtension={getExtension(currentRecord.name)}
        onOk={onChangeParserOk as any}
        visible={changeParserVisible}
        hideModal={hideChangeParserModal}
        loading={changeParserLoading}
      />
      <RenameModal
        visible={renameVisible}
        onOk={onRenameOk}
        loading={renameLoading}
        hideModal={hideRenameModal}
        initialName={currentRecord.name}
      />
      <FileUploadModal
        visible={documentUploadVisible}
        hideModal={hideDocumentUploadModal}
        loading={documentUploadLoading}
        onOk={onDocumentUploadOk}
        uploadFileList={uploadFileList}
        setUploadFileList={setUploadFileList}
        uploadProgress={uploadProgress}
        setUploadProgress={setUploadProgress}
      />
      <WebCrawlModal
        visible={webCrawlUploadVisible}
        hideModal={hideWebCrawlUploadModal}
        loading={webCrawlUploadLoading}
        onOk={onWebCrawlUploadOk}
      />
      {setMetaVisible && (
        <SetMetaModal
          visible={setMetaVisible}
          hideModal={hideSetMetaModal}
          onOk={handleSetMetaModalOk}
          loading={metaLoading}
          initialMetaData={currentRecord.metaFields}
        />
      )}
      <Modal
        title="查看元数据"
        open={viewMetaVisible}
        onCancel={() => setViewMetaVisible(false)}
        footer={null}
        width={600}
      >
        <Editor
          height={200}
          defaultLanguage="json"
          theme="vs-dark"
          value={viewMetaData ? JSON.stringify(viewMetaData, null, 4) : ''}
          options={{ readOnly: true }}
        />
      </Modal>
    </div>
  );
};

export default KnowledgeFile;
