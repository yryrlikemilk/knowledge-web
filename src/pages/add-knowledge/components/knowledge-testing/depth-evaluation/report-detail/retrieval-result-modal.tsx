import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Modal, Card, Collapse, Empty, Flex, Image, Space, Spin, Button, Table, Tooltip, Pagination } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { ReactComponent as SelectedFilesCollapseIcon } from '@/assets/svg/selected-files-collapse.svg';
import { useTranslate } from '@/hooks/common-hooks';
import { ITestingChunk, ITestingDocument } from '@/interfaces/database/knowledge';
import { showImage } from '@/utils/chat';
import { fetchVideoChunks } from '@/services/knowledge-service';
import { api_rag_host } from '@/utils/api';
import { formatTimeDisplay } from '@/utils/document-util';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import DOMPurify from 'dompurify';
import NewDocumentLink from '@/components/new-document-link';
import camelCase from 'lodash/camelCase';
import styles from './retrieval-result-modal.less';
import request from '@/utils/request';

interface RetrievalResultModalProps {
  visible: boolean;
  onCancel: () => void;
  itemQuestion:any
}

const similarityList: Array<{ field: keyof ITestingChunk; label: string }> = [
  { field: 'similarity', label: 'Hybrid Similarity' },
  { field: 'term_similarity', label: 'Term Similarity' },
  { field: 'vector_similarity', label: 'Vector Similarity' },
];

const ChunkTitle = ({ item }: { item: ITestingChunk }) => {
  const { t } = useTranslate('knowledgeDetails');
  return (
    <Flex gap={10}>
      {similarityList.map((x) => (
        typeof item[x.field] === 'number' ? (
          <Space key={x.field}>
            <span style={{ color: '#306EFD', fontSize: 20 }} className={styles.similarityCircle}>
             { x.field === 'similarity' ? (item[x.field] as number).toFixed(2) : ((item[x.field] as number) * 100).toFixed(2)}
            </span>
            <span className={styles.similarityText}>{t(camelCase(x.field))}</span>
          </Space>
        ) : null
      ))}
    </Flex>
  );
};

const SelectFiles = ({ documents, selectedDocumentIds = [], setSelectedDocumentIds, onTesting }: {
  documents?: ITestingDocument[];
  selectedDocumentIds?: string[];
  setSelectedDocumentIds: (ids: string[]) => void;
  onTesting: (ids: string[]) => void;
}) => {

    const { t } = useTranslate('fileManager');
  const columns: any[] = [
    {
      title: 'Name',
      dataIndex: 'doc_name',
      key: 'doc_name',
      render: (text: string) => <p>{text}</p>,
    },
    {
      title: 'Hits',
      dataIndex: 'count',
      key: 'chunk_count',
      width: 80,
    },
    {
      title: 'View',
      key: 'view',
      width: 50,
      render: (_: any, { doc_id, doc_name }: { doc_id: string; doc_name: string }) => (
        <NewDocumentLink
          documentName={doc_name}
          documentId={doc_id}
          prefix="document"
        >
          <Tooltip title={t('preview')}>
            <Button type="text">
              <EyeOutlined size={20} />
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
      onTesting(ids);
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

const RetrievalResultModal: React.FC<RetrievalResultModalProps> = ({
  visible,
  onCancel,
  itemQuestion
}) => {
  const { t } = useTranslate('knowledgeDetails');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [videoChunkInfo, setVideoChunkInfo] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentVideoInfo, setCurrentVideoInfo] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [retrievalData, setRetrievalData] = useState<any>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // fetchRetrieval：根据 question_id、page、page_size 和可选 doc_id 拉取检索结果
  const fetchRetrieval = useCallback(
    async (opts?: { page?: number; page_size?: number; doc_id?: string }) => {
      const p = opts?.page ?? page;
      const ps = opts?.page_size ?? pageSize;
      const docId = opts?.doc_id;
      if (!visible || !itemQuestion?.id) return;
      setLoading(true);
      try {
        const body: any = { question_id: itemQuestion.id, page: p, page_size: ps };
        // 仅当传入单个 doc id 时带上 doc_id
        if (typeof docId === 'string' && docId.trim() !== '') {
          body.doc_id = docId;
        }
        const resp = await request.post('/api/retrievalTask/retrievalResult', { data: body });
        setRetrievalData(resp?.data || null);
      } catch (e) {
        console.error('获取检索结果失败', e);
        setRetrievalData(null);
      } finally {
        setLoading(false);
      }
    },
    [itemQuestion?.id, page, pageSize, visible],
  );

  // 初始加载与依赖变化时触发（page / pageSize / visible / itemQuestion / selectedDocumentIds）
  useEffect(() => {
    // 只有在弹窗可见且有 question id 时才请求
    if (!visible || !itemQuestion?.id) return;
    const docIdToSend = selectedDocumentIds.length === 1 ? selectedDocumentIds[0] : undefined;
    fetchRetrieval({ page, page_size: pageSize, doc_id: docIdToSend });
  }, [visible, itemQuestion?.id, page, pageSize, selectedDocumentIds, fetchRetrieval]);

  // 关闭时重置分页和数据
  useEffect(() => {
    if (!visible) {
      setPage(1);
      setPageSize(10);
      setRetrievalData(null);
      setLoading(false);
    }
  }, [visible]);

  // 从API数据中提取chunks和documents
  const chunks = useMemo(() => {
    console.log(`retrievalData.data`,retrievalData?.data)
    if (!retrievalData?.data?.records) return [];
    return retrievalData?.data?.records?.records.map((chunk: any): ITestingChunk => ({
      id: chunk.id || chunk.chunk_id,
      chunk_id: chunk.chunk_id,
      content_ltks: chunk.chunk_text || chunk.content,
      content_with_weight: chunk.content_with_weight || chunk.content,
      doc_id: chunk.doc_id,
      doc_name: chunk.doc_name || chunk.title,
      title: chunk.title,   
      img_id: chunk.img_id || '',
      image_id: chunk.image_id || chunk.img_id || '',
      important_kwd: chunk.important_kwd || [],
      kb_id: chunk.kb_id || '',
      similarity: chunk.score || 0,
      term_similarity: chunk.term_similarity || 0,
      vector: chunk.vector || [],
      vector_similarity: chunk.vector_similarity || 0,
      highlight: chunk.highlight || '',
      positions: chunk.positions || [],
      docnm_kwd: chunk.docnm_kwd || '',
      doc_type_kwd: chunk.doc_type_kwd || chunk.doc_type || 'text'
    }));
  }, [retrievalData]);
  const documents = useMemo(() => {
    if (!retrievalData?.data?.doc_aggs) return [];
    return (retrievalData?.data?.doc_aggs || []).map((doc: any): ITestingDocument => ({
      count: doc.chunk_count || 0,
      doc_id: doc.doc_id,
      doc_name: doc.doc_name || doc.title
    }));
  }, [retrievalData]);

  // const total = retrievalData?.total || 0;

  // 时间字符串转秒
  const timeStrToSeconds = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    
    if (parts.length === 4) {
      const [hours, minutes, seconds, milliseconds] = parts;
      return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
    }
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    }
    return 0;
  };

  // 获取视频分块信息
  useEffect(() => {
    if (visible && chunks && chunks.length > 0) {
      const chunkIds = chunks.map((x: ITestingChunk) => x.chunk_id).filter(Boolean);
      if (chunkIds.length > 0) {
        (async () => {
          try {
            const { data } = await fetchVideoChunks(chunkIds as string[]);
            setVideoChunkInfo(data.data);
            console.log('fetchVideoChunks 返回:', data);
          } catch (e: any) {
            console.warn('获取视频分块信息失败', e);
          }
        })();
      } else {
        setVideoChunkInfo([]);
      }
    }
  }, [visible, chunks]);

  // 下载视频文件
  useEffect(() => {
    if (modalVisible && currentVideoInfo && !videoBlob && !isDownloading) {
      const downloadVideo = async () => {
        try {
          setIsDownloading(true);
          setLoadingProgress(0);

          const response = await fetch(currentVideoInfo.videoUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('无法获取响应流');
          }

          const contentLength = response.headers.get('content-length');
          const total = contentLength ? parseInt(contentLength, 10) : 0;
          let receivedLength = 0;
          const chunks: Uint8Array[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedLength += value.length;

            if (total > 0) {
              const progress = (receivedLength / total) * 100;
              setLoadingProgress(progress);
            }
          }

          const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
          setVideoBlob(blob);
          setIsDownloading(false);
          setLoadingProgress(100);
          setIsVideoReady(true);
        } catch (error) {
          console.error('视频下载失败:', error);
          setIsDownloading(false);
          setLoadingProgress(0);
        }
      };

      downloadVideo();
    }
  }, [modalVisible, currentVideoInfo, videoBlob, isDownloading]);

  // 初始化 Video.js 播放器
  useEffect(() => {
    if (!modalVisible || !currentVideoInfo || !videoBlob) {
      return;
    }

    const initPlayer = () => {
      if (!videoRef.current) {
        requestAnimationFrame(initPlayer);
        return;
      }

      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      let player: any;
      try {
        player = videojs(videoRef.current, {
          controls: true,
          fluid: false,
          responsive: false,
          preload: 'auto',
          playbackRates: [0.5, 1, 1.25, 1.5, 2],
          controlBar: {
            children: [
              'playToggle',
              'volumePanel',
              'currentTimeDisplay',
              'timeDivider',
              'durationDisplay',
              'progressControl',
              'remainingTimeDisplay',
              'playbackRateMenuButton',
              'fullscreenToggle'
            ]
          },
          sources: [{
            src: URL.createObjectURL(videoBlob),
            type: 'video/mp4'
          }]
        });
      } catch (error) {
        console.error('Video.js 播放器创建失败:', error);
        return;
      }

      playerRef.current = player;

      const start = timeStrToSeconds(currentVideoInfo.start_time);
      const end = timeStrToSeconds(currentVideoInfo.end_time);

      player.ready(() => {
        setIsVideoLoading(false);

        player.on('loadedmetadata', () => {
          player.currentTime(start);
        });

        player.on('loadeddata', () => {
          player.currentTime(start);
        });

        player.on('canplay', () => {
          setIsVideoLoading(false);
          setIsVideoReady(true);
        });

        player.on('canplaythrough', () => {
          setIsVideoLoading(false);
          setIsVideoReady(true);
        });

        player.on('timeupdate', () => {
          if (player && typeof player.currentTime === 'function' && player.currentTime() >= end) {
            setTimeout(() => {
              try {
                if (player && typeof player.pause === 'function') {
                  player.pause();
                }
                if (player && typeof player.currentTime === 'function') {
                  player.currentTime(start);
                }
                setIsPlaying(false);
              } catch (error) {
                console.error('时间更新处理错误:', error);
              }
            }, 100);
          }
        });

        player.on('play', () => {
          setTimeout(() => {
            setIsPlaying(true);
          }, 50);
        });

        player.on('pause', () => {
          setTimeout(() => {
            setIsPlaying(false);
          }, 50);
        });

        player.on('ended', () => {
          setTimeout(() => {
            setIsPlaying(false);
          }, 50);
        });

        player.on('progress', () => {
          setIsVideoLoading(false);
          setIsVideoReady(true);
        });
      });

      return () => {
        try {
          if (playerRef.current) {
            playerRef.current.off();
            playerRef.current.dispose();
            playerRef.current = null;
          }
        } catch (error) {
          console.error('播放器清理错误:', error);
        }
      };
    };

    requestAnimationFrame(initPlayer);

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [modalVisible, currentVideoInfo, videoBlob]);

  // 弹窗关闭时重置视频状态
  useEffect(() => {
    if (modalVisible) {
      setIsPlaying(false);
      setIsVideoLoading(false);
      setIsVideoReady(false);
      setLoadingProgress(0);
      setVideoBlob(null);
      setIsDownloading(false);
    } else {
      setIsPlaying(false);
      setIsVideoLoading(false);
      setIsVideoReady(false);
      setLoadingProgress(0);
      setVideoBlob(null);
      setIsDownloading(false);
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    }
    setSelectedDocumentIds([]);
  }, [modalVisible, currentVideoInfo]);

  const handlePlaySection = () => {
    if (playerRef.current && currentVideoInfo && videoBlob && isVideoReady) {
      const startSec = timeStrToSeconds(currentVideoInfo.start_time);
      // const endSec = timeStrToSeconds(currentVideoInfo.end_time);

      if (playerRef.current.readyState() >= 1) {
        playerRef.current.currentTime(startSec);
        setTimeout(() => {
          playerRef.current.play().then(() => {
            console.log('Video.js 开始播放');
          }).catch((e: any) => {
            console.error('Video.js 播放失败:', e);
            setIsPlaying(false);
          });
        }, 200);
      } else {
        playerRef.current.one('loadedmetadata', () => {
          playerRef.current.currentTime(startSec);
          playerRef.current.one('loadeddata', () => {
            playerRef.current.currentTime(startSec);
            setTimeout(() => {
              playerRef.current.play().then(() => {
                console.log('Video.js 开始播放');
              }).catch((e: any) => {
                console.error('Video.js 播放失败:', e);
                setIsPlaying(false);
              });
            }, 200);
          });
        });
      }
    }
  };

  // 渲染内容中的图片
  function renderContentWithImages(content: string) {
    if (!content) return null;
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    const regex = /\[IMG::([a-zA-Z0-9]+)\]/g;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{content.slice(lastIndex, match.index)}</span>);
      }
      const imgId = match[1];
      parts.push(
        <React.Fragment key={key++}>
          <Image
            key={key++}
            src={`${api_rag_host}/file/download/${imgId}`}
            alt='图片'
            style={{ maxWidth: 120, maxHeight: 120, margin: '0 4px', verticalAlign: 'middle' }}
            preview={true}
          />
          <br key={key++} />
        </React.Fragment>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
    }
    return parts;
  }

  function renderHighlightedContentWithImages(content: string) {
    if (!content) return null;
    const cleaned = content.replace(/\[\{chunk_id:[^}]+\}\]/g, '');
    const parts: Array<JSX.Element> = [];
    let lastIndex = 0;
    const regex = /\[IMG::([a-zA-Z0-9]+)\]/g;
    let match: RegExpExecArray | null;
    let key = 0;
    console.log(`cleaned,regex`,cleaned,regex)
    while ((match = regex.exec(cleaned)) !== null) {
      if (match.index > lastIndex) {
        const textHtml = cleaned.slice(lastIndex, match.index);
        parts.push(
          <span
            key={`t-${key++}`}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(textHtml) }}
          />
        );
      }
      const imgId = match[1];
      parts.push(
        <React.Fragment key={`fragment-${key++}`}>
          <br key={`br-${key++}`} />
          <Image
            key={`i-${key++}`}
            src={`${api_rag_host}/file/download/${imgId}`}
            alt='图片'
            style={{ maxWidth: 120, maxHeight: 120, margin: '0 4px', verticalAlign: 'middle' }}
            preview={true}
          />
          <br key={`br-${key++}`} />
        </React.Fragment>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < cleaned.length) {
      const textHtml = cleaned.slice(lastIndex);
      parts.push(
        <span
          key={`t-${key++}`}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(textHtml) }}
        />
      );
    }
    return parts;
  }

  const onTesting = (ids: string[]) => {
    setSelectedDocumentIds(ids);
    setPage(1);
    const docIdToSend = ids.length === 1 ? ids[0] : undefined;
    fetchRetrieval({ page: 1, page_size: pageSize, doc_id: docIdToSend });
   };

  return (
    <>
      <Modal
        title="测试详情"
        open={visible}
        onCancel={onCancel}
        width="90%"
        footer={null}
        destroyOnHidden
        styles={{
          header: {
            textAlign: 'center'
          }
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : (
          <div className={styles.testingResultWrapper}>
            <div style={{ display: 'flex', gap: '20px', height: '70vh',paddingTop:20 }}>
          <div style={{
            width: '250px',
            borderRight: '1px solid #e8e8e8',
            paddingRight: '16px',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            <h3 style={{
              margin: '0 0 16px 0', fontSize: '16px', fontWeight: 'bold',
              position: 'sticky', top: 0, backgroundColor: "#fff", overflow: 'hidden', zIndex: 99
            }}>
              测试问题 
            </h3>
              <div
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor:  '#e6f7ff',
                  border:  '1px solid #1890ff',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  fontSize: '14px',
                  fontWeight: 'bold' ,
                  marginBottom: '4px',
                  color: '#1890ff' 
                }}>
                 {itemQuestion?.question_text } 
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>结果数: {itemQuestion?.retrieval_count}</span>
                  <span>文档数: {itemQuestion?.doc_count}</span>
                </div>
              </div>
          </div>
              {/* 右边：结果显示 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', position: 'relative', height: '100%' }}>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <h3 style={{
                    margin: '0 0 16px 0', fontSize: '16px',
                    fontWeight: 'bold', position: 'sticky', top: 0, backgroundColor: "#fff", overflow: 'hidden', zIndex: 99
                  }}>
                    检索结果
                  </h3>
                  <Collapse
                    expandIcon={() => (
                      <SelectedFilesCollapseIcon></SelectedFilesCollapseIcon>
                    )}
                    className={styles.selectFilesCollapse}
                    items={[
                      {
                        key: '1',
                        label: (
                          <Flex
                            justify={'space-between'}
                            align="center"
                            className={styles.selectFilesTitle}
                          >
                            <Space>
                              <span>
                                {selectedDocumentIds?.length ?? 0}/
                                {documents?.length || 0}
                              </span>
                              {t('filesSelected')}
                            </Space>
                          </Flex>
                        ),
                        children: (
                          <div key={documents.id}>
                            <SelectFiles
                              setSelectedDocumentIds={setSelectedDocumentIds}
                              onTesting={onTesting}
                              documents={documents}
                              selectedDocumentIds={selectedDocumentIds}
                            />
                          </div>
                        ),
                      },
                    ]}
                  />
                  <div className={styles.resultContent}>
                    <Flex
                      gap={'large'}
                      vertical
                      flex={1}
                    >
                      {/* 结果显示 */}
                      {chunks?.length > 0 ? (
                        chunks?.map((x: ITestingChunk) => {
                          const videoInfo = Array.isArray(videoChunkInfo) ? videoChunkInfo.find((v) => v.id === x.chunk_id) : null;
                          return (
                            <Card key={String(x.chunk_id)} title={<ChunkTitle item={x} />}>
                              <div className="flex justify-center flex-col">
                                {showImage(x.doc_type_kwd) && (
                                  <Image
                                    id={x.image_id}
                                    className={'object-contain max-h-[30vh] w-full text-center'}
                                    src={`/api/file/downloadImage?imageId=${x.image_id}`}
                                  />
                                )}
                              </div>
                              <div className="pt-4" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexDirection: 'column' }}>
                                <div style={{ flex: 1 }}>
                                  {x.content_ltks && (
                                    <div className={styles.highlightContent}>
                                      {renderHighlightedContentWithImages(x.content_ltks)}
                                    </div>
                                  )}
                                </div>
                                {videoInfo && videoInfo.doc_id && (
                                  <div
                                    style={{
                                      position: 'relative',
                                      cursor: 'pointer',
                                      width: 200,
                                      height: 100,
                                      borderRadius: 8,
                                      overflow: 'hidden'
                                    }}
                                    onClick={() => {
                                      setCurrentVideoInfo({
                                        ...videoInfo,
                                        videoUrl: `/api/file/download/${videoInfo.doc_id}`,
                                        content_ltks: x.content_ltks,
                                        document_name: x.title
                                      });
                                      setModalVisible(true);
                                    }}
                                  >
                                    <img
                                      src={`/api/file/download/${videoInfo.cover_id}`}
                                      alt="视频封面"
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        borderRadius: 8
                                      }}
                                    />
                                    <div style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#fff',
                                      fontSize: 24,
                                      background: 'rgba(0,0,0,0.3)',
                                      borderRadius: 8
                                    }}>
                                      ▶
                                    </div>
                                  </div>
                                )}
                              </div>
                            </Card>
                          );
                        })
                      ) : (
                        <Empty description="暂无相关结果" />
                      )}
                    </Flex>
                    <div className={styles.paginationWrapper}>
                      <Pagination
                        size="small"
                        current={page}
                        pageSize={pageSize}
                        total={retrievalData?.data?.total || 0}
                        showSizeChanger
                        showQuickJumper
                        onChange={(p, ps) => {
                          setPage(p);
                          setPageSize(ps || 10);
                        }}
                        onShowSizeChange={(cur, ps) => {
                          setPage(1);
                          setPageSize(ps);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 视频弹窗 */}
      <Modal
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          if (playerRef.current) {
            playerRef.current.dispose();
            playerRef.current = null;
          }
        }}
        footer={null}
        width={600}
        title={`查看文件:${currentVideoInfo?.document_name}`}
        destroyOnHidden
      >
        {currentVideoInfo && (
          <div style={{ textAlign: 'center', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{
              borderRadius: 8,
              overflow: 'hidden',
              backgroundColor: '#000',
              height: '400px',
              width: '100%',
              position: 'relative',
              marginBottom: '16px'
            }}>
              {(!videoBlob || isDownloading || !isVideoReady || isVideoLoading) ? (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  zIndex: 10, color: '#fff', fontSize: 16, flexDirection: 'column'
                }}>
                  <img
                    src={currentVideoInfo.cover_id ? `/api/file/download/${currentVideoInfo.cover_id}` : ''}
                    alt="视频封面"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 8
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 'bold',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    zIndex: 11
                  }}>
                    {isDownloading ? `视频下载中... ${loadingProgress.toFixed(0)}%` : '视频加载中...'}
                  </div>
                </div>
              ) : null}
              <video
                ref={videoRef}
                className="video-js vjs-default-skin vjs-big-play-centered"
                data-setup="{}"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#000'
                }}
              />
            </div>
            <div style={{ marginTop: 16, fontSize: 16, textAlign: 'left' }}>
              {currentVideoInfo.content_ltks
                ? renderContentWithImages(currentVideoInfo.content_ltks.replace(/\[\{chunk_id:[^}]+\}\]/g, ''))
                : ''}
            </div>
            <div style={{ marginTop: 10, fontSize: 16, color: '#676767' }}>
              相关片段: {formatTimeDisplay(currentVideoInfo.start_time)} - {formatTimeDisplay(currentVideoInfo.end_time)}
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  fontSize: 16,
                  borderRadius: 4,
                  background: (!videoBlob || isDownloading || !isVideoReady || isVideoLoading) ? '#ccc' : '#306EFD',
                  color: '#fff',
                  border: 'none',
                  cursor: (isPlaying || isVideoLoading || !isVideoReady || isDownloading || !videoBlob) ? 'not-allowed' : 'pointer'
                }}
                onClick={handlePlaySection}
                disabled={isPlaying || isVideoLoading || !isVideoReady || isDownloading || !videoBlob}
              >
                {isDownloading ? '正在下载视频...' : isVideoLoading ? '视频加载中...' : !videoBlob ? '等待视频下载...' : !isVideoReady ? '等待视频准备...' : isPlaying ? '播放中...' : '播放相关片段'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default RetrievalResultModal;
